import { DomainError } from '../../../shared/DomainError';

export interface Role {
  id: number;
  name: string;
  description: string | null;
  status: boolean;
}

export type NewRole = Omit<Role, 'id'>;

export const parseNewRole = (input: unknown): NewRole => {
  const { name, description, status } = (input ?? {}) as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim()) {
    throw new DomainError('El nombre del rol es obligatorio');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new DomainError('La descripción del rol no es válida');
  }

  if (status !== undefined && typeof status !== 'boolean') {
    throw new DomainError('El estado del rol debe ser verdadero o falso');
  }

  const descriptionText = typeof description === 'string' ? description.trim() : '';

  return {
    name: name.trim(),
    description: descriptionText ? descriptionText : null,
    status: status ?? true,
  };
};
