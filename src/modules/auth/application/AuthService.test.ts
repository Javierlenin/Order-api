import { DomainError } from '../../../shared/DomainError';
import { hashPassword } from '../../../shared/password';
import { UnauthorizedError } from '../../../shared/UnauthorizedError';
import { AuthAccount, AuthRepository } from '../ports/AuthRepository';
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

  it('rejects a token that was not issued by this service', () => {
    expect(() => createService().verify('token-invalido')).toThrow(UnauthorizedError);
  });
});
