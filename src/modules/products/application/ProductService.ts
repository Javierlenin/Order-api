import { NotFoundError } from '../../../shared/NotFoundError';
import { NewProduct, parseNewProduct, parseProductStatus, Product } from '../domain/Product';
import { ProductRepository } from '../ports/ProductRepository';

const PRODUCT_NOT_FOUND_MESSAGE = 'Producto no encontrado';

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  list = async (): Promise<Product[]> => this.repository.findAll();

  getById = async (id: number): Promise<Product> => {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    }
    return product;
  };

  getStock = async (id: number): Promise<{ productId: number; stock: number }> => {
    const product = await this.getById(id);
    return { productId: product.id, stock: product.stock };
  };

  create = async (input: unknown): Promise<Product> => {
    const product: NewProduct = parseNewProduct(input);
    return this.repository.save(product);
  };

  update = async (id: number, input: unknown): Promise<Product> => {
    const product = await this.repository.update(id, parseNewProduct(input));
    if (!product) {
      throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    }
    return product;
  };

  setStatus = async (id: number, input: unknown): Promise<Product> => {
    const product = await this.repository.updateStatus(id, parseProductStatus(input));
    if (!product) {
      throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    }
    return product;
  };

  remove = async (id: number): Promise<void> => {
    const removed = await this.repository.remove(id);
    if (!removed) {
      throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    }
  };
}
