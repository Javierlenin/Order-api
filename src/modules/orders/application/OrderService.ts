import { NotFoundError } from '../../../shared/NotFoundError';
import { Order, parseNewOrder, parseNextStatus } from '../domain/Order';
import { OrderRepository } from '../ports/OrderRepository';

const ORDER_NOT_FOUND_MESSAGE = 'Pedido no encontrado';

export class OrderService {
  constructor(private readonly repository: OrderRepository) {}

  list = async (): Promise<Order[]> => this.repository.findAll();

  getById = async (id: number): Promise<Order> => {
    const order = await this.repository.findById(id);

    if (!order) {
      throw new NotFoundError(ORDER_NOT_FOUND_MESSAGE);
    }

    return order;
  };

  create = async (input: unknown): Promise<Order> => this.repository.save(parseNewOrder(input));

  update = async (id: number, input: unknown): Promise<Order> => {
    const order = await this.repository.update(id, parseNewOrder(input));

    if (!order) {
      throw new NotFoundError(ORDER_NOT_FOUND_MESSAGE);
    }

    return order;
  };

  changeStatus = async (id: number, input: unknown): Promise<Order> => {
    const order = await this.repository.changeStatus(id, parseNextStatus(input));

    if (!order) {
      throw new NotFoundError(ORDER_NOT_FOUND_MESSAGE);
    }

    return order;
  };

  remove = async (id: number): Promise<void> => {
    const removed = await this.repository.remove(id);

    if (!removed) {
      throw new NotFoundError(ORDER_NOT_FOUND_MESSAGE);
    }
  };
}
