import { DomainError } from '../../../shared/DomainError';
import { hashPassword } from '../../../shared/password';
import { UnauthorizedError } from '../../../shared/UnauthorizedError';
import { Registration } from '../domain/Credentials';
import { AdminRole, AuthAccount, AuthRepository } from '../ports/AuthRepository';
import { AuthService } from './AuthService';

const password = 'secreto';

const account: AuthAccount = {
  id: 1,
  roleId: 2,
  roleName: 'Administrador',
  name: 'Ana Ruiz',
  email: 'ana@example.com',
  passwordHash: hashPassword(password),
  status: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

class FakeAuthRepository implements AuthRepository {
  constructor(private readonly accounts: AuthAccount[]) {}

  findByEmail = async (email: string): Promise<AuthAccount | undefined> =>
    this.accounts.find((current) => current.email === email);

  resolveAdminRole = async (): Promise<AdminRole> => ({ id: 2, name: 'Admin' });

  register = async (roleId: number, registration: Registration): Promise<AuthAccount> => {
    const created: AuthAccount = {
      id: this.accounts.length + 1,
      roleId,
      roleName: 'Admin',
      name: registration.name,
      email: registration.email,
      passwordHash: hashPassword(registration.password),
      status: registration.status,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    };
    this.accounts.push(created);
    return created;
  };
}

const createService = (accounts: AuthAccount[] = [account]): AuthService =>
  new AuthService(new FakeAuthRepository(accounts), 'secreto-de-prueba', '1h');

describe('AuthService', () => {
  it('returns a token and the user without the password hash', async () => {
    const session = await createService().login({ email: ' ana@example.com ', password });

    expect(session.user).toEqual({
      id: account.id,
      roleId: account.roleId,
      roleName: account.roleName,
      name: account.name,
      email: account.email,
      status: account.status,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    });
    expect(session.user).not.toHaveProperty('passwordHash');
    expect(createService().verify(session.token)).toEqual({
      id: account.id,
      roleId: account.roleId,
      roleName: account.roleName,
      name: account.name,
      email: account.email,
    });
  });

  it('rejects an unknown email, a wrong password and an inactive user with the same error', async () => {
    const inactive = { ...account, id: 2, email: 'inactivo@example.com', status: false };
    const service = createService([account, inactive]);

    await expect(service.login({ email: 'otro@example.com', password })).rejects.toThrow(UnauthorizedError);
    await expect(service.login({ email: account.email, password: 'incorrecta' })).rejects.toThrow(
      'El correo o la contraseña no son válidos',
    );
    await expect(service.login({ email: inactive.email, password })).rejects.toThrow(
      'El correo o la contraseña no son válidos',
    );
  });

  it('rejects incomplete credentials before looking up the user', async () => {
    await expect(createService().login({ email: 'ana@example.com' })).rejects.toThrow(DomainError);
  });

  it('registers the name, email, password and status with the Admin role', async () => {
    const service = createService([]);
    const session = await service.register({
      name: ' Lenin ',
      email: ' lenin@example.com ',
      password: 'secreto',
      status: true,
    });

    expect(session.user).toMatchObject({
      roleId: 2,
      roleName: 'Admin',
      name: 'Lenin',
      email: 'lenin@example.com',
      status: true,
    });
    expect(session.user).not.toHaveProperty('password');
    expect(session.user).not.toHaveProperty('passwordHash');
    expect(service.verify(session.token).email).toBe('lenin@example.com');
    await expect(service.login({ email: 'lenin@example.com', password: 'secreto' })).resolves.toMatchObject({
      user: { email: 'lenin@example.com' },
    });
  });

  it('keeps a new account active when the status is omitted', async () => {
    const session = await createService([]).register({
      name: 'Lenin',
      email: 'lenin@example.com',
      password: 'secreto',
    });

    expect(session.user.status).toBe(true);
  });

  it('rejects a token that was not issued by this service', () => {
    expect(() => createService().verify('token-invalido')).toThrow(UnauthorizedError);
  });
});
