import { DomainError } from '../../../shared/DomainError';
import { parseLoginCredentials } from './Credentials';

describe('parseLoginCredentials', () => {
  it('returns the trimmed email and the password', () => {
    expect(parseLoginCredentials({ email: ' ana@example.com ', password: 'secreto' })).toEqual({
      email: 'ana@example.com',
      password: 'secreto',
    });
  });

  it('throws when email or password is missing', () => {
    expect(() => parseLoginCredentials({ email: 'ana@example.com' })).toThrow(DomainError);
    expect(() => parseLoginCredentials({ password: 'secreto' })).toThrow('El correo y la contraseña son obligatorios');
  });

  it('throws when the email has no @', () => {
    expect(() => parseLoginCredentials({ email: 'ana.example.com', password: 'secreto' })).toThrow('El correo no es válido');
  });
});
