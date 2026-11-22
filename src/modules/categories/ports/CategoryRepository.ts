import { Category, NewCategory } from '../domain/Category';

export interface CategoryRepository {
  findAll: () => Promise<Category[]>;
  findById: (id: number) => Promise<Category | undefined>;
  save: (category: NewCategory) => Promise<Category>;
  update: (id: number, category: NewCategory) => Promise<Category | undefined>;
  updateStatus: (id: number, status: boolean) => Promise<Category | undefined>;
}
