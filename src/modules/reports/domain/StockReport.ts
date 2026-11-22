import { DomainError } from '../../../shared/DomainError';

export const STOCK_MOVEMENT_TYPES = ['INGRESO', 'SALIDA', 'DEVOLUCION'] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export interface StockQuery {
  from?: Date;
  to?: Date;
  type?: StockMovementType;
}

export interface ReportProduct {
  id: number;
  codeProduct: string;
  name: string;
}

export interface AdjustmentLine {
  id: number;
  adjustmentId: number;
  productId: number;
  occurredAt: Date;
  type: 'INGRESO' | 'SALIDA';
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  userId: number;
  userName: string;
}

export interface MovementLine {
  id: number;
  adjustmentId: number;
  productId: number;
  occurredAt: Date;
  type: 'SALIDA' | 'DEVOLUCION';
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  userId: number;
  userName: string;
}

export interface StockEvent {
  id: number;
  origin: 'ADJUSTMENT' | 'MOVEMENT';
  productId: number;
  occurredAt: Date;
  type: StockMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  userId: number;
  userName: string;
}

export interface ProductStock {
  id: number;
  codeProduct: string;
  name: string;
  stock: number;
}

export interface StockMovement {
  id: number;
  origin: 'ADJUSTMENT' | 'MOVEMENT';
  occurredAt: Date;
  type: StockMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  userId: number;
  userName: string;
}

export interface ProductStockReport {
  product: ProductStock;
  movements: StockMovement[];
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

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
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new DomainError(`La fecha ${bound} no es válida`);
  }

  if (bound === 'final') {
    date.setUTCHours(23, 59, 59, 999);
  }

  return date;
};

const parseType = (value: string | undefined): StockMovementType | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!STOCK_MOVEMENT_TYPES.includes(value as StockMovementType)) {
    throw new DomainError('El tipo de movimiento no es válido');
  }

  return value as StockMovementType;
};

export const parseStockQuery = (input: unknown): StockQuery => {
  const source = (input ?? {}) as Record<string, unknown>;
  const fromText = readOptionalText(source.from, 'La fecha inicial no es válida');
  const toText = readOptionalText(source.to, 'La fecha final no es válida');
  const typeText = readOptionalText(source.type, 'El tipo de movimiento no es válido');
  const from = fromText ? parseDay(fromText, 'inicial') : undefined;
  const to = toText ? parseDay(toText, 'final') : undefined;

  if (from && to && from > to) {
    throw new DomainError('La fecha inicial no puede ser posterior a la fecha final');
  }

  return { from, to, type: parseType(typeText) };
};

const compareEvents = (left: StockEvent, right: StockEvent): number =>
  left.occurredAt.getTime() - right.occurredAt.getTime() || left.id - right.id;

export const buildStockHistory = (adjustments: AdjustmentLine[], movements: MovementLine[]): StockEvent[] => {
  const covered = new Set(movements.map((movement) => `${movement.adjustmentId}:${movement.productId}`));
  const adjustmentEvents: StockEvent[] = adjustments
    .filter((line) => !covered.has(`${line.adjustmentId}:${line.productId}`))
    .map((line) => ({ ...line, origin: 'ADJUSTMENT' }));
  const movementEvents: StockEvent[] = movements.map((line) => ({ ...line, origin: 'MOVEMENT' }));

  return [...adjustmentEvents, ...movementEvents].sort(compareEvents);
};

export const currentStock = (events: StockEvent[]): number => {
  const latest = [...events].sort(compareEvents).at(-1);
  return latest?.stockAfter ?? 0;
};

export const filterStockEvents = (events: StockEvent[], query: StockQuery): StockEvent[] =>
  events
    .filter((event) => {
      if (query.type && event.type !== query.type) {
        return false;
      }

      if (query.from && event.occurredAt < query.from) {
        return false;
      }

      if (query.to && event.occurredAt > query.to) {
        return false;
      }

      return true;
    })
    .sort(compareEvents);
