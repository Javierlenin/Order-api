import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../../../shared/httpErrorHandlers';
import { AdjustmentLine, MovementLine, ReportProduct } from '../../domain/StockReport';
import { ReportRepository } from '../../ports/ReportRepository';
import { ReportService } from '../../application/ReportService';
import { createReportRouter } from './ReportRoutes';

const product: ReportProduct = { id: 4, codeProduct: 'CAM-01', name: 'Camisa' };

const adjustments: AdjustmentLine[] = [
  {
    id: 1,
    adjustmentId: 10,
    productId: 4,
    occurredAt: new Date('2026-01-01T15:30:00.000Z'),
    type: 'INGRESO',
    quantity: 10,
    stockBefore: 0,
    stockAfter: 10,
    userId: 2,
    userName: 'Ana Ruiz',
    reason: 'Inventario inicial',
  },
];

const movements: MovementLine[] = [
  {
    id: 8,
    adjustmentId: null,
    orderId: 3,
    orderNumber: 8,
    productId: 4,
    occurredAt: new Date('2026-01-03T15:30:00.000Z'),
    type: 'DEVOLUCION',
    quantity: 1,
    stockBefore: 9,
    stockAfter: 10,
    userId: 3,
    userName: 'Luis Pérez',
    reason: null,
    notes: null,
  },
];

class FakeReportRepository implements ReportRepository {
  findProduct = async (id: number): Promise<ReportProduct | undefined> => (product.id === id ? product : undefined);

  listAdjustments = async (productId: number): Promise<AdjustmentLine[]> =>
    adjustments.filter((line) => line.productId === productId);

  listMovements = async (productId: number): Promise<MovementLine[]> =>
    movements.filter((line) => line.productId === productId);
}

const app = express();
app.use(express.json());
app.use('/reports', createReportRouter(new ReportService(new FakeReportRepository())));
app.use(errorHandler);

describe('stock reports', () => {
  it('returns the history of the selected product', async () => {
    const response = await request(app).get('/reports/stock/4').query({ type: 'DEVOLUCION', from: '2026-01-01' });

    expect(response.status).toBe(200);
    expect(response.body.product).toMatchObject({ id: 4, codeProduct: 'CAM-01', stock: 10 });
    expect(response.body.movements).toHaveLength(1);
    expect(response.body.movements[0]).toMatchObject({
      type: 'DEVOLUCION',
      quantity: 1,
      stockBefore: 9,
      stockAfter: 10,
      userName: 'Luis Pérez',
      description: 'Pedido 8',
    });
  });

  it('returns 404 when the product does not exist and 400 when the type is invalid', async () => {
    const missing = await request(app).get('/reports/stock/99');
    const invalid = await request(app).get('/reports/stock/4').query({ type: 'OTRO' });

    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('Producto no encontrado');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('El tipo de movimiento no es válido');
  });
});
