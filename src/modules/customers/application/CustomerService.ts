import { NotFoundError } from '../../../shared/NotFoundError';
import { parseCustomerStatus, parseNewCustomer, Customer } from '../domain/Customer';
import { CustomerRepository } from '../ports/CustomerRepository';

const CUSTOMER_NOT_FOUND_MESSAGE = 'Cliente no encontrado';

export class CustomerService {
  constructor(private readonly repository: CustomerRepository) {}

  list = async (search?: string): Promise<Customer[]> => this.repository.findAll(search?.trim() || undefined);

  getById = async (id: number): Promise<Customer> => {
    const customer = await this.repository.findById(id);
    if (!customer) {
      throw new NotFoundError(CUSTOMER_NOT_FOUND_MESSAGE);
    }
    return customer;
  };

  create = async (input: unknown): Promise<Customer> => this.repository.save(parseNewCustomer(input));

  update = async (id: number, input: unknown): Promise<Customer> => {
    const customer = await this.repository.update(id, parseNewCustomer(input));
    if (!customer) {
      throw new NotFoundError(CUSTOMER_NOT_FOUND_MESSAGE);
    }
    return customer;
  };

  setStatus = async (id: number, input: unknown): Promise<Customer> => {
    const customer = await this.repository.updateStatus(id, parseCustomerStatus(input));
    if (!customer) {
      throw new NotFoundError(CUSTOMER_NOT_FOUND_MESSAGE);
    }
    return customer;
  };
}
