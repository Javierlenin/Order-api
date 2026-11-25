import { DomainError } from '../../../shared/DomainError';

export const ADJUSTMENT_TYPES = ['INGRESO', 'SALIDA'] as const;

export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

const REASON_MAX_LENGTH = 500;
const MAX_STOCK = 2_147_483_647;

export interface InventoryAdjustmentDetail {
  id: number;
  productId: number;
  codeProduct: string;
  productName: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
}

export interface InventoryAdjustment {
  id: number;
  userId: number;
  userName: string;
  adjustmentType: AdjustmentType;
  reason: string | null;
  createdAt: Date;
  details: InventoryAdjustmentDetail[];
}

export interface NewInventoryAdjustmentDetail {
  productId: number;
  quantity: number;
}

export interface NewInventoryAdjustment {
  userId: number;
  adjustmentType: AdjustmentType;
  reason: string;
  details: NewInventoryAdjustmentDetail[];
}

export interface StockChange {
  productId: number;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
}

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const parseDetail = (input: unknown): NewInventoryAdjustmentDetail => {
  const { productId, quantity } = (input ?? {}) as Record<string, unknown>;

  if (!isPositiveInteger(productId)) {
    throw new DomainError('El producto indicado no es válido');
  }

  if (!isPositiveInteger(quantity)) {
    throw new DomainError('La cantidad del producto debe ser un entero mayor que cero');
  }

  return { productId, quantity };
};

export const parseNewInventoryAdjustment = (input: unknown): NewInventoryAdjustment => {
  const { userId, adjustmentType, reason, details } = (input ?? {}) as Record<string, unknown>;

  if (!isPositiveInteger(userId)) {
    throw new DomainError('El usuario responsable no es válido');
  }

  if (!ADJUSTMENT_TYPES.includes(adjustmentType as AdjustmentType)) {
    throw new DomainError('El tipo de ajuste debe ser INGRESO o SALIDA');
  }

  if (typeof reason !== 'string' || !reason.trim()) {
    throw new DomainError('El motivo del ajuste es obligatorio');
  }

  const normalizedReason = reason.trim();

  if (normalizedReason.length > REASON_MAX_LENGTH) {
    throw new DomainError('El motivo del ajuste no puede superar 500 caracteres');
  }

  if (!Array.isArray(details) || details.length === 0) {
    throw new DomainError('Debe registrar al menos un producto');
  }

  const parsedDetails = details.map(parseDetail);
  const productIds = new Set<number>();

  for (const detail of parsedDetails) {
    if (productIds.has(detail.productId)) {
      throw new DomainError('El producto no puede repetirse en el ajuste');
    }

    productIds.add(detail.productId);
  }

  return {
    userId,
    adjustmentType: adjustmentType as AdjustmentType,
    reason: normalizedReason,
    details: parsedDetails,
  };
};

export const calculateStockChanges = (
  adjustmentType: AdjustmentType,
  details: NewInventoryAdjustmentDetail[],
  stocks: ReadonlyMap<number, number>,
): StockChange[] =>
  details.map((detail) => {
    const stockBefore = stocks.get(detail.productId);

    if (stockBefore === undefined) {
      throw new DomainError('El producto indicado no existe');
    }

    const stockAfter = adjustmentType === 'INGRESO' ? stockBefore + detail.quantity : stockBefore - detail.quantity;

    if (stockAfter < 0) {
      throw new DomainError('El ajuste dejaría el stock del producto en negativo');
    }

    if (stockAfter > MAX_STOCK) {
      throw new DomainError('La cantidad del ajuste excede el stock permitido');
    }

    return {
      productId: detail.productId,
      quantity: detail.quantity,
      stockBefore,
      stockAfter,
    };
  });
