import { DomainError } from '../../../shared/DomainError';
import {
  AdjustmentMovementSource,
  InventoryMovement,
  MovementQuery,
  movementsFromAdjustment,
  movementsFromOrderCancellation,
  movementsFromOrderConfirmation,
  OrderMovementSource,
} from '../domain/InventoryMovement';
import { InventoryMovementRepository } from '../ports/InventoryMovementRepository';

const ADJUSTMENT_ALREADY_RECORDED = 'Los movimientos de este ajuste ya fueron registrados';
const ORDER_EXIT_ALREADY_RECORDED = 'La salida de este pedido ya fue registrada';

export class InventoryMovementService {
  constructor(private readonly repository: InventoryMovementRepository) {}

  list = async (query: MovementQuery): Promise<InventoryMovement[]> => this.repository.find(query);

  recordAdjustment = async (source: AdjustmentMovementSource): Promise<InventoryMovement[]> => {
    const movements = movementsFromAdjustment(source);
    const existing = await this.repository.findByAdjustment(source.adjustmentId);

    if (existing.length > 0) {
      throw new DomainError(ADJUSTMENT_ALREADY_RECORDED);
    }

    return this.repository.saveMany(movements);
  };

  recordOrderConfirmation = async (source: OrderMovementSource): Promise<InventoryMovement[]> => {
    const movements = movementsFromOrderConfirmation(source);
    const existing = await this.repository.findByOrder(source.orderId);
    const alreadyRecorded = movements.some((movement) =>
      existing.some((current) => current.productId === movement.productId && current.movementType === 'SALIDA'),
    );

    if (alreadyRecorded) {
      throw new DomainError(ORDER_EXIT_ALREADY_RECORDED);
    }

    return this.repository.saveMany(movements);
  };

  recordOrderCancellation = async (source: OrderMovementSource): Promise<InventoryMovement[]> => {
    const existing = await this.repository.findByOrder(source.orderId);
    const movements = movementsFromOrderCancellation(source, existing);

    return this.repository.saveMany(movements);
  };
}
