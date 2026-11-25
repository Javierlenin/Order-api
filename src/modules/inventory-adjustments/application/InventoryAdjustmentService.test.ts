import { DomainError } from '../../../shared/DomainError';
import { NotFoundError } from '../../../shared/NotFoundError';
import { InventoryAdjustment, NewInventoryAdjustment } from '../domain/InventoryAdjustment';
import { InventoryAdjustmentRepository } from '../ports/InventoryAdjustmentRepository';
import { InventoryAdjustmentService } from './InventoryAdjustmentService';

class FakeInventoryAdjustmentRepository implements InventoryAdjustmentRepository {
  adjustments: InventoryAdjustment[] = [];
  saved: NewInventoryAdjustment[] = [];

  findAll = async (): Promise<InventoryAdjustment[]> => [...this.adjustments];

  findById = async (id: number): Promise<InventoryAdjustment | undefined> =>
    this.adjustments.find((adjustment) => adjustment.id === id);

  save = async (adjustment: NewInventoryAdjustment): Promise<InventoryAdjustment> => {
    this.saved.push(adjustment);
    const created: InventoryAdjustment = {
      id: this.adjustments.length + 1,
      userId: adjustment.userId,
      userName: 'Ana Ruiz',
      adjustmentType: adjustment.adjustmentType,
      reason: adjustment.reason,
      createdAt: new Date('2026-03-01T15:30:00.000Z'),
      details: adjustment.details.map((detail, index) => ({
        id: index + 1,
        productId: detail.productId,
        codeProduct: 'PROD-001',
        productName: 'Cuaderno',
        quantity: detail.quantity,
        stockBefore: 10,
        stockAfter: adjustment.adjustmentType === 'SALIDA' ? 10 - detail.quantity : 10 + detail.quantity,
      })),
    };
    this.adjustments.push(created);
    return created;
  };
}

const createService = (): { service: InventoryAdjustmentService; repository: FakeInventoryAdjustmentRepository } => {
  const repository = new FakeInventoryAdjustmentRepository();
  return { service: new InventoryAdjustmentService(repository), repository };
};

describe('InventoryAdjustmentService', () => {
  it('registers the header with its details', async () => {
    const { service, repository } = createService();
    const created = await service.create({
      userId: 7,
      adjustmentType: 'INGRESO',
      reason: '  Inventario inicial  ',
      details: [
        { productId: 1, quantity: 5 },
        { productId: 2, quantity: 2 },
      ],
    });

    expect(repository.saved).toEqual([
      {
        userId: 7,
        adjustmentType: 'INGRESO',
        reason: 'Inventario inicial',
        details: [
          { productId: 1, quantity: 5 },
          { productId: 2, quantity: 2 },
        ],
      },
    ]);
    expect(created).toMatchObject({
      id: 1,
      userId: 7,
      userName: 'Ana Ruiz',
      adjustmentType: 'INGRESO',
      reason: 'Inventario inicial',
      createdAt: new Date('2026-03-01T15:30:00.000Z'),
    });
    expect(created.details).toHaveLength(2);
    expect(await service.list()).toEqual([created]);
  });

  it('does not save an adjustment that fails validation', async () => {
    const { service, repository } = createService();

    await expect(service.create({ userId: 7, adjustmentType: 'SALIDA', reason: 'Ajuste', details: [] })).rejects.toThrow(
      DomainError,
    );
    expect(repository.saved).toHaveLength(0);
  });

  it('throws when the adjustment does not exist', async () => {
    const { service } = createService();

    await expect(service.getById(4)).rejects.toThrow(NotFoundError);
  });
});
