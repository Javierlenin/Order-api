import { DomainError } from '../../../shared/DomainError';

export interface Product {
  id: number;
  categoryId: number;
  categoryName: string;
  codeProduct: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewProduct {
  categoryId: number;
  codeProduct: string;
  name: string;
  description: string | null;
  price: number;
  status: boolean;
}

export const parseNewProduct = (input: unknown): NewProduct => {
  const { categoryId, codeProduct, name, description, price, status } = (input ?? {}) as Record<string, unknown>;

  if (typeof categoryId !== 'number' || !Number.isInteger(categoryId) || categoryId <= 0) {
    throw new DomainError('La categoría del producto no es válida');
  }

  if (typeof codeProduct !== 'string' || !codeProduct.trim()) {
    throw new DomainError('El código del producto es obligatorio');
  }

  if (typeof name !== 'string' || !name.trim()) {
    throw new DomainError('El nombre del producto es obligatorio');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new DomainError('La descripción del producto debe ser texto');
  }

  if (
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    price <= 0 ||
    price > 9999999999.99 ||
    Math.abs(price - Math.round(price * 100) / 100) > 1e-8
  ) {
    throw new DomainError('El precio debe ser mayor que cero y tener como máximo dos decimales');
  }

  if (status !== undefined && typeof status !== 'boolean') {
    throw new DomainError('El estado del producto debe ser verdadero o falso');
  }

  return {
    categoryId,
    codeProduct: codeProduct.trim(),
    name: name.trim(),
    description: typeof description === 'string' ? description.trim() || null : null,
    price,
    status: status ?? true,
  };
};

export const parseProductStatus = (input: unknown): boolean => {
  const { status } = (input ?? {}) as Record<string, unknown>;

  if (typeof status !== 'boolean') {
    throw new DomainError('El estado del producto debe ser verdadero o falso');
  }

  return status;
};
