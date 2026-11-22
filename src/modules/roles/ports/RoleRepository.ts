import { NewRole, Role } from '../domain/Role';

export interface RoleRepository {
  findAll: () => Promise<Role[]>;
  findById: (id: number) => Promise<Role | undefined>;
  save: (newRole: NewRole) => Promise<Role>;
  update: (id: number, data: NewRole) => Promise<Role | undefined>;
  remove: (id: number) => Promise<boolean>;
}
