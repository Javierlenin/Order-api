import { DomainError } from '../../../shared/DomainError';
import {
  AdjustmentProductStock,
  buildAdjustmentLines,
  parseNewInventoryAdjustment,
  reverseAdjustmentStock,
} from './InventoryAdjustment';

const products: AdjustmentProductStock[] = [
  { id: 1, codeProduct: 'PROD-001', name: 'Cuaderno', stock: 10 },
  { id: 2, codeProduct: 'PROD-002', name: 'Lápiz', stock: 4 },
];

describe('parseNewInventoryAdjustment', () => {
  it('returns the adjustment with the trimmed reason and its details', () => {
    const result = parseNewInventoryAdjustment({
      userId: 7,
      adjustmentType: 'INGRESO',
      reason: '  Inventario inicial  ',
      details: [
        { productId: 1, quantity: 5 },
        { productId: 2, quantity: 2 },
      ],
    });

    expect(result).toEqual({
      userId: 7,
      adjustmentType: 'INGRESO',
      reason: 'Inventario inicial',
      details: [
        { productId: 1, quantity: 5 },
        { productId: 2, quantity: 2 },
      ],
    });
  });

  it('throws when the type, the user, the reason or the products are invalid', () => {
    expect(() => parseNewInventoryAdjustment({ userId: 7, adjustmentType: 'DEVOLUCION', reason: 'Ajuste' })).toThrow(
      'El tipo de ajuste debe ser INGRESO o SALIDA',
    );
    expect(() =>
      parseNewInventoryAdjustment({ userId: 0, adjustmentType: 'SALIDA', reason: 'Ajuste', details: [] }),
    ).toThrow('El usuario responsable no es válido');
    expect(() =>
      parseNewInventoryAdjustment({ userId: 7, adjustmentType: 'SALIDA', reason: '   ', details: [{ productId: 1, quantity: 1 }] }),
    ).toThrow('El motivo del ajuste es obligatorio');
    expect(() =>
      parseNewInventoryAdjustment({ userId: 7, adjustmentType: 'SALIDA', reason: 'Ajuste', details: [] }),
    ).toThrow('Debe registrar al menos un producto');
    expect(() =>
      parseNewInventoryAdjustment({
        userId: 7,
        adjustmentType: 'SALIDA',
        reason: 'Ajuste',
        details: [
          { productId: 1, quantity: 1 },
          { productId: 1, quantity: 2 },
        ],
      }),
    ).toThrow('El producto no puede repetirse en el ajuste');
    expect(() =>
      parseNewInventoryAdjustment({
        userId: 7,
        adjustmentType: 'SALIDA',
        reason: 'Ajuste',
        details: [{ productId: 1, quantity: 1.5 }],
      }),
    ).toThrow(DomainError);
  });
});

describe('buildAdjustmentLines', () => {
  it('increases stock on an ingreso and decreases it on a salida', () => {
    expect(buildAdjustmentLines('INGRESO', products, [{ productId: 1, quantity: 5 }])).toEqual([
      {
        productId: 1,
        codeProduct: 'PROD-001',
        productName: 'Cuaderno',
        quantity: 5,
        stockBefore: 10,
        stockAfter: 15,
      },
    ]);

    expect(buildAdjustmentLines('SALIDA', products, [{ productId: 2, quantity: 4 }])).toEqual([
      {
        productId: 2,
        codeProduct: 'PROD-002',
        productName: 'Lápiz',
        quantity: 4,
        stockBefore: 4,
        stockAfter: 0,
      },
    ]);
  });

  it('rejects a salida that would leave the stock negative', () => {
    expect(() => buildAdjustmentLines('SALIDA', products, [{ productId: 2, quantity: 5 }])).toThrow(
      'El ajuste dejaría el stock en negativo',
    );
  });

  it('rejects an ingreso that exceeds the allowed stock', () => {
    expect(() =>
      buildAdjustmentLines('INGRESO', [{ id: 1, codeProduct: 'PROD-001', name: 'Cuaderno', stock: 2_147_483_647 }], [
        { productId: 1, quantity: 1 },
      ]),
    ).toThrow('La cantidad del ajuste excede el stock permitido');
  });

  it('rejects a product that does not exist', () => {
    expect(() => buildAdjustmentLines('INGRESO', products, [{ productId: 9, quantity: 1 }])).toThrow(
      'Uno o más productos no existen',
    );
  });
});

describe('reverseAdjustmentStock', () => {
  it('subtracts an ingreso and adds back a salida', () => {
    expect(reverseAdjustmentStock('INGRESO', products, [{ productId: 1, quantity: 5 }])).toEqual([
      { productId: 1, stockAfter: 5 },
    ]);
    expect(reverseAdjustmentStock('SALIDA', products, [{ productId: 2, quantity: 4 }])).toEqual([
      { productId: 2, stockAfter: 8 },
    ]);
  });

  it('rejects a reversal that would leave the stock negative or above the limit', () => {
    expect(() => reverseAdjustmentStock('INGRESO', products, [{ productId: 2, quantity: 5 }])).toThrow(
      'Eliminar el ajuste dejaría el stock en negativo',
    );
    expect(() =>
      reverseAdjustmentStock('SALIDA', [{ id: 1, codeProduct: 'PROD-001', name: 'Cuaderno', stock: 2_147_483_647 }], [
        { productId: 1, quantity: 1 },
      ]),
    ).toThrow('Eliminar el ajuste excede el stock permitido');
  });
});
