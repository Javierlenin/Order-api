import { PrismaClient } from '../../../../generated/prisma/client';
import { AuthAccount, AuthRepository } from '../../ports/AuthRepository';

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
