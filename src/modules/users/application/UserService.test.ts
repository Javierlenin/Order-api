import { DomainError } from '../../../shared/DomainError';
import { NotFoundError } from '../../../shared/NotFoundError';
import { NewUser, User } from '../domain/User';
import { UserRepository } from '../ports/UserRepository';
import { UserService } from './UserService';

class FakeUserRepository implements UserRepository {
  private users: User[] = [];
  private nextId = 1;

  findAll = async (): Promise<User[]> => [...this.users];

  findById = async (id: number): Promise<User | undefined> => this.users.find((user) => user.id === id);

  save = async (newUser: NewUser): Promise<User> => {
    const now = new Date();
    const user: User = {
      id: this.nextId++,
      roleId: newUser.roleId,
      roleName: 'Administrador',
      name: newUser.name,
      email: newUser.email,
      status: newUser.status,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(user);
    return user;
  };

  update = async (id: number, data: NewUser): Promise<User | undefined> => {
    const current = this.users.find((user) => user.id === id);
    if (!current) {
      return undefined;
    }

    const updated: User = {
      ...current,
      roleId: data.roleId,
      name: data.name,
      email: data.email,
      status: data.status,
      updatedAt: new Date(),
    };
    this.users = this.users.map((user) => (user.id === id ? updated : user));
    return updated;
  };

  remove = async (id: number): Promise<boolean> => {
    const before = this.users.length;
    this.users = this.users.filter((user) => user.id !== id);
    return this.users.length < before;
  };
}

const validInput = { roleId: 1, name: 'Ana Ruiz', email: 'ana@example.com', password: 'secreto', status: true };

const createService = (): UserService => new UserService(new FakeUserRepository());

describe('UserService', () => {
  it('creates a valid user and returns it with an id and its role name', async () => {
    const created = await createService().create(validInput);

    expect(created).toMatchObject({ id: 1, roleId: 1, roleName: 'Administrador', name: 'Ana Ruiz', email: 'ana@example.com', status: true });
    expect(created).not.toHaveProperty('password');
  });

  it('rejects an invalid user and does not save it', async () => {
    const service = createService();

    await expect(service.create({ roleId: 1, name: 'Ana Ruiz' })).rejects.toThrow(DomainError);
    expect(await service.list()).toEqual([]);
  });

  it('lists the users that were created', async () => {
    const service = createService();
    await service.create(validInput);

    expect(await service.list()).toHaveLength(1);
  });

  it('gets a user by id and throws NotFoundError when it does not exist', async () => {
    const service = createService();
    const created = await service.create(validInput);

    expect(await service.getById(created.id)).toEqual(created);
    await expect(service.getById(999)).rejects.toThrow(NotFoundError);
  });

  it('updates a user with valid data', async () => {
    const service = createService();
    const created = await service.create(validInput);

    const updated = await service.update(created.id, { ...validInput, name: 'Ana Pérez' });

    expect(updated.name).toBe('Ana Pérez');
    expect(updated.id).toBe(created.id);
  });

  it('rejects an update with invalid data and throws NotFoundError for a missing id', async () => {
    const service = createService();
    const created = await service.create(validInput);

    await expect(service.update(created.id, { ...validInput, email: 'sin-arroba' })).rejects.toThrow(DomainError);
    await expect(service.update(999, validInput)).rejects.toThrow(NotFoundError);
  });

  it('removes a user and throws NotFoundError when it does not exist', async () => {
    const service = createService();
    const created = await service.create(validInput);

    await service.remove(created.id);

    expect(await service.list()).toEqual([]);
    await expect(service.remove(created.id)).rejects.toThrow(NotFoundError);
  });
});
