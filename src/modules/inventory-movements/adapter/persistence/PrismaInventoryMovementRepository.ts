import { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import { DomainError } from '../../../../shared/DomainError';

import { InventoryMovement, MovementQuery, NewInventoryMovement } from '../../domain/InventoryMovement';

import { InventoryMovementRepository } from '../../ports/InventoryMovementRepository';

type MovementRecord = {
  id: number;
  productId: number;
  orderId: number | null;
  adjustmentId: number | null;
  userId: number;
  movementType: InventoryMovement['movementType'];
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  description: string | null;
  createdAt: Date;
  user: { name: string };
  product: { codeProduct: string; name: string };
};

const movementInclude = {
  user: { select: { name: true } },
  product: { select: { codeProduct: true, name: true } },
};

const toMovement = (record: MovementRecord): InventoryMovement => ({
  id: record.id,
  productId: record.productId,
  codeProduct: record.product.codeProduct,
  productName: record.product.name,
  orderId: record.orderId,
  adjustmentId: record.adjustmentId,
  userId: record.userId,
  userName: record.user.name,
  movementType: record.movementType,
  quantity: record.quantity,
  stockBefore: record.stockBefore,
  stockAfter: record.stockAfter,
  description: record.description,
  createdAt: record.createdAt,
});

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === code;

const REFERENCE_NOT_FOUND_MESSAGE = 'El usuario, el producto, el pedido o el ajuste indicado no existe';
const ORDER_EXIT_ALREADY_RECORDED = 'La salida de este pedido ya fue registrada';
const ADJUSTMENT_ALREADY_RECORDED = 'Los movimientos de este ajuste ya fueron registrados';


export const insertInventoryMovements = async (
  tx: Prisma.TransactionClient,
  movements: NewInventoryMovement[],
): Promise<InventoryMovement[]> => {
  const created: InventoryMovement[] = [];

  for (const movement of movements) {
    const record = await tx.inventoryMovement.create({ data: movement, include: movementInclude });
    created.push(toMovement(record));
  }

  return created;
};

export const saveOrderMovements = async (
  tx: Prisma.TransactionClient,
  direction: 'SALIDA' | 'DEVOLUCION',
  source: OrderMovementSource,
): Promise<NewInventoryMovement[]> => {
  const recorded = await tx.inventoryMovement.findMany({
    where: { orderId: source.orderId },
    select: { productId: true, movementType: true, quantity: true },
  });

  if (direction === 'SALIDA') {
    const movements = movementsFromOrderConfirmation(source);
    const alreadyRecorded = movements.some((movement) =>
      recorded.some((current) => current.productId === movement.productId && current.movementType === 'SALIDA'),
    );

    if (alreadyRecorded) {
      throw new DomainError(ORDER_EXIT_ALREADY_RECORDED);
    }

    await insertInventoryMovements(tx, movements);
    return movements;
  }

  const movements = movementsFromOrderCancellation(source, recorded);
  await insertInventoryMovements(tx, movements);
  return movements;
};

export const saveAdjustmentMovements = async (
  tx: Prisma.TransactionClient,
  source: AdjustmentMovementSource,
): Promise<NewInventoryMovement[]> => {
  const existing = await tx.inventoryMovement.findMany({
    where: { adjustmentId: source.adjustmentId },
    select: { id: true },
  });

  if (existing.length > 0) {
    throw new DomainError(ADJUSTMENT_ALREADY_RECORDED);
  }

  const movements = movementsFromAdjustment(source);
  await insertInventoryMovements(tx, movements);
  return movements;
};

const createdAtFilter = (query: MovementQuery): { gte?: Date; lte?: Date } | undefined => {
  if (!query.from && !query.to) {
    return undefined;
  }

  const createdAt: { gte?: Date; lte?: Date } = {};

  if (query.from) {
    createdAt.gte = query.from;
  }

  if (query.to) {
    createdAt.lte = query.to;
  }

  return createdAt;
};

export class PrismaInventoryMovementRepository implements InventoryMovementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  saveMany = async (movements: NewInventoryMovement[]): Promise<InventoryMovement[]> => {
    if (movements.length === 0) {
      return [];
    }

    try {
      return await this.prisma.$transaction((tx) => insertInventoryMovements(tx, movements));
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (hasErrorCode(error, 'P2003')) {
        throw new DomainError(REFERENCE_NOT_FOUND_MESSAGE);
      }

      throw error;
    }
  };

  find = async (query: MovementQuery): Promise<InventoryMovement[]> => {
    const records = await this.prisma.inventoryMovement.findMany({
      where: {
        productId: query.productId,
        movementType: query.type,
        createdAt: createdAtFilter(query),
      },

      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],

      include: movementInclude,
    });

    return records.map(toMovement);
  };

  findByOrder = async (orderId: number): Promise<InventoryMovement[]> => {
    const records = await this.prisma.inventoryMovement.findMany({
      where: { orderId },
      orderBy: { id: 'asc' },
      include: movementInclude,
    });

    return records.map(toMovement);
  };

  findByAdjustment = async (adjustmentId: number): Promise<InventoryMovement[]> => {
    const records = await this.prisma.inventoryMovement.findMany({
      where: { adjustmentId },
      orderBy: { id: 'asc' },
      include: movementInclude,
    });

    return records.map(toMovement);
  };
}
