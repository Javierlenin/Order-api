import { DomainError } from '../../../shared/DomainError';
import { NotFoundError } from '../../../shared/NotFoundError';
import { NewRole, Role } from '../domain/Role';
import { RoleRepository } from '../ports/RoleRepository';
import { RoleService } from './RoleService';

class FakeRoleRepository implements RoleRepository {
  private roles: Role[] = [];
  private nextId = 1;

  findAll = async (): Promise<Role[]> => [...this.roles];

  findById = async (id: number): Promise<Role | undefined> => this.roles.find((role) => role.id === id);

  save = async (newRole: NewRole): Promise<Role> => {
    const role = { id: this.nextId++, ...newRole };
    this.roles.push(role);
    return role;
  };

  update = async (id: number, data: NewRole): Promise<Role | undefined> => {
    const index = this.roles.findIndex((role) => role.id === id);
    if (index < 0) {
      return undefined;
    }

    const role = { id, ...data };
    this.roles[index] = role;
    return role;
  };

  remove = async (id: number): Promise<boolean> => {
    const before = this.roles.length;
    this.roles = this.roles.filter((role) => role.id !== id);
    return this.roles.length < before;
  };
}

const validInput = { name: 'Administrador', description: 'Acceso total', status: true };

const createService = (): RoleService => new RoleService(new FakeRoleRepository());

describe('RoleService', () => {
  it('creates a valid role and returns it with an id', async () => {
    const created = await createService().create(validInput);

    expect(created).toEqual({ id: 1, ...validInput });
  });

  it('rejects an invalid role and does not save it', async () => {
    const service = createService();

    await expect(service.create({ description: 'Sin nombre' })).rejects.toThrow(DomainError);
    expect(await service.list()).toEqual([]);
  });

  it('lists the roles that were created', async () => {
    const service = createService();
    await service.create(validInput);

    expect(await service.list()).toHaveLength(1);
  });

  it('gets a role by id and throws NotFoundError when it does not exist', async () => {
    const service = createService();
    const created = await service.create(validInput);

    expect(await service.getById(created.id)).toEqual(created);
    await expect(service.getById(999)).rejects.toThrow(NotFoundError);
  });

  it('updates a role with valid data', async () => {
    const service = createService();
    const created = await service.create(validInput);

    const updated = await service.update(created.id, { ...validInput, name: 'Supervisor' });

    expect(updated).toEqual({ id: created.id, ...validInput, name: 'Supervisor' });
  });

  it('rejects an update with invalid data and throws NotFoundError for a missing id', async () => {
    const service = createService();
    const created = await service.create(validInput);

    await expect(service.update(created.id, { name: ' ' })).rejects.toThrow(DomainError);
    await expect(service.update(999, validInput)).rejects.toThrow(NotFoundError);
  });

  it('removes a role and throws NotFoundError when it does not exist', async () => {
    const service = createService();
    const created = await service.create(validInput);

    await service.remove(created.id);

    expect(await service.list()).toEqual([]);
    await expect(service.remove(created.id)).rejects.toThrow(NotFoundError);
  });
});
