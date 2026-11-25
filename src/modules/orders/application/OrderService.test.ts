import { DomainError } from '../../../shared/DomainError';
import { NotFoundError } from '../../../shared/NotFoundError';
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
} from '../domain/Order';
import { OrderRepository } from '../ports/OrderRepository';
import { OrderService } from './OrderService';

type StoredProduct = { codeProduct: string; name: string; price: number; stock: number; status: boolean };
type StoredParty = { name: string; status: boolean };

class FakeOrderRepository implements OrderRepository {
  orders: Order[] = [];
  products = new Map<number, StoredProduct>([
    [1, { codeProduct: 'PROD-001', name: 'Cuaderno', price: 2.5, stock: 10, status: true }],
    [2, { codeProduct: 'PROD-002', name: 'Lápiz', price: 1.1, stock: 1, status: true }],
    [3, { codeProduct: 'PROD-003', name: 'Borrador', price: 0.5, stock: 4, status: false }],
  ]);
  private customers = new Map<number, StoredParty>([
    [1, { name: 'Ana Cliente', status: true }],
    [2, { name: 'Cliente inactivo', status: false }],
  ]);
  private users = new Map<number, StoredParty>([
    [7, { name: 'Ana Ruiz', status: true }],
    [8, { name: 'Usuario inactivo', status: false }],
  ]);
  private movements: Array<{ orderId: number; movementType: 'SALIDA' | 'DEVOLUCION'; productId: number }> = [];
  private nextOrderId = 1;
  private nextDetailId = 1;
  private nextHistoryId = 1;
  private nextOrderNumber = 1;

  findAll = async (): Promise<Order[]> => [...this.orders];

  findById = async (id: number): Promise<Order | undefined> => this.orders.find((order) => order.id === id);

  save = async (order: NewOrder): Promise<Order> => this.persist(undefined, order);

  update = async (id: number, order: NewOrder): Promise<Order | undefined> => {
    const current = await this.findById(id);

    if (!current) {
      return undefined;
    }

    if (current.status !== 'PENDIENTE') {
      throw new DomainError('Solo se puede editar un pedido pendiente');
    }

    return this.persist(current, order);
  };

  changeStatus = async (id: number, status: OrderStatus): Promise<Order | undefined> => {
    const current = await this.findById(id);

    if (!current) {
      return undefined;
    }

    assertTransition(current.status, status);
    const changes = current.details.map((detail) => {
      const product = this.products.get(detail.productId);

      if (!product) {
        throw new DomainError('El producto indicado no existe');
      }

      if (status === 'CONFIRMADO' && !product.status) {
        throw new DomainError('El producto indicado no está activo');
      }

      if (status === 'CONFIRMADO') {
        return { product, detail, change: applyOutgoingStock(product.stock, detail.quantity) };
      }

      if (status === 'CANCELADO' && stockWasDiscounted(current.status)) {
        return { product, detail, change: applyIncomingStock(product.stock, detail.quantity) };
      }

      return undefined;
    });

    for (const change of changes) {
      if (!change) {
        continue;
      }

      change.product.stock = change.change.stockAfter;
      this.movements.push({
        orderId: current.id,
        productId: change.detail.productId,
        movementType: status === 'CONFIRMADO' ? 'SALIDA' : 'DEVOLUCION',
      });
    }

    current.status = status;
    current.updatedAt = new Date();
    current.statusHistory.push({
      id: this.nextHistoryId++,
      userId: current.userId,
      userName: current.userName,
      fromStatus: current.statusHistory.at(-1)?.toStatus ?? null,
      toStatus: status,
      createdAt: new Date(),
    });
    return current;
  };

  private persist = async (current: Order | undefined, order: NewOrder): Promise<Order> => {
    assertActiveParty(this.customers.get(order.customerId), 'El cliente indicado no existe', 'El cliente indicado no está activo');
    assertActiveParty(this.users.get(order.userId), 'El usuario responsable no existe', 'El usuario responsable no está activo');
    const priced = priceOrder(
      order.details,
      new Map([...this.products.entries()].map(([id, product]) => [id, { price: product.price, status: product.status }])),
    );
    const now = new Date();
    const details = priced.lines.map((line) => {
      const product = this.products.get(line.productId);

      return {
        id: this.nextDetailId++,
        productId: line.productId,
        codeProduct: product?.codeProduct ?? '',
        productName: product?.name ?? '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        subtotal: line.subtotal,
      };
    });

    if (current) {
      current.customerId = order.customerId;
      current.customerName = this.customers.get(order.customerId)?.name ?? '';
      current.userId = order.userId;
      current.userName = this.users.get(order.userId)?.name ?? '';
      current.notes = order.notes;
      current.subtotal = priced.subtotal;
      current.tax = priced.tax;
      current.total = priced.total;
      current.updatedAt = now;
      current.details = details;
      return current;
    }

    const created: Order = {
      id: this.nextOrderId++,
      orderNumber: this.nextOrderNumber++,
      customerId: order.customerId,
      customerName: this.customers.get(order.customerId)?.name ?? '',
      userId: order.userId,
      userName: this.users.get(order.userId)?.name ?? '',
      orderDate: now,
      subtotal: priced.subtotal,
      tax: priced.tax,
      total: priced.total,
      status: 'PENDIENTE',
      notes: order.notes,
      createdAt: now,
      updatedAt: now,
      details,
      statusHistory: [
        {
          id: this.nextHistoryId++,
          userId: order.userId,
          userName: this.users.get(order.userId)?.name ?? '',
          fromStatus: null,
          toStatus: 'PENDIENTE',
          createdAt: now,
        },
      ],
    };
    this.orders.push(created);
    return created;
  };
}

const validInput = {
  customerId: 1,
  userId: 7,
  notes: '  Entregar en la mañana  ',
  details: [
    { productId: 1, quantity: 2 },
    { productId: 2, quantity: 1 },
  ],
};

const createService = (): { service: OrderService; repository: FakeOrderRepository } => {
  const repository = new FakeOrderRepository();
  return { service: new OrderService(repository), repository };
};

describe('OrderService', () => {
  it('registers the header, the catalog prices, the totals and the order number', async () => {
    const { service } = createService();
    const created = await service.create(validInput);

    expect(created).toMatchObject({
      id: 1,
      orderNumber: 1,
      customerId: 1,
      customerName: 'Ana Cliente',
      userId: 7,
      userName: 'Ana Ruiz',
      status: 'PENDIENTE',
      notes: 'Entregar en la mañana',
      subtotal: 6.1,
      tax: 0,
      total: 6.1,
      details: [
        { productId: 1, codeProduct: 'PROD-001', quantity: 2, unitPrice: 2.5, subtotal: 5 },
        { productId: 2, quantity: 1, unitPrice: 1.1, subtotal: 1.1 },
      ],
    });
    expect(created.orderDate).toBeInstanceOf(Date);
    expect(created.statusHistory).toMatchObject([{ fromStatus: null, toStatus: 'PENDIENTE', userName: 'Ana Ruiz' }]);
    expect(await service.list()).toEqual([created]);
    expect(await service.getById(created.id)).toEqual(created);
  });

  it('edits a pending order with the current catalog price and rejects other edits', async () => {
    const { service, repository } = createService();
    const created = await service.create(validInput);
    repository.products.get(1)!.price = 3;
    const updated = await service.update(created.id, {
      customerId: 1,
      userId: 7,
      details: [{ productId: 1, quantity: 4 }],
    });

    expect(updated).toMatchObject({ status: 'PENDIENTE', subtotal: 12, total: 12, details: [{ quantity: 4, unitPrice: 3 }] });
    expect(repository.products.get(1)?.stock).toBe(10);
    await service.changeStatus(created.id, { status: 'CONFIRMADO' });
    await expect(service.update(created.id, validInput)).rejects.toThrow('Solo se puede editar un pedido pendiente');
  });

  it('confirms a pending order, discounts stock and records the exit', async () => {
    const { service, repository } = createService();
    const created = await service.create({
      customerId: 1,
      userId: 7,
      details: [{ productId: 1, quantity: 4 }],
    });
    const confirmed = await service.changeStatus(created.id, { status: 'CONFIRMADO' });

    expect(confirmed.status).toBe('CONFIRMADO');
    expect(confirmed.statusHistory.map((change) => change.toStatus)).toEqual(['PENDIENTE', 'CONFIRMADO']);
    expect(repository.products.get(1)?.stock).toBe(6);
    await expect(service.changeStatus(created.id, { status: 'ENVIADO' })).rejects.toThrow(
      'La transición de estado no está permitida',
    );
  });

  it('rejects a confirmation without enough stock and keeps the order pending', async () => {
    const { service, repository } = createService();
    const created = await service.create({
      customerId: 1,
      userId: 7,
      details: [{ productId: 2, quantity: 2 }],
    });

    await expect(service.changeStatus(created.id, { status: 'CONFIRMADO' })).rejects.toThrow(
      'No hay existencias suficientes para confirmar el pedido',
    );
    expect((await service.getById(created.id)).status).toBe('PENDIENTE');
    expect(repository.products.get(2)?.stock).toBe(1);
  });

  it('cancels a pending order without returning stock and returns stock after confirmation', async () => {
    const { service, repository } = createService();
    const pending = await service.create({
      customerId: 1,
      userId: 7,
      details: [{ productId: 1, quantity: 3 }],
    });
    const cancelled = await service.changeStatus(pending.id, { status: 'CANCELADO' });
    const confirmed = await service.create({
      customerId: 1,
      userId: 7,
      details: [{ productId: 1, quantity: 3 }],
    });
    await service.changeStatus(confirmed.id, { status: 'CONFIRMADO' });
    await service.changeStatus(confirmed.id, { status: 'EN_PREPARACION' });
    const returned = await service.changeStatus(confirmed.id, { status: 'CANCELADO' });

    expect(cancelled.status).toBe('CANCELADO');
    expect(returned.status).toBe('CANCELADO');
    expect(repository.products.get(1)?.stock).toBe(10);
    await expect(service.changeStatus(returned.id, { status: 'CONFIRMADO' })).rejects.toThrow(DomainError);
  });

  it('rejects an inactive customer, an inactive product and a missing order', async () => {
    const { service } = createService();

    await expect(service.create({ ...validInput, customerId: 2 })).rejects.toThrow('El cliente indicado no está activo');
    await expect(service.create({ ...validInput, details: [{ productId: 3, quantity: 1 }] })).rejects.toThrow(
      'El producto indicado no está activo',
    );
    await expect(service.create({ ...validInput, details: [] })).rejects.toThrow('Debe registrar al menos un producto');
    await expect(service.getById(99)).rejects.toThrow(NotFoundError);
  });
});
