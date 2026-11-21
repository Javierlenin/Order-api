import { NewUser, User } from '../domain/User';

export interface UserRepository {
  findAll: () => Promise<User[]>;
  findById: (id: number) => Promise<User | undefined>;
  save: (newUser: NewUser) => Promise<User>;
  update: (id: number, data: NewUser) => Promise<User | undefined>;
  remove: (id: number) => Promise<boolean>;
}
