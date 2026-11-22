import { DomainError } from '../../../shared/DomainError';

export interface Customer {
  id: number;
  identification: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewCustomer {
  identification: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: boolean;
}

const optionalText = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new DomainError(`El campo ${field} debe ser texto`);
  }

  return value.trim() || null;
};

export const parseNewCustomer = (input: unknown): NewCustomer => {
  const { identification, name, email, phone, address, status } = (input ?? {}) as Record<string, unknown>;

  if (typeof identification !== 'string' || !identification.trim()) {
    throw new DomainError('La identificación es obligatoria');
  }

  if (typeof name !== 'string' || !name.trim()) {
    throw new DomainError('El nombre es obligatorio');
  }

  const normalizedEmail = optionalText(email, 'correo');
  if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new DomainError('El correo no es válido');
  }

  if (status !== undefined && typeof status !== 'boolean') {
    throw new DomainError('El estado del cliente debe ser verdadero o falso');
  }

  return {
    identification: identification.trim(),
    name: name.trim(),
    email: normalizedEmail,
    phone: optionalText(phone, 'teléfono'),
    address: optionalText(address, 'dirección'),
    status: status ?? true,
  };
};

export const parseCustomerStatus = (input: unknown): boolean => {
  const { status } = (input ?? {}) as Record<string, unknown>;

  if (typeof status !== 'boolean') {
    throw new DomainError('El estado del cliente debe ser verdadero o falso');
  }

  return status;
};
