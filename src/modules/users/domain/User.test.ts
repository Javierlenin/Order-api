import { DomainError } from '../../../shared/DomainError';
import { parseNewUser } from './User';

const validInput = { roleId: 1, name: ' Ana Ruiz ', email: ' ana@example.com ', password: 'secreto', status: true };

describe('parseNewUser', () => {
  it('returns the user with trimmed name and email', () => {
    expect(parseNewUser(validInput)).toEqual({
      roleId: 1,
      name: 'Ana Ruiz',
      email: 'ana@example.com',
      password: 'secreto',
      status: true,
    });
  });

  it('uses active status when it is omitted', () => {
    const { status: _status, ...withoutStatus } = validInput;

    expect(parseNewUser(withoutStatus).status).toBe(true);
  });

  it('throws when a required field is missing', () => {
    expect(() => parseNewUser({ roleId: 1, name: 'Ana Ruiz' })).toThrow(DomainError);
  });

  it('throws when the email has no @', () => {
    expect(() => parseNewUser({ ...validInput, email: 'ana.example.com' })).toThrow('El correo no es válido');
  });

  it('throws when the role id is not a positive integer', () => {
    expect(() => parseNewUser({ ...validInput, roleId: 0 })).toThrow('El rol es obligatorio');
  });
});
