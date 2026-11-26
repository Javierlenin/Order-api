import { Registration } from '../domain/Credentials';

export interface AuthAccount {
  id: number;
  roleId: number;
  roleName: string;
  name: string;
  email: string;
  passwordHash: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminRole {
  id: number;
  name: string;
}

export interface AuthRepository {
  findByEmail: (email: string) => Promise<AuthAccount | undefined>;
  resolveAdminRole: () => Promise<AdminRole>;
  register: (roleId: number, registration: Registration) => Promise<AuthAccount>;
}
