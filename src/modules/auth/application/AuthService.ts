import jwt, { type SignOptions } from 'jsonwebtoken';
import { DomainError } from '../../../shared/DomainError';
import { UnauthorizedError } from '../../../shared/UnauthorizedError';
import { verifyPassword } from '../../../shared/password';
import { User } from '../../users/domain/User';
import { AuthIdentity, displayNameFromEmail, parseLoginCredentials } from '../domain/Credentials';
import { AuthAccount, AuthRepository } from '../ports/AuthRepository';

const INVALID_CREDENTIALS_MESSAGE = 'El correo o la contraseña no son válidos';
const UNAUTHORIZED_MESSAGE = 'No autorizado';
const EMAIL_ALREADY_REGISTERED_MESSAGE = 'El correo ya está registrado';

const toUser = (account: AuthAccount): User => ({
  id: account.id,
  roleId: account.roleId,
  roleName: account.roleName,
  name: account.name,
  email: account.email,
  status: account.status,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
});

const isAuthIdentity = (payload: jwt.JwtPayload): payload is jwt.JwtPayload & AuthIdentity => {
  const id = Number(payload.sub);

  return (
    Number.isInteger(id) &&
    id > 0 &&
    typeof payload.roleId === 'number' &&
    typeof payload.roleName === 'string' &&
    typeof payload.name === 'string' &&
    typeof payload.email === 'string'
  );
};

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwtSecret: string,
    private readonly expiresIn: SignOptions['expiresIn'] = '8h',
  ) {}

  login = async (input: unknown): Promise<{ token: string; user: User }> => {
    const credentials = parseLoginCredentials(input);
    const account = await this.repository.findByEmail(credentials.email);

    if (!account || !account.status || !verifyPassword(credentials.password, account.passwordHash)) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.createSession(account);
  };

  register = async (input: unknown): Promise<{ token: string; user: User }> => {
    const credentials = parseLoginCredentials(input);
    const existing = await this.repository.findByEmail(credentials.email);

    if (existing) {
      throw new DomainError(EMAIL_ALREADY_REGISTERED_MESSAGE);
    }

    const account = await this.repository.save({
      name: displayNameFromEmail(credentials.email),
      email: credentials.email,
      password: credentials.password,
    });

    return this.createSession(account);
  };

  private createSession = (account: AuthAccount): { token: string; user: User } => {
    const user = toUser(account);
    const token = jwt.sign(
      { sub: String(user.id), roleId: user.roleId, roleName: user.roleName, name: user.name, email: user.email },
      this.jwtSecret,
      { expiresIn: this.expiresIn },
    );

    return { token, user };
  };

  verify = (token: string): AuthIdentity => {
    try {
      const payload = jwt.verify(token, this.jwtSecret);

      if (typeof payload === 'string' || !isAuthIdentity(payload)) {
        throw new UnauthorizedError(UNAUTHORIZED_MESSAGE);
      }

      return {
        id: Number(payload.sub),
        roleId: payload.roleId,
        roleName: payload.roleName,
        name: payload.name,
        email: payload.email,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      throw new UnauthorizedError(UNAUTHORIZED_MESSAGE);
    }
  };
}
