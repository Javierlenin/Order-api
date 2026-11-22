import { NotFoundError } from '../../../shared/NotFoundError';
import { Category, parseCategoryStatus, parseNewCategory } from '../domain/Category';
import { CategoryRepository } from '../ports/CategoryRepository';

const CATEGORY_NOT_FOUND_MESSAGE = 'Categoría no encontrada';

export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  list = async (): Promise<Category[]> => this.repository.findAll();

  getById = async (id: number): Promise<Category> => {
    const category = await this.repository.findById(id);
    if (!category) {
      throw new NotFoundError(CATEGORY_NOT_FOUND_MESSAGE);
    }
    return category;
  };

  create = async (input: unknown): Promise<Category> => this.repository.save(parseNewCategory(input));

  update = async (id: number, input: unknown): Promise<Category> => {
    const category = await this.repository.update(id, parseNewCategory(input));
    if (!category) {
      throw new NotFoundError(CATEGORY_NOT_FOUND_MESSAGE);
    }
    return category;
  };

  setStatus = async (id: number, input: unknown): Promise<Category> => {
    const category = await this.repository.updateStatus(id, parseCategoryStatus(input));
    if (!category) {
      throw new NotFoundError(CATEGORY_NOT_FOUND_MESSAGE);
    }
    return category;
  };
}
