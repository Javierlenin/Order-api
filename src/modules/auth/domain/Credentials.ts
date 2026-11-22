import { DomainError } from '../../../shared/DomainError';

export interface LoginCredentials {
  email: string;
  password: string;
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
