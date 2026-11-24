import { PrismaClient } from '../../../../generated/prisma/client';
import { DomainError } from '../../../../shared/DomainError';
import { hashPassword } from '../../../../shared/password';
import { AuthAccount, AuthRepository, NewAuthAccount } from '../../ports/AuthRepository';

const DEFAULT_ROLE_NAME = 'Usuario';
const EMAIL_ALREADY_REGISTERED_MESSAGE = 'El correo ya está registrado';

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail = async (email: string): Promise<AuthAccount | undefined> => {
    const record = await this.prisma.user.findUnique({
      where: { email },
      include: { role: { select: { name: true } } },
    });

    if (!record) {
      return undefined;
    }

    return toAccount(record);
  };

  save = async (account: NewAuthAccount): Promise<AuthAccount> => {
    const role = await this.resolveRole();

    try {
      const record = await this.prisma.user.create({
        data: {
          roleId: role.id,
          name: account.name,
          email: account.email,
          passwordHash: hashPassword(account.password),
          status: true,
        },
        include: { role: { select: { name: true } } },
      });

      return toAccount(record);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DomainError(EMAIL_ALREADY_REGISTERED_MESSAGE);
      }

      throw error;
    }
  };

  private resolveRole = async (): Promise<{ id: number; name: string }> => {
    const current = await this.prisma.role.findFirst({
      where: { status: true },
      orderBy: { id: 'asc' },
    });

    if (current) {
      return { id: current.id, name: current.name };
    }

    try {
      const created = await this.prisma.role.create({
        data: { name: DEFAULT_ROLE_NAME, status: true },
      });

      return { id: created.id, name: created.name };
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      const existing = await this.prisma.role.findUnique({ where: { name: DEFAULT_ROLE_NAME } });

      if (!existing) {
        throw error;
      }

      return { id: existing.id, name: existing.name };
    }
  };
}

type AccountRecord = {
  id: number;
  roleId: number;
  name: string;
  email: string;
  passwordHash: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
  role: { name: string };
};

const toAccount = (record: AccountRecord): AuthAccount => ({
  id: record.id,
  roleId: record.roleId,
  roleName: record.role.name,
  name: record.name,
  email: record.email,
  passwordHash: record.passwordHash,
  status: record.status,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});
