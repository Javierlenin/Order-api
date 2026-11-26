import { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import { DomainError } from '../../../../shared/DomainError';
import { buildAdjustmentLines, InventoryAdjustment, NewInventoryAdjustment } from '../../domain/InventoryAdjustment';
import { InventoryAdjustmentRepository } from '../../ports/InventoryAdjustmentRepository';

import { saveAdjustmentMovements } from '../../../inventory-movements/adapter/persistence/PrismaInventoryMovementRepository';


type AdjustmentRecord = {
  id: number;
  userId: number;
  adjustmentType: InventoryAdjustment['adjustmentType'];
  reason: string | null;
  createdAt: Date;
  user: { name: string };
  details: Array<{
    id: number;
    productId: number;
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    product: { codeProduct: string; name: string };
  }>;
};

const adjustmentInclude = {
  user: { select: { name: true } },
  details: {
    orderBy: { id: 'asc' as const },
    include: { product: { select: { codeProduct: true, name: true } } },
  },
};

const toAdjustment = (record: AdjustmentRecord): InventoryAdjustment => ({
  id: record.id,
  userId: record.userId,
  userName: record.user.name,
  adjustmentType: record.adjustmentType,
  reason: record.reason,
  createdAt: record.createdAt,
  details: record.details.map((detail) => ({
    id: detail.id,
    productId: detail.productId,
    codeProduct: detail.product.codeProduct,
    productName: detail.product.name,
    quantity: detail.quantity,
    stockBefore: detail.stockBefore,
    stockAfter: detail.stockAfter,
  })),
});

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === code;


const REFERENCE_NOT_FOUND_MESSAGE = 'El usuario o el producto indicado no existe';

const lockProducts = async (tx: Prisma.TransactionClient, productIds: number[]): Promise<void> => {
  await tx.$queryRaw(Prisma.sql`
    SELECT id
    FROM products
    WHERE id IN (${Prisma.join(productIds)})
    ORDER BY id
    FOR UPDATE
  `);
};

export class PrismaInventoryAdjustmentRepository implements InventoryAdjustmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll = async (): Promise<InventoryAdjustment[]> => {
    const records = await this.prisma.inventoryAdjustment.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: adjustmentInclude,
    });

    return records.map(toAdjustment);
  };

  findById = async (id: number): Promise<InventoryAdjustment | undefined> => {
    const record = await this.prisma.inventoryAdjustment.findUnique({ where: { id }, include: adjustmentInclude });

    return record ? toAdjustment(record) : undefined;
  };

  save = async (adjustment: NewInventoryAdjustment): Promise<InventoryAdjustment> => {
    try {

      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: adjustment.userId }, select: { id: true } });

        if (!user) {
          throw new DomainError('El usuario responsable no existe');
        }

        const productIds = adjustment.details.map((detail) => detail.productId).sort((left, right) => left - right);
        await lockProducts(tx, productIds);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, codeProduct: true, name: true, stock: true },
        });
        const lines = buildAdjustmentLines(adjustment.adjustmentType, products, adjustment.details);

        const record = await tx.inventoryAdjustment.create({
          data: {
            userId: adjustment.userId,
            adjustmentType: adjustment.adjustmentType,
            reason: adjustment.reason,
            details: {
              create: lines.map((line) => ({
                productId: line.productId,
                quantity: line.quantity,
                stockBefore: line.stockBefore,
                stockAfter: line.stockAfter,
              })),
            },
          },
          include: adjustmentInclude,
        });

        for (const line of lines) {
          await tx.product.update({
            where: { id: line.productId },
            data: { stock: line.stockAfter, updatedAt: new Date() },
          });
        }


        await saveAdjustmentMovements(tx, {
          adjustmentId: record.id,
          userId: adjustment.userId,
          adjustmentType: adjustment.adjustmentType,
          reason: adjustment.reason,
          lines: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            stockBefore: line.stockBefore,
            stockAfter: line.stockAfter,
          })),
        });

        return toAdjustment(record);
      });
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
}
