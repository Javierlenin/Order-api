import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaClient } from '../../../../generated/prisma/client';
import { DomainError } from '../../../../shared/DomainError';
import { NewUser, User } from '../../domain/User';
import { UserRepository } from '../../ports/UserRepository';

type UserRecord = {
  id: number;
  roleId: number;
  name: string;
  email: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
  role: { name: string };
};

const withRoleName = { role: { select: { name: true } } };

const toUser = (record: UserRecord): User => ({
  id: record.id,
  roleId: record.roleId,
  roleName: record.role.name,
  name: record.name,
  email: record.email,
  status: record.status,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
};

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === code;

const isRecordNotFound = (error: unknown): boolean => hasErrorCode(error, 'P2025');

const isUniqueViolation = (error: unknown): boolean => hasErrorCode(error, 'P2002');

const isForeignKeyViolation = (error: unknown): boolean => hasErrorCode(error, 'P2003');

const isRelationViolation = (error: unknown): boolean => hasErrorCode(error, 'P2003') || hasErrorCode(error, 'P2014');

const EMAIL_ALREADY_EXISTS_MESSAGE = 'El correo ya está registrado';
const ROLE_NOT_FOUND_MESSAGE = 'El rol indicado no existe';
const USER_HAS_RELATIONS_MESSAGE = 'No se puede eliminar el usuario porque tiene registros relacionados';

const toUserData = (newUser: NewUser, updatedAt?: Date) => ({
  roleId: newUser.roleId,
  name: newUser.name,
  email: newUser.email,
  passwordHash: hashPassword(newUser.password),
  status: newUser.status,
  ...(updatedAt ? { updatedAt } : {}),
});

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll = async (): Promise<User[]> => {
    const records = await this.prisma.user.findMany({ orderBy: { id: 'asc' }, include: withRoleName });
    return records.map(toUser);
  };

  findById = async (id: number): Promise<User | undefined> => {
    const record = await this.prisma.user.findUnique({ where: { id }, include: withRoleName });
    return record ? toUser(record) : undefined;
  };

  save = async (newUser: NewUser): Promise<User> => {
    try {
      const record = await this.prisma.user.create({ data: toUserData(newUser), include: withRoleName });
      return toUser(record);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DomainError(EMAIL_ALREADY_EXISTS_MESSAGE);
      }
      if (isForeignKeyViolation(error)) {
        throw new DomainError(ROLE_NOT_FOUND_MESSAGE);
      }
      throw error;
    }
  };

  update = async (id: number, data: NewUser): Promise<User | undefined> => {
    try {
      const record = await this.prisma.user.update({
        where: { id },
        data: toUserData(data, new Date()),
        include: withRoleName,
      });
      return toUser(record);
    } catch (error) {
      if (isRecordNotFound(error)) {
        return undefined;
      }
      if (isUniqueViolation(error)) {
        throw new DomainError(EMAIL_ALREADY_EXISTS_MESSAGE);
      }
      if (isForeignKeyViolation(error)) {
        throw new DomainError(ROLE_NOT_FOUND_MESSAGE);
      }
      throw error;
    }
  };

  remove = async (id: number): Promise<boolean> => {
    try {
      await this.prisma.user.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isRecordNotFound(error)) {
        return false;
      }
      if (isRelationViolation(error)) {
        throw new DomainError(USER_HAS_RELATIONS_MESSAGE);
      }
      throw error;
    }
  };
}
