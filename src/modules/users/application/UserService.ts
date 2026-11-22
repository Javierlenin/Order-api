import { NotFoundError } from '../../../shared/NotFoundError';
import { parseNewUser, User } from '../domain/User';
import { UserRepository } from '../ports/UserRepository';

const USER_NOT_FOUND_MESSAGE = 'Usuario no encontrado';

export class UserService {
  constructor(private readonly repository: UserRepository) {}

  list = async (): Promise<User[]> => this.repository.findAll();

  getById = async (id: number): Promise<User> => {
    const user = await this.repository.findById(id);

    if (!user) {
      throw new NotFoundError(USER_NOT_FOUND_MESSAGE);
    }

    return user;
  };

  create = async (input: unknown): Promise<User> => {
    const newUser = parseNewUser(input);
    return this.repository.save(newUser);
  };

  update = async (id: number, input: unknown): Promise<User> => {
    const data = parseNewUser(input);
    const updated = await this.repository.update(id, data);

    if (!updated) {
      throw new NotFoundError(USER_NOT_FOUND_MESSAGE);
    }

    return updated;
  };

  remove = async (id: number): Promise<void> => {
    const removed = await this.repository.remove(id);

    if (!removed) {
      throw new NotFoundError(USER_NOT_FOUND_MESSAGE);
    }
  };
}
