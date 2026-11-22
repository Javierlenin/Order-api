import { DomainError } from '../../../shared/DomainError';
import { NotFoundError } from '../../../shared/NotFoundError';
import { Category, NewCategory } from '../domain/Category';
import { CategoryRepository } from '../ports/CategoryRepository';
import { CategoryService } from './CategoryService';

class FakeCategoryRepository implements CategoryRepository {
  private categories: Category[] = [];
  private nextId = 1;

  findAll = async (): Promise<Category[]> => [...this.categories];

  findById = async (id: number): Promise<Category | undefined> =>
    this.categories.find((category) => category.id === id);

  save = async (newCategory: NewCategory): Promise<Category> => {
    if (this.categories.some(({ name }) => name.toLocaleLowerCase() === newCategory.name.toLocaleLowerCase())) {
      throw new DomainError('El nombre de la categoría ya está registrado');
    }
    const now = new Date();
    const category = { id: this.nextId++, ...newCategory, createdAt: now, updatedAt: now };
    this.categories.push(category);
    return category;
  };

  update = async (id: number, data: NewCategory): Promise<Category | undefined> => {
    const current = await this.findById(id);
    if (!current) {
      return undefined;
    }
    if (
      this.categories.some(
        (category) => category.id !== id && category.name.toLocaleLowerCase() === data.name.toLocaleLowerCase(),
      )
    ) {
      throw new DomainError('El nombre de la categoría ya está registrado');
    }
    const updated = { ...current, ...data, updatedAt: new Date() };
    this.categories = this.categories.map((category) => (category.id === id ? updated : category));
    return updated;
  };

  updateStatus = async (id: number, status: boolean): Promise<Category | undefined> => {
    const current = await this.findById(id);
    if (!current) {
      return undefined;
    }
    const updated = { ...current, status, updatedAt: new Date() };
    this.categories = this.categories.map((category) => (category.id === id ? updated : category));
    return updated;
  };
}

const createService = (): CategoryService => new CategoryService(new FakeCategoryRepository());

describe('CategoryService', () => {
  it('creates categories with normalized fields and a default active status', async () => {
    const created = await createService().create({ name: '  Papelería  ', description: '  Oficina  ' });

    expect(created).toMatchObject({ id: 1, name: 'Papelería', description: 'Oficina', status: true });
  });

  it('requires a name and rejects duplicate names', async () => {
    const service = createService();
    await expect(service.create({ name: ' ' })).rejects.toThrow(DomainError);
    await service.create({ name: 'Accesorios' });
    await expect(service.create({ name: 'Accesorios' })).rejects.toThrow('El nombre de la categoría ya está registrado');
  });

  it('lists and gets categories by id', async () => {
    const service = createService();
    const category = await service.create({ name: 'Accesorios' });

    expect(await service.list()).toEqual([category]);
    expect(await service.getById(category.id)).toEqual(category);
    await expect(service.getById(99)).rejects.toThrow(NotFoundError);
  });

  it('updates category data and changes its active status', async () => {
    const service = createService();
    const created = await service.create({ name: 'Accesorios' });
    const updated = await service.update(created.id, { name: 'Repuestos', description: 'Partes' });
    const inactive = await service.setStatus(created.id, { status: false });

    expect(updated.name).toBe('Repuestos');
    expect(inactive.status).toBe(false);
    await expect(service.setStatus(created.id, { status: 0 })).rejects.toThrow(DomainError);
  });
});
