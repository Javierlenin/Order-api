import { DomainError } from '../../../shared/DomainError';
import { NotFoundError } from '../../../shared/NotFoundError';
import { NewProduct, Product } from '../domain/Product';
import { ProductRepository } from '../ports/ProductRepository';
import { ProductService } from './ProductService';

class FakeProductRepository implements ProductRepository {
  private products: Product[] = [];
  private nextId = 1;

  findAll = async (): Promise<Product[]> => [...this.products];

  findById = async (id: number): Promise<Product | undefined> =>
    this.products.find((product) => product.id === id);

  save = async (newProduct: NewProduct): Promise<Product> => {
    if (this.products.some(({ codeProduct }) => codeProduct === newProduct.codeProduct)) {
      throw new DomainError('El código del producto ya está registrado');
    }
    const now = new Date();
    const product = {
      id: this.nextId++,
      ...newProduct,
      categoryName: 'Accesorios',
      stock: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.products.push(product);
    return product;
  };

  update = async (id: number, data: NewProduct): Promise<Product | undefined> => {
    const current = await this.findById(id);
    if (!current) {
      return undefined;
    }
    if (this.products.some((product) => product.id !== id && product.codeProduct === data.codeProduct)) {
      throw new DomainError('El código del producto ya está registrado');
    }
    const updated = { ...current, ...data, updatedAt: new Date() };
    this.products = this.products.map((product) => (product.id === id ? updated : product));
    return updated;
  };

  updateStatus = async (id: number, status: boolean): Promise<Product | undefined> => {
    const current = await this.findById(id);
    if (!current) {
      return undefined;
    }
    const updated = { ...current, status, updatedAt: new Date() };
    this.products = this.products.map((product) => (product.id === id ? updated : product));
    return updated;
  };
}

const validInput = {
  categoryId: 1,
  codeProduct: 'PROD-001',
  name: 'Cuaderno',
  description: 'Cuaderno rayado',
  price: 2.5,
};

const createService = (): ProductService => new ProductService(new FakeProductRepository());

describe('ProductService', () => {
  it('creates products with their category, price, and initial stock', async () => {
    const product = await createService().create(validInput);

    expect(product).toMatchObject({
      id: 1,
      categoryId: 1,
      categoryName: 'Accesorios',
      price: 2.5,
      stock: 0,
      status: true,
    });
  });

  it('validates category, product code, name, and price and rejects duplicate codes', async () => {
    const service = createService();
    await expect(service.create({ ...validInput, categoryId: 0 })).rejects.toThrow(DomainError);
    await expect(service.create({ ...validInput, price: 1.234 })).rejects.toThrow(DomainError);
    await service.create(validInput);
    await expect(service.create(validInput)).rejects.toThrow('El código del producto ya está registrado');
  });

  it('returns current stock and does not change it during product updates', async () => {
    const service = createService();
    const created = await service.create(validInput);
    const updated = await service.update(created.id, { ...validInput, price: 3.25 });

    expect(await service.getStock(created.id)).toEqual({ productId: created.id, stock: 0 });
    expect(updated.price).toBe(3.25);
    expect(updated.stock).toBe(0);
    await expect(service.getStock(99)).rejects.toThrow(NotFoundError);
  });

  it('lists products and activates or inactivates a product', async () => {
    const service = createService();
    const created = await service.create(validInput);

    expect(await service.list()).toEqual([created]);
    expect((await service.setStatus(created.id, { status: false })).status).toBe(false);
    await expect(service.setStatus(created.id, { status: 'false' })).rejects.toThrow(DomainError);
  });
});
