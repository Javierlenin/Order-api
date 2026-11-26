import { Customer, NewCustomer } from '../domain/Customer';

export interface CustomerRepository {
  findAll: (search?: string) => Promise<Customer[]>;
  findById: (id: number) => Promise<Customer | undefined>;
  save: (customer: NewCustomer) => Promise<Customer>;
  update: (id: number, customer: NewCustomer) => Promise<Customer | undefined>;
  updateStatus: (id: number, status: boolean) => Promise<Customer | undefined>;
  remove: (id: number) => Promise<boolean>;
}
