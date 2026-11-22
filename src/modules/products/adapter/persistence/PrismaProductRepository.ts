import { PrismaClient } from '../../../../generated/prisma/client';
import { DomainError } from '../../../../shared/DomainError';
import { NewProduct, Product } from '../../domain/Product';
import { ProductRepository } from '../../ports/ProductRepository';

type ProductRecord = {
  id: number;
  categoryId: number;
  codeProduct: string;
  name: string;
  description: string | null;
  price: { toNumber: () => number };
  stock: number;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: { name: string };
};

const productInclude = { category: { select: { name: true } } };

const toProduct = (record: ProductRecord): Product => ({
  id: record.id,
  categoryId: record.categoryId,
  categoryName: record.category.name,
  codeProduct: record.codeProduct,
  name: record.name,
  description: record.description,
  price: record.price.toNumber(),
  stock: record.stock,
  status: record.status,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === code;

const PRODUCT_CODE_ALREADY_EXISTS_MESSAGE = 'El código del producto ya está registrado';
const CATEGORY_NOT_FOUND_MESSAGE = 'La categoría indicada no existe';

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll = async (): Promise<Product[]> => {
    const records = await this.prisma.product.findMany({ orderBy: { id: 'asc' }, include: productInclude });
    return records.map(toProduct);
  };

  findById = async (id: number): Promise<Product | undefined> => {
    const record = await this.prisma.product.findUnique({ where: { id }, include: productInclude });
    return record ? toProduct(record) : undefined;
  };

  save = async (product: NewProduct): Promise<Product> => {
    try {
      const record = await this.prisma.product.create({ data: product, include: productInclude });
      return toProduct(record);
    } catch (error) {
      if (hasErrorCode(error, 'P2002')) {
        throw new DomainError(PRODUCT_CODE_ALREADY_EXISTS_MESSAGE);
      }
      if (hasErrorCode(error, 'P2003')) {
        throw new DomainError(CATEGORY_NOT_FOUND_MESSAGE);
      }
      throw error;
    }
  };

  update = async (id: number, product: NewProduct): Promise<Product | undefined> => {
    try {
      const record = await this.prisma.product.update({
        where: { id },
        data: { ...product, updatedAt: new Date() },
        include: productInclude,
      });
      return toProduct(record);
    } catch (error) {
      if (hasErrorCode(error, 'P2025')) {
        return undefined;
      }
      if (hasErrorCode(error, 'P2002')) {
        throw new DomainError(PRODUCT_CODE_ALREADY_EXISTS_MESSAGE);
      }
      if (hasErrorCode(error, 'P2003')) {
        throw new DomainError(CATEGORY_NOT_FOUND_MESSAGE);
      }
      throw error;
    }
  };

  updateStatus = async (id: number, status: boolean): Promise<Product | undefined> => {
    try {
      const record = await this.prisma.product.update({
        where: { id },
        data: { status, updatedAt: new Date() },
        include: productInclude,
      });
      return toProduct(record);
    } catch (error) {
      if (hasErrorCode(error, 'P2025')) {
        return undefined;
      }
      throw error;
    }
  };
}
