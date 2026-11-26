import { PrismaClient } from '../../../../generated/prisma/client';
import { AdjustmentLine, MovementLine, ReportProduct } from '../../domain/StockReport';
import { ReportRepository } from '../../ports/ReportRepository';

const productSelection = { id: true, codeProduct: true, name: true } as const;

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findProduct = async (id: number): Promise<ReportProduct | undefined> => {
    const product = await this.prisma.product.findUnique({ where: { id }, select: productSelection });
    return product ?? undefined;
  };

  listAdjustments = async (productId: number): Promise<AdjustmentLine[]> => {
    const details = await this.prisma.inventoryAdjustmentDetail.findMany({
      where: { productId },
      include: {
        adjustment: {
          select: {
            adjustmentType: true,
            reason: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    return details.map((detail) => ({
      id: detail.id,
      adjustmentId: detail.adjustmentId,
      productId: detail.productId,
      occurredAt: detail.adjustment.createdAt,
      type: detail.adjustment.adjustmentType,
      quantity: detail.quantity,
      stockBefore: detail.stockBefore,
      stockAfter: detail.stockAfter,
      userId: detail.adjustment.user.id,
      userName: detail.adjustment.user.name,
      reason: detail.adjustment.reason,
    }));
  };

  listMovements = async (productId: number): Promise<MovementLine[]> => {
    const movements = await this.prisma.inventoryMovement.findMany({
      where: { productId },
      include: {
        user: { select: { id: true, name: true } },
        order: { select: { orderNumber: true, notes: true } },
      },
    });

    return movements.map((movement) => ({
      id: movement.id,
      adjustmentId: movement.adjustmentId,
      orderId: movement.orderId,
      orderNumber: movement.order?.orderNumber ?? null,
      productId: movement.productId,
      occurredAt: movement.createdAt,
      type: movement.movementType,
      quantity: movement.quantity,
      stockBefore: movement.stockBefore,
      stockAfter: movement.stockAfter,
      userId: movement.user.id,
      userName: movement.user.name,
      reason: movement.description,
      notes: movement.order?.notes ?? null,
    }));
  };
}
