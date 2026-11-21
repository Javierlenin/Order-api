import { DomainError } from '../../../shared/DomainError';

export interface User {
  id: number;
  roleId: number;
  roleName: string;
  name: string;
  email: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewUser {
  roleId: number;
  name: string;
  email: string;
  password: string;
  status: boolean;
}

export const parseNewUser = (input: unknown): NewUser => {
  const { roleId, name, email, password, status } = (input ?? {}) as Record<string, unknown>;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    throw new DomainError('El nombre, el correo y la contraseña son obligatorios');
  }

  if (!email.includes('@')) {
    throw new DomainError('El correo no es válido');
  }

  if (typeof roleId !== 'number' || !Number.isInteger(roleId) || roleId <= 0) {
    throw new DomainError('El rol es obligatorio');
  }

  if (status !== undefined && typeof status !== 'boolean') {
    throw new DomainError('El estado del usuario debe ser verdadero o falso');
  }

  return {
    roleId,
    name: name.trim(),
    email: email.trim(),
    password,
    status: status ?? true,
  };
};
