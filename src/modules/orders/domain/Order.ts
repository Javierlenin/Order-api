import { DomainError } from '../../../shared/DomainError';

export const ORDER_STATUSES = [
  'PENDIENTE',
  'CONFIRMADO',
  'EN_PREPARACION',
  'ENVIADO',
  'ENTREGADO',
  'CANCELADO',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const NOTES_MAX_LENGTH = 500;
const MAX_MONEY = 9999999999.99;
const MAX_STOCK = 2_147_483_647;

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDIENTE: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['EN_PREPARACION', 'CANCELADO'],
  EN_PREPARACION: ['ENVIADO', 'CANCELADO'],
  ENVIADO: ['ENTREGADO', 'CANCELADO'],
  ENTREGADO: [],
  CANCELADO: [],
};

const STOCK_DISCOUNTED: readonly OrderStatus[] = ['CONFIRMADO', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO'];

export interface OrderDetail {
  id: number;
  productId: number;
  codeProduct: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderStatusChange {
  id: number;
  userId: number;
  userName: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  createdAt: Date;
}

export interface Order {
  id: number;
  orderNumber: number;
  customerId: number;
  customerName: string;
  userId: number;
  userName: string;
  orderDate: Date;
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  details: OrderDetail[];
  statusHistory: OrderStatusChange[];
}

export interface NewOrderDetail {
  productId: number;
  quantity: number;
}

export interface NewOrder {
  customerId: number;
  userId: number;
  notes: string | null;
  details: NewOrderDetail[];
}

export interface PricedOrderDetail {
  productId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PricedOrder {
  lines: PricedOrderDetail[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface CatalogProduct {
  price: number;
  status: boolean;
}

export interface StockChange {
  stockBefore: number;
  stockAfter: number;
}

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

export const roundMoney = (value: number): number => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;

  if (rounded < 0 || rounded > MAX_MONEY) {
    throw new DomainError('El total del pedido excede el máximo permitido');
  }

  return rounded;
};

export const parseNewOrder = (input: unknown): NewOrder => {
  const { customerId, userId, notes, details } = (input ?? {}) as Record<string, unknown>;

  if (!isPositiveInteger(customerId)) {
    throw new DomainError('El cliente indicado no es válido');
  }

  if (!isPositiveInteger(userId)) {
    throw new DomainError('El usuario responsable no es válido');
  }

  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    throw new DomainError('Las notas del pedido deben ser texto');
  }

  const normalizedNotes = typeof notes === 'string' ? notes.trim() : '';

  if (normalizedNotes.length > NOTES_MAX_LENGTH) {
    throw new DomainError('Las notas del pedido no pueden superar 500 caracteres');
  }

  if (!Array.isArray(details) || details.length === 0) {
    throw new DomainError('Debe registrar al menos un producto');
  }

  const productIds = new Set<number>();
  const parsedDetails = details.map((detail) => {
    const { productId, quantity } = (detail ?? {}) as Record<string, unknown>;

    if (!isPositiveInteger(productId)) {
      throw new DomainError('El producto indicado no es válido');
    }

    if (!isPositiveInteger(quantity)) {
      throw new DomainError('La cantidad del producto debe ser un entero mayor que cero');
    }

    if (productIds.has(productId)) {
      throw new DomainError('El producto no puede repetirse en el pedido');
    }

    productIds.add(productId);
    return { productId, quantity };
  });

  return {
    customerId,
    userId,
    notes: normalizedNotes || null,
    details: parsedDetails,
  };
};

export const parseNextStatus = (input: unknown): OrderStatus => {
  const { status } = (input ?? {}) as Record<string, unknown>;

  if (typeof status !== 'string' || !ORDER_STATUSES.includes(status as OrderStatus)) {
    throw new DomainError('El estado del pedido no es válido');
  }

  return status as OrderStatus;
};

export const assertTransition = (from: OrderStatus, to: OrderStatus): void => {
  if (!TRANSITIONS[from].includes(to)) {
    throw new DomainError('La transición de estado no está permitida');
  }
};

export const stockWasDiscounted = (status: OrderStatus): boolean => STOCK_DISCOUNTED.includes(status);

export const assertActiveParty = (
  party: { status: boolean } | undefined,
  missingMessage: string,
  inactiveMessage: string,
): void => {
  if (!party) {
    throw new DomainError(missingMessage);
  }

  if (!party.status) {
    throw new DomainError(inactiveMessage);
  }
};

export const priceOrder = (details: NewOrderDetail[], catalog: ReadonlyMap<number, CatalogProduct>): PricedOrder => {
  const lines = details.map((detail) => {
    const product = catalog.get(detail.productId);

    if (!product) {
      throw new DomainError('El producto indicado no existe');
    }

    if (!product.status) {
      throw new DomainError('El producto indicado no está activo');
    }

    const unitPrice = roundMoney(product.price);

    return {
      productId: detail.productId,
      quantity: detail.quantity,
      unitPrice,
      subtotal: roundMoney(unitPrice * detail.quantity),
    };
  });
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0));

  return { lines, subtotal, tax: 0, total: subtotal };
};

export const applyOutgoingStock = (stockBefore: number, quantity: number): StockChange => {
  const stockAfter = stockBefore - quantity;

  if (stockAfter < 0) {
    throw new DomainError('No hay existencias suficientes para confirmar el pedido');
  }

  return { stockBefore, stockAfter };
};

export const applyIncomingStock = (stockBefore: number, quantity: number): StockChange => {
  const stockAfter = stockBefore + quantity;

  if (stockAfter > MAX_STOCK) {
    throw new DomainError('La devolución excede el stock permitido');
  }

  return { stockBefore, stockAfter };
};
