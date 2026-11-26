import { PrismaClient } from '../../../../generated/prisma/client';
import { DomainError } from '../../../../shared/DomainError';
import { hashPassword } from '../../../../shared/password';
import { Registration } from '../../domain/Credentials';
import { AdminRole, AuthAccount, AuthRepository } from '../../ports/AuthRepository';

const ADMIN_ROLE_UNAVAILABLE = 'El rol Admin no está disponible';
const EMAIL_ALREADY_EXISTS_MESSAGE = 'El correo ya está registrado';

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === code;

const adminRoleFilter = {
  OR: [
    { name: { equals: 'Admin', mode: 'insensitive' as const } },
    { name: { equals: 'Administrador', mode: 'insensitive' as const } },
  ],
};

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  resolveAdminRole = async (): Promise<AdminRole> => {
    const existing = await this.prisma.role.findFirst({
      where: adminRoleFilter,
      orderBy: { id: 'asc' },
    });

    if (existing) {
      if (!existing.status) {
        throw new DomainError(ADMIN_ROLE_UNAVAILABLE);
      }

      return { id: existing.id, name: existing.name };
    }

    const created = await this.prisma.role.create({
      data: { name: 'Admin', status: true },
    });

    return { id: created.id, name: created.name };
  };

  register = async (roleId: number, registration: Registration): Promise<AuthAccount> => {
    try {
      const record = await this.prisma.user.create({
        data: {
          roleId,
          name: registration.name,
          email: registration.email,
          passwordHash: hashPassword(registration.password),
          status: registration.status,
        },
        include: { role: { select: { name: true } } },
      });

      return {
        id: record.id,
        roleId: record.roleId,
        roleName: record.role.name,
        name: record.name,
        email: record.email,
        passwordHash: record.passwordHash,
        status: record.status,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    } catch (error) {
      if (hasErrorCode(error, 'P2002')) {
        throw new DomainError(EMAIL_ALREADY_EXISTS_MESSAGE);
      }

      if (hasErrorCode(error, 'P2003')) {
        throw new DomainError(ADMIN_ROLE_UNAVAILABLE);
      }

      throw error;
    }
  };

  findByEmail = async (email: string): Promise<AuthAccount | undefined> => {
    const record = await this.prisma.user.findUnique({
      where: { email },
      include: { role: { select: { name: true } } },
    });

    if (!record) {
      return undefined;
    }

    return {
      id: record.id,
      roleId: record.roleId,
      roleName: record.role.name,
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  };
}
