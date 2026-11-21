import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { notFoundHandler, errorHandler } from './shared/httpErrorHandlers';
import HTTP_STATUS from './shared/httpStatus';
import { createPrismaClient } from './shared/database/prismaClient';
import { PrismaRoleRepository } from './modules/roles/adapter/persistence/PrismaRoleRepository';
import { RoleService } from './modules/roles/application/RoleService';
import { createRoleRouter } from './modules/roles/adapter/http/RoleRoutes';
import { PrismaUserRepository } from './modules/users/adapter/persistence/PrismaUserRepository';
import { UserService } from './modules/users/application/UserService';
import { createUserRouter } from './modules/users/adapter/http/UserRoutes';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL es obligatoria. Este API solo persiste en PostgreSQL con Prisma.');
}

const prisma = createPrismaClient(databaseUrl);
const roleService = new RoleService(new PrismaRoleRepository(prisma));
const userService = new UserService(new PrismaUserRepository(prisma));

app.get('/health', (_req, res) => {
  res.status(HTTP_STATUS.OK).json({ status: 'ok' });
});

app.use('/roles', createRoleRouter(roleService));
app.use('/users', createUserRouter(userService));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
