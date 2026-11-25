import { DomainError } from '../../../shared/DomainError';
import {
  InventoryMovement,
  MovementQuery,
  NewInventoryMovement,
  parseMovementQuery,
} from '../domain/InventoryMovement';
import { InventoryMovementRepository } from '../ports/InventoryMovementRepository';
import { InventoryMovementService } from './InventoryMovementService';

class FakeInventoryMovementRepository implements InventoryMovementRepository {
  movements: InventoryMovement[] = [];
  private nextId = 1;
  private users = new Map<number, string>([[7, 'Ana Ruiz']]);
  private products = new Map<number, { codeProduct: string; name: string }>([
    [1, { codeProduct: 'PROD-001', name: 'Cuaderno' }],
    [2, { codeProduct: 'PROD-002', name: 'Lápiz' }],
  ]);

  saveMany = async (movements: NewInventoryMovement[]): Promise<InventoryMovement[]> => {
    const created = movements.map((movement) => {
      const userName = this.users.get(movement.userId);
      const product = this.products.get(movement.productId);

      if (!userName || !product) {
        throw new DomainError('El usuario, el producto, el pedido o el ajuste indicado no existe');
      }

      return {
        id: this.nextId++,
        ...movement,
        codeProduct: product.codeProduct,
        productName: product.name,
        userName,
        createdAt: new Date('2026-01-15T15:30:00.000Z'),
      };
    });

    this.movements.push(...created);
    return created;
  };

  find = async (query: MovementQuery): Promise<InventoryMovement[]> =>
    this.movements
      .filter((movement) => {
        if (query.productId !== undefined && movement.productId !== query.productId) {
          return false;
        }

        if (query.type && movement.movementType !== query.type) {
          return false;
        }

        if (query.from && movement.createdAt < query.from) {
          return false;
        }

        if (query.to && movement.createdAt > query.to) {
          return false;
        }

        return true;
      })
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id - right.id);

  findByOrder = async (orderId: number): Promise<InventoryMovement[]> =>
    this.movements.filter((movement) => movement.orderId === orderId);

  findByAdjustment = async (adjustmentId: number): Promise<InventoryMovement[]> =>
    this.movements.filter((movement) => movement.adjustmentId === adjustmentId);
}

const createService = (): { service: InventoryMovementService; repository: FakeInventoryMovementRepository } => {
  const repository = new FakeInventoryMovementRepository();
  return { service: new InventoryMovementService(repository), repository };
};

describe('InventoryMovementService', () => {
  it('records an adjustment as movements with product, stock, user and date', async () => {
    const { service, repository } = createService();
    const created = await service.recordAdjustment({
      adjustmentId: 4,
      userId: 7,
      adjustmentType: 'INGRESO',
      reason: '  Inventario inicial  ',
      lines: [
        { productId: 1, quantity: 5, stockBefore: 10, stockAfter: 15 },
        { productId: 2, quantity: 2, stockBefore: 4, stockAfter: 6 },
      ],
    });

    expect(created).toMatchObject([
      {
        productId: 1,
        codeProduct: 'PROD-001',
        orderId: null,
        adjustmentId: 4,
        userId: 7,
        userName: 'Ana Ruiz',
        movementType: 'INGRESO',
        quantity: 5,
        stockBefore: 10,
        stockAfter: 15,
        description: 'Inventario inicial',
      },
      { productId: 2, movementType: 'INGRESO', stockBefore: 4, stockAfter: 6 },
    ]);
    expect(created[0].createdAt).toBeInstanceOf(Date);
    expect(repository.movements).toHaveLength(2);
    await expect(
      service.recordAdjustment({
        adjustmentId: 4,
        userId: 7,
        adjustmentType: 'SALIDA',
        reason: 'Otro',
        lines: [{ productId: 1, quantity: 1, stockBefore: 15, stockAfter: 14 }],
      }),
    ).rejects.toThrow('Los movimientos de este ajuste ya fueron registrados');
    expect(repository.movements).toHaveLength(2);
  });

  it('records an order exit and a later return, and skips a cancellation that has no exit', async () => {
    const { service } = createService();
    const confirmed = await service.recordOrderConfirmation({
      orderId: 9,
      userId: 7,
      lines: [{ productId: 1, quantity: 3, stockBefore: 10, stockAfter: 7 }],
    });
    const untouched = await service.recordOrderCancellation({
      orderId: 8,
      userId: 7,
      lines: [{ productId: 1, quantity: 3, stockBefore: 10, stockAfter: 13 }],
    });
    const returned = await service.recordOrderCancellation({
      orderId: 9,
      userId: 7,
      lines: [{ productId: 1, quantity: 3, stockBefore: 7, stockAfter: 10 }],
    });
    const repeated = await service.recordOrderCancellation({
      orderId: 9,
      userId: 7,
      lines: [{ productId: 1, quantity: 3, stockBefore: 10, stockAfter: 13 }],
    });

    expect(confirmed[0]).toMatchObject({
      orderId: 9,
      adjustmentId: null,
      movementType: 'SALIDA',
      quantity: 3,
      stockBefore: 10,
      stockAfter: 7,
    });
    expect(untouched).toEqual([]);
    expect(returned[0]).toMatchObject({ movementType: 'DEVOLUCION', stockBefore: 7, stockAfter: 10 });
    expect(repeated).toEqual([]);
    await expect(
      service.recordOrderConfirmation({
        orderId: 9,
        userId: 7,
        lines: [{ productId: 1, quantity: 3, stockBefore: 10, stockAfter: 7 }],
      }),
    ).rejects.toThrow('La salida de este pedido ya fue registrada');
  });

  it('rejects a movement that would make stock negative or that does not match the resulting stock', async () => {
    const { service, repository } = createService();

    await expect(
      service.recordAdjustment({
        adjustmentId: 1,
        userId: 7,
        adjustmentType: 'SALIDA',
        reason: 'Merma',
        lines: [{ productId: 1, quantity: 4, stockBefore: 3, stockAfter: 0 }],
      }),
    ).rejects.toThrow('El movimiento dejaría el stock en negativo');
    await expect(
      service.recordOrderConfirmation({
        orderId: 1,
        userId: 7,
        lines: [{ productId: 1, quantity: 2, stockBefore: 10, stockAfter: 7 }],
      }),
    ).rejects.toThrow('El stock posterior no coincide con la cantidad movilizada');
    expect(repository.movements).toEqual([]);
  });

  it('lists the history of a product and filters by type and date', async () => {
    const { service, repository } = createService();
    await service.recordAdjustment({
      adjustmentId: 1,
      userId: 7,
      adjustmentType: 'INGRESO',
      reason: 'Inicial',
      lines: [{ productId: 1, quantity: 5, stockBefore: 0, stockAfter: 5 }],
    });
    await service.recordOrderConfirmation({
      orderId: 3,
      userId: 7,
      lines: [{ productId: 1, quantity: 2, stockBefore: 5, stockAfter: 3 }],
    });
    repository.movements[0].createdAt = new Date('2026-01-02T10:00:00.000Z');
    repository.movements[1].createdAt = new Date('2026-01-20T10:00:00.000Z');

    const history = await service.list(parseMovementQuery({ productId: '1' }));
    const filtered = await service.list(parseMovementQuery({ type: 'SALIDA', from: '2026-01-01', to: '2026-01-31' }));

    expect(history.map((movement) => movement.movementType)).toEqual(['INGRESO', 'SALIDA']);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].movementType).toBe('SALIDA');
    expect(() => parseMovementQuery({ from: '2026-02-02', to: '2026-02-01' })).toThrow(DomainError);
    expect(() => parseMovementQuery({ type: 'OTRO' })).toThrow('El tipo de movimiento no es válido');
  });
});
