import { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import { DomainError } from '../../../../shared/DomainError';
import {
  applyIncomingStock,
  applyOutgoingStock,
  assertActiveParty,
  assertTransition,
  NewOrder,
  Order,
  OrderStatus,
  priceOrder,
  stockWasDiscounted,
} from '../../domain/Order';
import { OrderRepository } from '../../ports/OrderRepository';
import { saveOrderMovements } from '../../../inventory-movements/adapter/persistence/PrismaInventoryMovementRepository';

type OrderRecord = {
  id: number;
  orderNumber: number;
  customerId: number;
  userId: number;
  orderDate: Date;
  subtotal: { toNumber: () => number };
  tax: { toNumber: () => number };
  total: { toNumber: () => number };
  status: OrderStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: { name: string };
  user: { name: string };
  details: Array<{
    id: number;
    productId: number;
    quantity: number;
    unitPrice: { toNumber: () => number };
    subtotal: { toNumber: () => number };
    product: { codeProduct: string; name: string };
  }>;
  statusHistory: Array<{
    id: number;
    userId: number;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    createdAt: Date;
    user: { name: string };
  }>;
};

const orderInclude = {
  customer: { select: { name: true } },
  user: { select: { name: true } },
  details: {
    orderBy: { id: 'asc' as const },
    include: { product: { select: { codeProduct: true, name: true } } },
  },
  statusHistory: {
    orderBy: { id: 'asc' as const },
    include: { user: { select: { name: true } } },
  },
};

const toOrder = (record: OrderRecord): Order => ({
  id: record.id,
  orderNumber: record.orderNumber,
  customerId: record.customerId,
  customerName: record.customer.name,
  userId: record.userId,
  userName: record.user.name,
  orderDate: record.orderDate,
  subtotal: record.subtotal.toNumber(),
  tax: record.tax.toNumber(),
  total: record.total.toNumber(),
  status: record.status,
  notes: record.notes,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  details: record.details.map((detail) => ({
    id: detail.id,
    productId: detail.productId,
    codeProduct: detail.product.codeProduct,
    productName: detail.product.name,
    quantity: detail.quantity,
    unitPrice: detail.unitPrice.toNumber(),
    subtotal: detail.subtotal.toNumber(),
  })),
  statusHistory: record.statusHistory.map((change) => ({
    id: change.id,
    userId: change.userId,
    userName: change.user.name,
    fromStatus: change.fromStatus,
    toStatus: change.toStatus,
    createdAt: change.createdAt,
  })),
});

const CUSTOMER_NOT_FOUND = 'El cliente indicado no existe';
const CUSTOMER_INACTIVE = 'El cliente indicado no está activo';
const USER_NOT_FOUND = 'El usuario responsable no existe';
const USER_INACTIVE = 'El usuario responsable no está activo';
const PENDING_ONLY = 'Solo se puede editar un pedido pendiente';

const assertParties = async (tx: Prisma.TransactionClient, order: NewOrder): Promise<void> => {
  const customer = await tx.customer.findUnique({
    where: { id: order.customerId },
    select: { status: true },
  });
  const user = await tx.user.findUnique({ where: { id: order.userId }, select: { status: true } });
  assertActiveParty(customer ?? undefined, CUSTOMER_NOT_FOUND, CUSTOMER_INACTIVE);
  assertActiveParty(user ?? undefined, USER_NOT_FOUND, USER_INACTIVE);
};

const loadCatalog = async (tx: Prisma.TransactionClient, order: NewOrder) => {
  const productIds = order.details.map((detail) => detail.productId).sort((left, right) => left - right);
  await tx.$queryRaw`SELECT id FROM products WHERE id IN (${Prisma.join(productIds)}) ORDER BY id FOR UPDATE`;
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true, stock: true, status: true },
  });

  return new Map(
    products.map((product) => [
      product.id,
      { price: product.price.toNumber(), stock: product.stock, status: product.status },
    ]),
  );
};

const detailData = (lines: ReturnType<typeof priceOrder>['lines']) =>
  lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    subtotal: line.subtotal,
  }));

const moveStock = async (
  tx: Prisma.TransactionClient,
  orderId: number,
  userId: number,
  details: Array<{ productId: number; quantity: number }>,
  direction: 'SALIDA' | 'DEVOLUCION',
): Promise<void> => {
  const productIds = details.map((detail) => detail.productId).sort((left, right) => left - right);
  await tx.$queryRaw`SELECT id FROM products WHERE id IN (${Prisma.join(productIds)}) ORDER BY id FOR UPDATE`;
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, stock: true, status: true },
  });
  const stocks = new Map(products.map((product) => [product.id, product]));
  const changes = details.map((detail) => {
    const product = stocks.get(detail.productId);

    if (!product) {
      throw new DomainError('El producto indicado no existe');
    }

    if (direction === 'SALIDA' && !product.status) {
      throw new DomainError('El producto indicado no está activo');
    }

    const change =
      direction === 'SALIDA'
        ? applyOutgoingStock(product.stock, detail.quantity)
        : applyIncomingStock(product.stock, detail.quantity);

    return { productId: detail.productId, quantity: detail.quantity, ...change };
  });

  const movements = await saveOrderMovements(tx, direction, { orderId, userId, lines: changes });

  for (const movement of movements) {
    await tx.product.update({
      where: { id: movement.productId },
      data: { stock: movement.stockAfter, updatedAt: new Date() },
    });
  }
};

const lockOrder = async (tx: Prisma.TransactionClient, id: number): Promise<void> => {
  await tx.$queryRaw`SELECT id FROM orders WHERE id = ${id} FOR UPDATE`;
};

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll = async (): Promise<Order[]> => {
    const records = await this.prisma.order.findMany({
      orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
      include: orderInclude,
    });

    return records.map(toOrder);
  };

  findById = async (id: number): Promise<Order | undefined> => {
    const record = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    return record ? toOrder(record) : undefined;
  };

  save = async (order: NewOrder): Promise<Order> =>
    this.prisma.$transaction(async (tx) => {
      await assertParties(tx, order);
      const priced = priceOrder(order.details, await loadCatalog(tx, order));
      const record = await tx.order.create({
        data: {
          customerId: order.customerId,
          userId: order.userId,
          notes: order.notes,
          subtotal: priced.subtotal,
          tax: priced.tax,
          total: priced.total,
          details: { create: detailData(priced.lines) },
          statusHistory: { create: { userId: order.userId, toStatus: 'PENDIENTE' } },
        },
        include: orderInclude,
      });

      return toOrder(record);
    });

  update = async (id: number, order: NewOrder): Promise<Order | undefined> =>
    this.prisma.$transaction(async (tx) => {
      await lockOrder(tx, id);
      const current = await tx.order.findUnique({ where: { id }, select: { status: true } });

      if (!current) {
        return undefined;
      }

      if (current.status !== 'PENDIENTE') {
        throw new DomainError(PENDING_ONLY);
      }

      await assertParties(tx, order);
      const priced = priceOrder(order.details, await loadCatalog(tx, order));
      const record = await tx.order.update({
        where: { id },
        data: {
          customerId: order.customerId,
          userId: order.userId,
          notes: order.notes,
          subtotal: priced.subtotal,
          tax: priced.tax,
          total: priced.total,
          updatedAt: new Date(),
          details: { deleteMany: {}, create: detailData(priced.lines) },
        },
        include: orderInclude,
      });

      return toOrder(record);
    });

  changeStatus = async (id: number, status: OrderStatus): Promise<Order | undefined> =>
    this.prisma.$transaction(async (tx) => {
      await lockOrder(tx, id);
      const current = await tx.order.findUnique({
        where: { id },
        select: { status: true, userId: true, details: { select: { productId: true, quantity: true } } },
      });

      if (!current) {
        return undefined;
      }

      assertTransition(current.status, status);

      if (status === 'CONFIRMADO') {
        await moveStock(tx, id, current.userId, current.details, 'SALIDA');
      }

      if (status === 'CANCELADO' && stockWasDiscounted(current.status)) {
        await moveStock(tx, id, current.userId, current.details, 'DEVOLUCION');
      }

      await tx.orderStatusHistory.create({
        data: { orderId: id, userId: current.userId, fromStatus: current.status, toStatus: status },
      });
      const record = await tx.order.update({
        where: { id },
        data: { status, updatedAt: new Date() },
        include: orderInclude,
      });

      return toOrder(record);
    });
}
