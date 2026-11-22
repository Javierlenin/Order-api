import { DomainError } from '../../../shared/DomainError';
import {
  AdjustmentLine,
  buildStockHistory,
  currentStock,
  filterStockEvents,
  MovementLine,
  parseStockQuery,
} from './StockReport';

const ingreso: AdjustmentLine = {
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
};

const salidaDuplicada: AdjustmentLine = {
  id: 2,
  adjustmentId: 11,
  productId: 4,
  occurredAt: new Date('2026-01-02T10:00:00.000Z'),
  type: 'SALIDA',
  quantity: 3,
  stockBefore: 10,
  stockAfter: 7,
  userId: 2,
  userName: 'Ana Ruiz',
};

const salidaPedido: MovementLine = {
  id: 8,
  adjustmentId: 11,
  productId: 4,
  occurredAt: new Date('2026-01-02T10:00:00.000Z'),
  type: 'SALIDA',
  quantity: 3,
  stockBefore: 10,
  stockAfter: 7,
  userId: 3,
  userName: 'Luis Pérez',
};

const devolucion: MovementLine = {
  id: 9,
  adjustmentId: 12,
  productId: 4,
  occurredAt: new Date('2026-01-05T10:00:00.000Z'),
  type: 'DEVOLUCION',
  quantity: 1,
  stockBefore: 7,
  stockAfter: 8,
  userId: 3,
  userName: 'Luis Pérez',
};

describe('buildStockHistory', () => {
  it('keeps the order movement and does not repeat the adjustment of the same product', () => {
    const history = buildStockHistory([ingreso, salidaDuplicada], [salidaPedido, devolucion]);

    expect(history.map((event) => event.type)).toEqual(['INGRESO', 'SALIDA', 'DEVOLUCION']);
    expect(history[1]).toMatchObject({ origin: 'MOVEMENT', userName: 'Luis Pérez', stockBefore: 10, stockAfter: 7 });
    expect(currentStock(history)).toBe(8);
  });

  it('uses zero when the product has no stock events', () => {
    expect(currentStock([])).toBe(0);
  });
});

describe('filterStockEvents', () => {
  const history = buildStockHistory([ingreso], [salidaPedido, devolucion]);

  it('filters by movement type and inclusive date range', () => {
    const filtered = filterStockEvents(history, {
      from: new Date('2026-01-02T00:00:00.000Z'),
      to: new Date('2026-01-02T23:59:59.999Z'),
      type: 'SALIDA',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toMatchObject({ type: 'SALIDA', quantity: 3 });
  });
});

describe('parseStockQuery', () => {
  it('reads a date range and a movement type', () => {
    expect(parseStockQuery({ from: '2026-01-01', to: '2026-01-31', type: 'DEVOLUCION' })).toEqual({
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.999Z'),
      type: 'DEVOLUCION',
    });
  });

  it('rejects an invalid type, an invalid date and an inverted range', () => {
    expect(() => parseStockQuery({ type: 'OTRO' })).toThrow('El tipo de movimiento no es válido');
    expect(() => parseStockQuery({ from: '2026-02-31' })).toThrow(DomainError);
    expect(() => parseStockQuery({ from: '2026-02-02', to: '2026-02-01' })).toThrow(
      'La fecha inicial no puede ser posterior a la fecha final',
    );
  });
});
