import { InventoryMovement, MovementQuery, NewInventoryMovement } from '../domain/InventoryMovement';

export interface InventoryMovementRepository {
  saveMany: (movements: NewInventoryMovement[]) => Promise<InventoryMovement[]>;
  find: (query: MovementQuery) => Promise<InventoryMovement[]>;
  findByOrder: (orderId: number) => Promise<InventoryMovement[]>;
  findByAdjustment: (adjustmentId: number) => Promise<InventoryMovement[]>;
}
