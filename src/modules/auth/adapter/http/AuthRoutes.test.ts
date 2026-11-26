import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../../../shared/httpErrorHandlers';
import { hashPassword } from '../../../../shared/password';
import { Registration } from '../../domain/Credentials';
import { AdminRole, AuthAccount, AuthRepository } from '../../ports/AuthRepository';
import { AuthService } from '../../application/AuthService';
import { createAuthRouter } from './AuthRoutes';
import { requireAuth } from './requireAuth';

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
  findByEmail = async (email: string): Promise<AuthAccount | undefined> =>
    account.email === email ? account : undefined;

  resolveAdminRole = async (): Promise<AdminRole> => ({ id: account.roleId, name: 'Admin' });

  register = async (roleId: number, registration: Registration): Promise<AuthAccount> => ({
    ...account,
    id: 9,
    roleId,
    roleName: 'Admin',
    name: registration.name,
    email: registration.email,
    status: registration.status,
    passwordHash: hashPassword(registration.password),
  });
}

const service = new AuthService(new FakeAuthRepository(), 'secreto-de-prueba', '1h');

const app = express();
app.use(express.json());
app.use('/auth', createAuthRouter(service));
app.get('/privado', requireAuth(service), (req, res) => {
  res.status(200).json({ id: req.auth?.id });
});
app.use(errorHandler);

describe('POST /auth/login', () => {
  it('returns 200 with a token that opens a protected route', async () => {
    const login = await request(app).post('/auth/login').send({ email: account.email, password });

    expect(login.status).toBe(200);
    expect(typeof login.body.token).toBe('string');

    const protectedResponse = await request(app)
      .get('/privado')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(protectedResponse.status).toBe(200);
    expect(protectedResponse.body).toEqual({ id: account.id });
  });

  it('returns 400 when the body is incomplete and 401 when the credentials are wrong', async () => {
    const missing = await request(app).post('/auth/login').send({ email: account.email });
    const invalid = await request(app).post('/auth/login').send({ email: account.email, password: 'incorrecta' });

    expect(missing.status).toBe(400);
    expect(missing.body.error).toBe('El correo y la contraseña son obligatorios');
    expect(invalid.status).toBe(401);
    expect(invalid.body.error).toBe('El correo o la contraseña no son válidos');
  });

  it('returns 201 and assigns the Admin role without receiving it in the body', async () => {
    const response = await request(app).post('/auth/register').send({
      name: 'Lenin',
      email: 'nuevo@example.com',
      password,
      status: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      name: 'Lenin',
      email: 'nuevo@example.com',
      roleId: account.roleId,
      roleName: 'Admin',
      status: true,
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(typeof response.body.token).toBe('string');
  });

  it('returns 400 when the registration body is incomplete', async () => {
    const response = await request(app).post('/auth/register').send({ email: 'nuevo@example.com', password });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('El nombre, el correo y la contraseña son obligatorios');
  });

  it('returns 401 when the protected route has no token', async () => {
    const response = await request(app).get('/privado');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('No autorizado');
  });
});
