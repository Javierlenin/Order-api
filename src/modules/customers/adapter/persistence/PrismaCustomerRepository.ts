import { PrismaClient } from '../../../../generated/prisma/client';
import { DomainError } from '../../../../shared/DomainError';
import { Customer, NewCustomer } from '../../domain/Customer';
import { CustomerRepository } from '../../ports/CustomerRepository';

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === code;

const IDENTIFICATION_ALREADY_EXISTS_MESSAGE = 'La identificación ya está registrada';

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll = async (search?: string): Promise<Customer[]> => {
    const records = await this.prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { identification: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { id: 'asc' },
    });
    return records;
  };

  findById = async (id: number): Promise<Customer | undefined> => {
    const record = await this.prisma.customer.findUnique({ where: { id } });
    return record ?? undefined;
  };

  save = async (customer: NewCustomer): Promise<Customer> => {
    try {
      return await this.prisma.customer.create({ data: customer });
    } catch (error) {
      if (hasErrorCode(error, 'P2002')) {
        throw new DomainError(IDENTIFICATION_ALREADY_EXISTS_MESSAGE);
      }
      throw error;
    }
  };

  update = async (id: number, customer: NewCustomer): Promise<Customer | undefined> => {
    try {
      return await this.prisma.customer.update({ where: { id }, data: { ...customer, updatedAt: new Date() } });
    } catch (error) {
      if (hasErrorCode(error, 'P2025')) {
        return undefined;
      }
      if (hasErrorCode(error, 'P2002')) {
        throw new DomainError(IDENTIFICATION_ALREADY_EXISTS_MESSAGE);
      }
      throw error;
    }
  };

  updateStatus = async (id: number, status: boolean): Promise<Customer | undefined> => {
    try {
      return await this.prisma.customer.update({ where: { id }, data: { status, updatedAt: new Date() } });
    } catch (error) {
      if (hasErrorCode(error, 'P2025')) {
        return undefined;
      }
      throw error;
    }
  };
}
