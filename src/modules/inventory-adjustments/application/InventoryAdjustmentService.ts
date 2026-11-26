import { NotFoundError } from '../../../shared/NotFoundError';
import { InventoryAdjustment, parseNewInventoryAdjustment } from '../domain/InventoryAdjustment';
import { InventoryAdjustmentRepository } from '../ports/InventoryAdjustmentRepository';

const ADJUSTMENT_NOT_FOUND_MESSAGE = 'Ajuste de inventario no encontrado';

export class InventoryAdjustmentService {
  constructor(private readonly repository: InventoryAdjustmentRepository) {}

  list = async (): Promise<InventoryAdjustment[]> => this.repository.findAll();

  getById = async (id: number): Promise<InventoryAdjustment> => {
    const adjustment = await this.repository.findById(id);

    if (!adjustment) {
      throw new NotFoundError(ADJUSTMENT_NOT_FOUND_MESSAGE);
    }

    return adjustment;
  };

  create = async (input: unknown): Promise<InventoryAdjustment> =>
    this.repository.save(parseNewInventoryAdjustment(input));

  remove = async (id: number): Promise<void> => {
    const removed = await this.repository.remove(id);

    if (!removed) {
      throw new NotFoundError(ADJUSTMENT_NOT_FOUND_MESSAGE);
    }
  };
}
