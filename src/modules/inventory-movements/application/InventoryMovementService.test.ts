import { DomainError } from '../../../shared/DomainError';

import { parseMovementQuery } from '../domain/InventoryMovement';
import { InventoryMovement, NewInventoryMovement } from '../domain/InventoryMovement';

import { InventoryMovementRepository } from '../ports/InventoryMovementRepository';
import { InventoryMovementService } from './InventoryMovementService';

class FakeInventoryMovementRepository implements InventoryMovementRepository {
  movements: InventoryMovement[] = [];


  saveMany = async (movements: NewInventoryMovement[]): Promise<InventoryMovement[]> => {
    const created = movements.map((movement, index) => ({
      id: this.movements.length + index + 1,
      ...movement,
      codeProduct: 'PROD-001',
      productName: 'Cuaderno',
      userName: 'Ana Ruiz',
      createdAt: new Date('2026-03-01T15:30:00.000Z'),
    }));

    this.movements.push(...created);
    return created;
  };

  find = async (): Promise<InventoryMovement[]> => [...this.movements];



  findByOrder = async (orderId: number): Promise<InventoryMovement[]> =>
    this.movements.filter((movement) => movement.orderId === orderId);

  findByAdjustment = async (adjustmentId: number): Promise<InventoryMovement[]> =>
    this.movements.filter((movement) => movement.adjustmentId === adjustmentId);
}


describe('InventoryMovementService', () => {
  const line = { productId: 1, quantity: 2, stockBefore: 5, stockAfter: 3 };

  it('records an adjustment movement with product, stock, user and date', async () => {
    const repository = new FakeInventoryMovementRepository();
    const service = new InventoryMovementService(repository);
    const created = await service.recordAdjustment({
      adjustmentId: 4,
      userId: 7,
      adjustmentType: 'SALIDA',
      reason: '  Merma  ',
      lines: [line],
    });

    expect(created[0]).toMatchObject({
      productId: 1,
      adjustmentId: 4,
      orderId: null,
      userId: 7,
      userName: 'Ana Ruiz',
      movementType: 'SALIDA',
      quantity: 2,
      stockBefore: 5,
      stockAfter: 3,
      description: 'Merma',
      createdAt: new Date('2026-03-01T15:30:00.000Z'),
    });
  });

  it('rejects a second movement for the same adjustment', async () => {
    const repository = new FakeInventoryMovementRepository();
    const service = new InventoryMovementService(repository);
    await service.recordAdjustment({
      adjustmentId: 4,
      userId: 7,
      adjustmentType: 'SALIDA',
      reason: 'Merma',
      lines: [line],
    });


    await expect(
      service.recordAdjustment({
        adjustmentId: 4,
        userId: 7,
        adjustmentType: 'SALIDA',
        reason: 'Merma',
        lines: [line],
      }),
    ).rejects.toThrow('Los movimientos de este ajuste ya fueron registrados');
  });

  it('records the order exit and returns only the quantity that left', async () => {
    const repository = new FakeInventoryMovementRepository();
    const service = new InventoryMovementService(repository);
    await service.recordOrderConfirmation({ orderId: 9, userId: 7, lines: [line] });
    const returned = await service.recordOrderCancellation({
      orderId: 9,
      userId: 7,
      lines: [{ productId: 1, quantity: 2, stockBefore: 3, stockAfter: 5 }],
    });

    expect(returned.map((movement) => movement.movementType)).toEqual(['DEVOLUCION']);
    await expect(
      service.recordOrderConfirmation({ orderId: 9, userId: 7, lines: [line] }),
    ).rejects.toThrow(DomainError);
  });

  it('keeps a late movement inside the selected calendar day', () => {
    const query = parseMovementQuery({ from: '2026-11-24', to: '2026-11-24' });
    const late = new Date(2026, 10, 24, 23, 50, 0);

    expect(query.from && query.to && late >= query.from && late <= query.to).toBe(true);
  });

  it('does not return a product that never left the stock', async () => {
    const repository = new FakeInventoryMovementRepository();
    const service = new InventoryMovementService(repository);
    const returned = await service.recordOrderCancellation({ orderId: 9, userId: 7, lines: [line] });

    expect(returned).toEqual([]);
    expect(repository.movements).toEqual([]);

  });
});
