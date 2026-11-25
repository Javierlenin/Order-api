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
import { PrismaAuthRepository } from './modules/auth/adapter/persistence/PrismaAuthRepository';
import { AuthService } from './modules/auth/application/AuthService';
import { createAuthRouter } from './modules/auth/adapter/http/AuthRoutes';
import { requireAuth } from './modules/auth/adapter/http/requireAuth';
import { PrismaReportRepository } from './modules/reports/adapter/persistence/PrismaReportRepository';
import { ReportService } from './modules/reports/application/ReportService';
import { createReportRouter } from './modules/reports/adapter/http/ReportRoutes';
import { PrismaOrderRepository } from './modules/orders/adapter/persistence/PrismaOrderRepository';
import { OrderService } from './modules/orders/application/OrderService';
import { createOrderRouter } from './modules/orders/adapter/http/OrderRoutes';
import { PrismaProductRepository } from './modules/products/adapter/persistence/PrismaProductRepository';
import { ProductService } from './modules/products/application/ProductService';
import { createProductRouter } from './modules/products/adapter/http/ProductRoutes';
import { PrismaInventoryMovementRepository } from './modules/inventory-movements/adapter/persistence/PrismaInventoryMovementRepository';
import { InventoryMovementService } from './modules/inventory-movements/application/InventoryMovementService';
import { createInventoryMovementRouter } from './modules/inventory-movements/adapter/http/InventoryMovementRoutes';
import { PrismaInventoryAdjustmentRepository } from './modules/inventory-adjustments/adapter/persistence/PrismaInventoryAdjustmentRepository';
import { InventoryAdjustmentService } from './modules/inventory-adjustments/application/InventoryAdjustmentService';
import { createInventoryAdjustmentRouter } from './modules/inventory-adjustments/adapter/http/InventoryAdjustmentRoutes';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL es obligatoria. Este API solo persiste en PostgreSQL con Prisma.');
}

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET es obligatoria.');
}

const prisma = createPrismaClient(databaseUrl);
const roleService = new RoleService(new PrismaRoleRepository(prisma));
const userService = new UserService(new PrismaUserRepository(prisma));
const authService = new AuthService(new PrismaAuthRepository(prisma), jwtSecret);
const reportService = new ReportService(new PrismaReportRepository(prisma));
const orderService = new OrderService(new PrismaOrderRepository(prisma));
const productService = new ProductService(new PrismaProductRepository(prisma));
const inventoryMovementService = new InventoryMovementService(new PrismaInventoryMovementRepository(prisma));
const inventoryAdjustmentService = new InventoryAdjustmentService(new PrismaInventoryAdjustmentRepository(prisma));

app.get('/health', (_req, res) => {
  res.status(HTTP_STATUS.OK).json({ status: 'ok' });
});

app.use('/auth', createAuthRouter(authService));
app.use('/roles', requireAuth(authService), createRoleRouter(roleService));
app.use('/users', requireAuth(authService), createUserRouter(userService));
app.use('/reports', requireAuth(authService), createReportRouter(reportService));
app.use('/orders', requireAuth(authService), createOrderRouter(orderService));
app.use('/products', requireAuth(authService), createProductRouter(productService));
app.use('/inventory-movements', requireAuth(authService), createInventoryMovementRouter(inventoryMovementService));
app.use('/inventory-adjustments', requireAuth(authService), createInventoryAdjustmentRouter(inventoryAdjustmentService));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
