import { DomainError } from '../../../shared/DomainError';

export interface Category {
  id: number;
  name: string;
  description: string | null;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewCategory {
  name: string;
  description: string | null;
  status: boolean;
}

export const parseNewCategory = (input: unknown): NewCategory => {
  const { name, description, status } = (input ?? {}) as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim()) {
    throw new DomainError('El nombre de la categoría es obligatorio');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new DomainError('La descripción de la categoría debe ser texto');
  }

  if (status !== undefined && typeof status !== 'boolean') {
    throw new DomainError('El estado de la categoría debe ser verdadero o falso');
  }

  return {
    name: name.trim(),
    description: typeof description === 'string' ? description.trim() || null : null,
    status: status ?? true,
  };
};

export const parseCategoryStatus = (input: unknown): boolean => {
  const { status } = (input ?? {}) as Record<string, unknown>;

  if (typeof status !== 'boolean') {
    throw new DomainError('El estado de la categoría debe ser verdadero o falso');
  }

  return status;
};
