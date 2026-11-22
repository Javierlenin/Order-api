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

export interface AuthRepository {
  findByEmail: (email: string) => Promise<AuthAccount | undefined>;
}
