import { PrismaClient } from '../../../../generated/prisma/client';
import { DomainError } from '../../../../shared/DomainError';
import { NewRole, Role } from '../../domain/Role';
import { RoleRepository } from '../../ports/RoleRepository';

type RoleRecord = {
  id: number;
  name: string;
  description: string | null;
  status: boolean;
};

const toRole = (record: RoleRecord): Role => ({
  id: record.id,
  name: record.name,
  description: record.description,
  status: record.status,
});

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === code;

const isRecordNotFound = (error: unknown): boolean => hasErrorCode(error, 'P2025');

const isUniqueViolation = (error: unknown): boolean => hasErrorCode(error, 'P2002');

const isRelationViolation = (error: unknown): boolean => hasErrorCode(error, 'P2003') || hasErrorCode(error, 'P2014');

const NAME_ALREADY_EXISTS_MESSAGE = 'Ya existe un rol con ese nombre';
const ROLE_HAS_USERS_MESSAGE = 'No se puede eliminar el rol porque tiene usuarios';

export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll = async (): Promise<Role[]> => {
    const records = await this.prisma.role.findMany({ orderBy: { id: 'asc' } });
    return records.map(toRole);
  };

  findById = async (id: number): Promise<Role | undefined> => {
    const record = await this.prisma.role.findUnique({ where: { id } });
    return record ? toRole(record) : undefined;
  };

  save = async (newRole: NewRole): Promise<Role> => {
    try {
      const record = await this.prisma.role.create({ data: newRole });
      return toRole(record);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DomainError(NAME_ALREADY_EXISTS_MESSAGE);
      }
      throw error;
    }
  };

  update = async (id: number, data: NewRole): Promise<Role | undefined> => {
    try {
      const record = await this.prisma.role.update({ where: { id }, data });
      return toRole(record);
    } catch (error) {
      if (isRecordNotFound(error)) {
        return undefined;
      }
      if (isUniqueViolation(error)) {
        throw new DomainError(NAME_ALREADY_EXISTS_MESSAGE);
      }
      throw error;
    }
  };

  remove = async (id: number): Promise<boolean> => {
    try {
      await this.prisma.role.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isRecordNotFound(error)) {
        return false;
      }
      if (isRelationViolation(error)) {
        throw new DomainError(ROLE_HAS_USERS_MESSAGE);
      }
      throw error;
    }
  };
}
