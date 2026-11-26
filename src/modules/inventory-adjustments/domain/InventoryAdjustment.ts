import { DomainError } from '../../../shared/DomainError';

export const ADJUSTMENT_TYPES = ['INGRESO', 'SALIDA'] as const;

export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

const REASON_MAX_LENGTH = 500;
const MAX_STOCK = 2_147_483_647;

export interface AdjustmentDetail {
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
  details: AdjustmentDetail[];
}

export interface NewAdjustmentDetail {
  productId: number;
  quantity: number;
}

export interface NewInventoryAdjustment {
  userId: number;
  adjustmentType: AdjustmentType;
  reason: string;
  details: NewAdjustmentDetail[];
}

export interface AdjustmentProductStock {
  id: number;
  codeProduct: string;
  name: string;
  stock: number;
}

export interface PreparedAdjustmentDetail {
  productId: number;
  codeProduct: string;
  productName: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
}

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const isAdjustmentType = (value: string): value is AdjustmentType =>
  ADJUSTMENT_TYPES.some((type) => type === value);

const parseDetails = (details: unknown): NewAdjustmentDetail[] => {
  if (!Array.isArray(details) || details.length === 0) {
    throw new DomainError('Debe registrar al menos un producto');
  }

  const productIds = new Set<number>();

  return details.map((detail) => {
    const { productId, quantity } = (detail ?? {}) as Record<string, unknown>;

    if (!isPositiveInteger(productId)) {
      throw new DomainError('El producto indicado no es válido');
    }

    if (!isPositiveInteger(quantity)) {
      throw new DomainError('La cantidad debe ser un entero mayor que cero');
    }

    if (productIds.has(productId)) {
      throw new DomainError('El producto no puede repetirse en el ajuste');
    }

    productIds.add(productId);

    return { productId, quantity };
  });
};

export const parseNewInventoryAdjustment = (input: unknown): NewInventoryAdjustment => {
  const { userId, adjustmentType, reason, details } = (input ?? {}) as Record<string, unknown>;

  if (!isPositiveInteger(userId)) {
    throw new DomainError('El usuario responsable no es válido');
  }

  if (typeof adjustmentType !== 'string' || !isAdjustmentType(adjustmentType)) {
    throw new DomainError('El tipo de ajuste debe ser INGRESO o SALIDA');
  }

  if (typeof reason !== 'string') {
    throw new DomainError('El motivo del ajuste debe ser texto');
  }

  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    throw new DomainError('El motivo del ajuste es obligatorio');
  }

  if (trimmedReason.length > REASON_MAX_LENGTH) {
    throw new DomainError('El motivo del ajuste no puede superar 500 caracteres');
  }

  return {
    userId,
    adjustmentType,
    reason: trimmedReason,
    details: parseDetails(details),
  };
};

export const buildAdjustmentLines = (
  adjustmentType: AdjustmentType,
  products: AdjustmentProductStock[],
  details: NewAdjustmentDetail[],
): PreparedAdjustmentDetail[] => {
  const productsById = new Map(products.map((product) => [product.id, product]));

  return details.map((detail) => {
    const product = productsById.get(detail.productId);

    if (!product) {
      throw new DomainError('Uno o más productos no existen');
    }

    const stockAfter = adjustmentType === 'SALIDA' ? product.stock - detail.quantity : product.stock + detail.quantity;

    if (stockAfter < 0) {
      throw new DomainError('El ajuste dejaría el stock en negativo');
    }

    if (stockAfter > MAX_STOCK) {
      throw new DomainError('La cantidad del ajuste excede el stock permitido');
    }

    return {
      productId: product.id,
      codeProduct: product.codeProduct,
      productName: product.name,
      quantity: detail.quantity,
      stockBefore: product.stock,
      stockAfter,
    };
  });
};

export interface ReversedAdjustmentStock {
  productId: number;
  stockAfter: number;
}

export const reverseAdjustmentStock = (
  adjustmentType: AdjustmentType,
  products: AdjustmentProductStock[],
  details: NewAdjustmentDetail[],
): ReversedAdjustmentStock[] => {
  const productsById = new Map(products.map((product) => [product.id, product]));

  return details.map((detail) => {
    const product = productsById.get(detail.productId);

    if (!product) {
      throw new DomainError('Uno o más productos no existen');
    }

    const stockAfter = adjustmentType === 'INGRESO' ? product.stock - detail.quantity : product.stock + detail.quantity;

    if (stockAfter < 0) {
      throw new DomainError('Eliminar el ajuste dejaría el stock en negativo');
    }

    if (stockAfter > MAX_STOCK) {
      throw new DomainError('Eliminar el ajuste excede el stock permitido');
    }

    return { productId: product.id, stockAfter };
  });
};
