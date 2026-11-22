import { NotFoundError } from '../../../shared/NotFoundError';
import { AdjustmentLine, MovementLine, ReportProduct } from '../domain/StockReport';
import { ReportRepository } from '../ports/ReportRepository';
import { ReportService } from './ReportService';

const products: ReportProduct[] = [{ id: 4, codeProduct: 'CAM-01', name: 'Camisa' }];

const adjustments: AdjustmentLine[] = [
  {
    id: 1,
    adjustmentId: 10,
    productId: 4,
    occurredAt: new Date('2026-01-01T10:00:00.000Z'),
    type: 'INGRESO',
    quantity: 10,
    stockBefore: 0,
    stockAfter: 10,
    userId: 2,
    userName: 'Ana Ruiz',
  },
];

const movements: MovementLine[] = [
  {
    id: 8,
    adjustmentId: 11,
    productId: 4,
    occurredAt: new Date('2026-01-03T10:00:00.000Z'),
    type: 'SALIDA',
    quantity: 4,
    stockBefore: 10,
    stockAfter: 6,
    userId: 3,
    userName: 'Luis Pérez',
  },
];

class FakeReportRepository implements ReportRepository {
  findProduct = async (id: number): Promise<ReportProduct | undefined> => products.find((product) => product.id === id);

  listAdjustments = async (productId: number): Promise<AdjustmentLine[]> =>
    adjustments.filter((line) => line.productId === productId);

  listMovements = async (productId: number): Promise<MovementLine[]> =>
    movements.filter((line) => line.productId === productId);
}

describe('ReportService', () => {
  const service = new ReportService(new FakeReportRepository());

  it('returns the movements of the requested product', async () => {
    const report = await service.getProductReport(4, { type: 'INGRESO' });

    expect(report.product.stock).toBe(6);
    expect(report.movements).toEqual([
      expect.objectContaining({
        type: 'INGRESO',
        quantity: 10,
        stockBefore: 0,
        stockAfter: 10,
        userName: 'Ana Ruiz',
      }),
    ]);
  });

  it('throws NotFoundError when the product does not exist', async () => {
    await expect(service.getProductReport(99, {})).rejects.toThrow(NotFoundError);
  });
});
