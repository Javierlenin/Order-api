import { DomainError } from '../../../shared/DomainError';
import { NotFoundError } from '../../../shared/NotFoundError';
import { Customer, NewCustomer } from '../domain/Customer';
import { CustomerRepository } from '../ports/CustomerRepository';
import { CustomerService } from './CustomerService';

class FakeCustomerRepository implements CustomerRepository {
  private customers: Customer[] = [];
  private nextId = 1;

  findAll = async (search?: string): Promise<Customer[]> =>
    this.customers.filter((customer) =>
      search
        ? [customer.identification, customer.name, customer.phone ?? ''].some((field) =>
            field.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
          )
        : true,
    );

  findById = async (id: number): Promise<Customer | undefined> => this.customers.find(({ id: customerId }) => customerId === id);

  save = async (newCustomer: NewCustomer): Promise<Customer> => {
    if (this.customers.some(({ identification }) => identification === newCustomer.identification)) {
      throw new DomainError('La identificación ya está registrada');
    }
    const now = new Date();
    const customer = { id: this.nextId++, ...newCustomer, createdAt: now, updatedAt: now };
    this.customers.push(customer);
    return customer;
  };

  update = async (id: number, data: NewCustomer): Promise<Customer | undefined> => {
    const current = await this.findById(id);
    if (!current) {
      return undefined;
    }
    if (this.customers.some((customer) => customer.id !== id && customer.identification === data.identification)) {
      throw new DomainError('La identificación ya está registrada');
    }
    const updated = { ...current, ...data, updatedAt: new Date() };
    this.customers = this.customers.map((customer) => (customer.id === id ? updated : customer));
    return updated;
  };

  updateStatus = async (id: number, status: boolean): Promise<Customer | undefined> => {
    const current = await this.findById(id);
    if (!current) {
      return undefined;
    }
    const updated = { ...current, status, updatedAt: new Date() };
    this.customers = this.customers.map((customer) => (customer.id === id ? updated : customer));
    return updated;
  };
}

const validInput = {
  identification: '  0102030405 ',
  name: '  Ana Ruiz ',
  email: 'ana@example.com',
  phone: '555-0134',
  address: 'Calle 1',
};

const createService = (): CustomerService => new CustomerService(new FakeCustomerRepository());

describe('CustomerService', () => {
  it('creates customers with normalized fields and a default active status', async () => {
    const customer = await createService().create(validInput);

    expect(customer).toMatchObject({
      id: 1,
      identification: '0102030405',
      name: 'Ana Ruiz',
      status: true,
    });
  });

  it('requires an identification and name and rejects duplicate identification', async () => {
    const service = createService();
    await expect(service.create({ ...validInput, name: ' ' })).rejects.toThrow(DomainError);
    await service.create(validInput);
    await expect(service.create(validInput)).rejects.toThrow('La identificación ya está registrada');
  });

  it('searches by identification, name, and phone', async () => {
    const service = createService();
    await service.create(validInput);

    expect(await service.list('01020')).toHaveLength(1);
    expect(await service.list('ana')).toHaveLength(1);
    expect(await service.list('0134')).toHaveLength(1);
  });

  it('updates customer data and activates or inactivates the record', async () => {
    const service = createService();
    const created = await service.create(validInput);
    const updated = await service.update(created.id, { ...validInput, name: 'Ana Pérez' });
    const inactive = await service.setStatus(created.id, { status: false });

    expect(updated.name).toBe('Ana Pérez');
    expect(inactive.status).toBe(false);
    await expect(service.setStatus(created.id, { status: 'false' })).rejects.toThrow(DomainError);
  });

  it('returns not found for missing customers', async () => {
    const service = createService();
    await expect(service.getById(99)).rejects.toThrow(NotFoundError);
    await expect(service.update(99, validInput)).rejects.toThrow(NotFoundError);
  });
});
