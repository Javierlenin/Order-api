import { PrismaClient } from '../../../../generated/prisma/client';
import { DomainError } from '../../../../shared/DomainError';
import { Category, NewCategory } from '../../domain/Category';
import { CategoryRepository } from '../../ports/CategoryRepository';

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === code;

const CATEGORY_NAME_ALREADY_EXISTS_MESSAGE = 'El nombre de la categoría ya está registrado';
const CATEGORY_HAS_PRODUCTS_MESSAGE = 'No se puede eliminar la categoría porque tiene productos relacionados';

const isRelationViolation = (error: unknown): boolean => hasErrorCode(error, 'P2003') || hasErrorCode(error, 'P2014');

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll = async (): Promise<Category[]> => this.prisma.category.findMany({ orderBy: { id: 'asc' } });

  findById = async (id: number): Promise<Category | undefined> => {
    const record = await this.prisma.category.findUnique({ where: { id } });
    return record ?? undefined;
  };

  save = async (category: NewCategory): Promise<Category> => {
    try {
      return await this.prisma.category.create({ data: category });
    } catch (error) {
      if (hasErrorCode(error, 'P2002')) {
        throw new DomainError(CATEGORY_NAME_ALREADY_EXISTS_MESSAGE);
      }
      throw error;
    }
  };

  update = async (id: number, category: NewCategory): Promise<Category | undefined> => {
    try {
      return await this.prisma.category.update({ where: { id }, data: { ...category, updatedAt: new Date() } });
    } catch (error) {
      if (hasErrorCode(error, 'P2025')) {
        return undefined;
      }
      if (hasErrorCode(error, 'P2002')) {
        throw new DomainError(CATEGORY_NAME_ALREADY_EXISTS_MESSAGE);
      }
      throw error;
    }
  };

  updateStatus = async (id: number, status: boolean): Promise<Category | undefined> => {
    try {
      return await this.prisma.category.update({ where: { id }, data: { status, updatedAt: new Date() } });
    } catch (error) {
      if (hasErrorCode(error, 'P2025')) {
        return undefined;
      }
      throw error;
    }
  };

  remove = async (id: number): Promise<boolean> => {
    try {
      await this.prisma.category.delete({ where: { id } });
      return true;
    } catch (error) {
      if (hasErrorCode(error, 'P2025')) {
        return false;
      }
      if (isRelationViolation(error)) {
        throw new DomainError(CATEGORY_HAS_PRODUCTS_MESSAGE);
      }
      throw error;
    }
  };
}
