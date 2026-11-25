import { DomainError } from '../../../shared/DomainError';

export const MOVEMENT_TYPES = ['INGRESO', 'SALIDA', 'DEVOLUCION'] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

const ADJUSTMENT_TYPES = ['INGRESO', 'SALIDA'] as const;

type AdjustmentMovementType = (typeof ADJUSTMENT_TYPES)[number];

const DESCRIPTION_MAX_LENGTH = 500;
const MAX_STOCK = 2_147_483_647;

export interface InventoryMovement {
  id: number;
  productId: number;
  codeProduct: string;
  productName: string;
  orderId: number | null;
  adjustmentId: number | null;
  userId: number;
  userName: string;
  movementType: MovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  description: string | null;
  createdAt: Date;
}

export interface NewInventoryMovement {
  productId: number;
  orderId: number | null;
  adjustmentId: number | null;
  userId: number;
  movementType: MovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  description: string | null;
}

export interface MovementLineInput {
  productId: number;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
}

export interface AdjustmentMovementSource {
  adjustmentId: number;
  userId: number;
  adjustmentType: AdjustmentMovementType;
  reason: string | null;
  lines: MovementLineInput[];
}

export interface OrderMovementSource {
  orderId: number;
  userId: number;
  lines: MovementLineInput[];
}

export interface RecordedOrderMovement {
  productId: number;
  movementType: MovementType;
  quantity: number;
}

export interface MovementQuery {
  productId?: number;
  from?: Date;
  to?: Date;
  type?: MovementType;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const isStock = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_STOCK;

const expectedStockAfter = (movementType: MovementType, stockBefore: number, quantity: number): number =>
  movementType === 'SALIDA' ? stockBefore - quantity : stockBefore + quantity;

const parseDescription = (reason: string | null): string | null => {
  if (reason === null) {
    return null;
  }

  if (typeof reason !== 'string') {
    throw new DomainError('La descripción del movimiento debe ser texto');
  }

  const description = reason.trim();

  if (description.length > DESCRIPTION_MAX_LENGTH) {
    throw new DomainError('La descripción del movimiento no puede superar 500 caracteres');
  }

  return description || null;
};

const parseLines = (lines: unknown): MovementLineInput[] => {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new DomainError('Debe registrar al menos un producto');
  }

  const productIds = new Set<number>();

  return lines.map((line) => {
    const { productId, quantity, stockBefore, stockAfter } = (line ?? {}) as Record<string, unknown>;

    if (!isPositiveInteger(productId)) {
      throw new DomainError('El producto indicado no es válido');
    }

    if (!isPositiveInteger(quantity)) {
      throw new DomainError('La cantidad movilizada debe ser un entero mayor que cero');
    }

    if (!isStock(stockBefore) || !isStock(stockAfter)) {
      throw new DomainError('El stock anterior y el stock posterior deben ser enteros válidos');
    }

    if (productIds.has(productId)) {
      throw new DomainError('El producto no puede repetirse en el movimiento');
    }

    productIds.add(productId);

    return { productId, quantity, stockBefore, stockAfter };
  });
};

const assertStock = (movementType: MovementType, line: MovementLineInput): void => {
  const stockAfter = expectedStockAfter(movementType, line.stockBefore, line.quantity);

  if (stockAfter < 0) {
    throw new DomainError('El movimiento dejaría el stock en negativo');
  }

  if (stockAfter > MAX_STOCK) {
    throw new DomainError('La cantidad del movimiento excede el stock permitido');
  }

  if (stockAfter !== line.stockAfter) {
    throw new DomainError('El stock posterior no coincide con la cantidad movilizada');
  }
};

const toMovement = (
  movementType: MovementType,
  userId: number,
  orderId: number | null,
  adjustmentId: number | null,
  description: string | null,
  line: MovementLineInput,
): NewInventoryMovement => {
  assertStock(movementType, line);

  return {
    productId: line.productId,
    orderId,
    adjustmentId,
    userId,
    movementType,
    quantity: line.quantity,
    stockBefore: line.stockBefore,
    stockAfter: line.stockAfter,
    description,
  };
};

export const movementsFromAdjustment = (source: AdjustmentMovementSource): NewInventoryMovement[] => {
  if (!isPositiveInteger(source.adjustmentId)) {
    throw new DomainError('El ajuste indicado no es válido');
  }

  if (!isPositiveInteger(source.userId)) {
    throw new DomainError('El usuario responsable no es válido');
  }

  if (!ADJUSTMENT_TYPES.includes(source.adjustmentType)) {
    throw new DomainError('El tipo de ajuste debe ser INGRESO o SALIDA');
  }

  const description = parseDescription(source.reason);

  return parseLines(source.lines).map((line) =>
    toMovement(source.adjustmentType, source.userId, null, source.adjustmentId, description, line),
  );
};

export const movementsFromOrderConfirmation = (source: OrderMovementSource): NewInventoryMovement[] => {
  if (!isPositiveInteger(source.orderId)) {
    throw new DomainError('El pedido indicado no es válido');
  }

  if (!isPositiveInteger(source.userId)) {
    throw new DomainError('El usuario responsable no es válido');
  }

  return parseLines(source.lines).map((line) => toMovement('SALIDA', source.userId, source.orderId, null, null, line));
};

export const movementsFromOrderCancellation = (
  source: OrderMovementSource,
  recorded: RecordedOrderMovement[],
): NewInventoryMovement[] => {
  if (!isPositiveInteger(source.orderId)) {
    throw new DomainError('El pedido indicado no es válido');
  }

  if (!isPositiveInteger(source.userId)) {
    throw new DomainError('El usuario responsable no es válido');
  }

  return parseLines(source.lines).flatMap((line) => {
    const exit = recorded.find((movement) => movement.productId === line.productId && movement.movementType === 'SALIDA');
    const alreadyReturned = recorded.some(
      (movement) => movement.productId === line.productId && movement.movementType === 'DEVOLUCION',
    );

    if (!exit || alreadyReturned) {
      return [];
    }

    if (line.quantity !== exit.quantity) {
      throw new DomainError('La devolución debe corresponder a la salida del pedido');
    }

    return [toMovement('DEVOLUCION', source.userId, source.orderId, null, null, line)];
  });
};

const readOptionalText = (value: unknown, message: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new DomainError(message);
  }

  const text = value.trim();
  return text ? text : undefined;
};

const parseDay = (value: string, bound: 'inicial' | 'final'): Date => {
  const match = DATE_ONLY.exec(value);

  if (!match) {
    throw new DomainError(`La fecha ${bound} no es válida`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new DomainError(`La fecha ${bound} no es válida`);
  }

  if (bound === 'final') {
    date.setHours(23, 59, 59, 999);
  }

  return date;
};

const parseProductId = (value: unknown): number | undefined => {
  const text = readOptionalText(value, 'El producto indicado no es válido');

  if (text === undefined) {
    return undefined;
  }

  if (!/^[1-9]\d*$/.test(text)) {
    throw new DomainError('El producto indicado no es válido');
  }

  return Number(text);
};

const parseType = (value: string | undefined): MovementType | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!MOVEMENT_TYPES.includes(value as MovementType)) {
    throw new DomainError('El tipo de movimiento no es válido');
  }

  return value as MovementType;
};

export const parseMovementQuery = (input: unknown): MovementQuery => {
  const source = (input ?? {}) as Record<string, unknown>;
  const fromText = readOptionalText(source.from, 'La fecha inicial no es válida');
  const toText = readOptionalText(source.to, 'La fecha final no es válida');
  const typeText = readOptionalText(source.type, 'El tipo de movimiento no es válido');
  const from = fromText ? parseDay(fromText, 'inicial') : undefined;
  const to = toText ? parseDay(toText, 'final') : undefined;

  if (from && to && from > to) {
    throw new DomainError('La fecha inicial no puede ser posterior a la fecha final');
  }

  return {
    productId: parseProductId(source.productId),
    from,
    to,
    type: parseType(typeText),
  };
};
