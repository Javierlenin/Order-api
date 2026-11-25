import { InventoryAdjustment, NewInventoryAdjustment } from '../domain/InventoryAdjustment';

export interface InventoryAdjustmentRepository {
  findAll: () => Promise<InventoryAdjustment[]>;
  findById: (id: number) => Promise<InventoryAdjustment | undefined>;
  save: (adjustment: NewInventoryAdjustment) => Promise<InventoryAdjustment>;
}
