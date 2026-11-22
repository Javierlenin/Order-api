import { NewProduct, Product } from '../domain/Product';

export interface ProductRepository {
  findAll: () => Promise<Product[]>;
  findById: (id: number) => Promise<Product | undefined>;
  save: (product: NewProduct) => Promise<Product>;
  update: (id: number, product: NewProduct) => Promise<Product | undefined>;
  updateStatus: (id: number, status: boolean) => Promise<Product | undefined>;
}
