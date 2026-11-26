import { NewOrder, Order, OrderStatus } from '../domain/Order';

export interface OrderRepository {
  findAll: () => Promise<Order[]>;
  findById: (id: number) => Promise<Order | undefined>;
  save: (order: NewOrder) => Promise<Order>;
  update: (id: number, order: NewOrder) => Promise<Order | undefined>;
  changeStatus: (id: number, status: OrderStatus) => Promise<Order | undefined>;
  remove: (id: number) => Promise<boolean>;
}
