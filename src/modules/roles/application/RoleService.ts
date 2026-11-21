import { NotFoundError } from '../../../shared/NotFoundError';
import { parseNewRole, Role } from '../domain/Role';
import { RoleRepository } from '../ports/RoleRepository';

const ROLE_NOT_FOUND_MESSAGE = 'Rol no encontrado';

export class RoleService {
  constructor(private readonly repository: RoleRepository) {}

  list = async (): Promise<Role[]> => this.repository.findAll();

  getById = async (id: number): Promise<Role> => {
    const role = await this.repository.findById(id);

    if (!role) {
      throw new NotFoundError(ROLE_NOT_FOUND_MESSAGE);
    }

    return role;
  };

  create = async (input: unknown): Promise<Role> => {
    const newRole = parseNewRole(input);
    return this.repository.save(newRole);
  };

  update = async (id: number, input: unknown): Promise<Role> => {
    const data = parseNewRole(input);
    const updated = await this.repository.update(id, data);

    if (!updated) {
      throw new NotFoundError(ROLE_NOT_FOUND_MESSAGE);
    }

    return updated;
  };

  remove = async (id: number): Promise<void> => {
    const removed = await this.repository.remove(id);

    if (!removed) {
      throw new NotFoundError(ROLE_NOT_FOUND_MESSAGE);
    }
  };
}
