import { DomainError } from '../../../shared/DomainError';
import { NotFoundError } from '../../../shared/NotFoundError';

import { InventoryAdjustment, NewInventoryAdjustment } from '../domain/InventoryAdjustment';
import { InventoryAdjustmentRepository } from '../ports/InventoryAdjustmentRepository';
import { InventoryAdjustmentService } from './InventoryAdjustmentService';

class FakeInventoryAdjustmentRepository implements InventoryAdjustmentRepository {
  adjustments: InventoryAdjustment[] = [];
  saved: NewInventoryAdjustment[] = [];


import { calculateStockChanges, InventoryAdjustment, NewInventoryAdjustment } from '../domain/InventoryAdjustment';
import { InventoryAdjustmentRepository } from '../ports/InventoryAdjustmentRepository';
import { InventoryAdjustmentService } from './InventoryAdjustmentService';

type StoredProduct = { codeProduct: string; name: string; stock: number };

class FakeInventoryAdjustmentRepository implements InventoryAdjustmentRepository {
  adjustments: InventoryAdjustment[] = [];
  products = new Map<number, StoredProduct>([
    [1, { codeProduct: 'PROD-001', name: 'Cuaderno', stock: 10 }],
    [2, { codeProduct: 'PROD-002', name: 'Lápiz', stock: 4 }],
  ]);
  private users = new Map<number, string>([[7, 'Ana Ruiz']]);
  private nextAdjustmentId = 1;
  private nextDetailId = 1;

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


    const userName = this.users.get(adjustment.userId);

    if (!userName) {
      throw new DomainError('El usuario indicado no existe');
    }

    const stocks = new Map([...this.products.entries()].map(([id, product]) => [id, product.stock]));
    const changes = calculateStockChanges(adjustment.adjustmentType, adjustment.details, stocks);
    const created: InventoryAdjustment = {
      id: this.nextAdjustmentId++,
      userId: adjustment.userId,
      userName,
      adjustmentType: adjustment.adjustmentType,
      reason: adjustment.reason,
      createdAt: new Date(),
      details: changes.map((change) => {
        const product = this.products.get(change.productId);

        if (!product) {
          throw new DomainError('El producto indicado no existe');
        }

        return {
          id: this.nextDetailId++,
          productId: change.productId,
          codeProduct: product.codeProduct,
          productName: product.name,
          quantity: change.quantity,
          stockBefore: change.stockBefore,
          stockAfter: change.stockAfter,
        };
      }),
    };

    for (const change of changes) {
      const product = this.products.get(change.productId);

      if (product) {
        product.stock = change.stockAfter;
      }
    }


    this.adjustments.push(created);
    return created;
  };
}


const validInput = {
  userId: 7,
  adjustmentType: 'INGRESO',
  reason: '  Inventario inicial  ',
  details: [
    { productId: 1, quantity: 5 },
    { productId: 2, quantity: 2 },
  ],
};



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


  it('registers the header, the product lines, the responsible user, and the date', async () => {
    const { service, repository } = createService();
    const created = await service.create(validInput);

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


      details: [
        { productId: 1, codeProduct: 'PROD-001', quantity: 5, stockBefore: 10, stockAfter: 15 },
        { productId: 2, codeProduct: 'PROD-002', quantity: 2, stockBefore: 4, stockAfter: 6 },
      ],
    });
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(repository.products.get(1)?.stock).toBe(15);
    expect(repository.products.get(2)?.stock).toBe(6);
    expect(await service.list()).toEqual([created]);
    expect(await service.getById(created.id)).toEqual(created);
  });

  it('decreases stock on a withdrawal and allows the stock to reach zero', async () => {
    const { service, repository } = createService();
    const created = await service.create({
      userId: 7,
      adjustmentType: 'SALIDA',
      reason: 'Merma',
      details: [{ productId: 2, quantity: 4 }],
    });

    expect(created.details[0]).toMatchObject({ stockBefore: 4, stockAfter: 0 });
    expect(repository.products.get(2)?.stock).toBe(0);
  });

  it('rejects a withdrawal that would make stock negative and does not persist the adjustment', async () => {
    const { service, repository } = createService();

    await expect(
      service.create({
        userId: 7,
        adjustmentType: 'SALIDA',
        reason: 'Merma',
        details: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 5 },
        ],
      }),
    ).rejects.toThrow('El ajuste dejaría el stock del producto en negativo');

    expect(await service.list()).toEqual([]);
    expect(repository.products.get(1)?.stock).toBe(10);
    expect(repository.products.get(2)?.stock).toBe(4);
  });

  it('validates the type, the reason, the user, and the product lines', async () => {
    const { service } = createService();

    await expect(service.create({ ...validInput, adjustmentType: 'OTRO' })).rejects.toThrow(
      'El tipo de ajuste debe ser INGRESO o SALIDA',
    );
    await expect(service.create({ ...validInput, reason: '   ' })).rejects.toThrow('El motivo del ajuste es obligatorio');
    await expect(service.create({ ...validInput, userId: 0 })).rejects.toThrow(DomainError);
    await expect(service.create({ ...validInput, details: [] })).rejects.toThrow('Debe registrar al menos un producto');
    await expect(
      service.create({
        ...validInput,
        details: [
          { productId: 1, quantity: 1 },
          { productId: 1, quantity: 2 },
        ],
      }),
    ).rejects.toThrow('El producto no puede repetirse en el ajuste');
    await expect(service.create({ ...validInput, details: [{ productId: 1, quantity: 1.5 }] })).rejects.toThrow(
      DomainError,
    );
  });

  it('does not change stock when the user or the product does not exist', async () => {
    const { service, repository } = createService();

    await expect(service.create({ ...validInput, userId: 99 })).rejects.toThrow('El usuario indicado no existe');
    await expect(
      service.create({ ...validInput, details: [{ productId: 99, quantity: 1 }] }),
    ).rejects.toThrow('El producto indicado no existe');
    expect(repository.products.get(1)?.stock).toBe(10);
    expect(await service.list()).toEqual([]);
    await expect(service.getById(99)).rejects.toThrow(NotFoundError);


  });
});
