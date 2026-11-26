import { DomainError } from '../../../shared/DomainError';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Registration {
  name: string;
  email: string;
  password: string;
  status: boolean;
}

export interface Registration {
  name: string;
  email: string;
  password: string;
  status: boolean;
}

export interface AuthIdentity {
  id: number;
  roleId: number;
  roleName: string;
  name: string;
  email: string;
}

export const parseLoginCredentials = (input: unknown): LoginCredentials => {
  const { email, password } = (input ?? {}) as Record<string, unknown>;

  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    throw new DomainError('El correo y la contraseña son obligatorios');
  }

  if (!email.includes('@')) {
    throw new DomainError('El correo no es válido');
  }

  return { email: email.trim(), password };
};

export const parseRegistration = (input: unknown): Registration => {
  const { name, email, password, status } = (input ?? {}) as Record<string, unknown>;

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

  if (status !== undefined && typeof status !== 'boolean') {
    throw new DomainError('El estado del usuario debe ser verdadero o falso');
  }

  return {
    name: name.trim(),
    email: email.trim(),
    password,
    status: status ?? true,
  };
};
