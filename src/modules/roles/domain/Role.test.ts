import { DomainError } from '../../../shared/DomainError';
import { parseNewRole } from './Role';

describe('parseNewRole', () => {
  it('returns the role with trimmed name and description', () => {
    const result = parseNewRole({ name: '  Administrador ', description: '  Acceso total ', status: true });

    expect(result).toEqual({ name: 'Administrador', description: 'Acceso total', status: true });
  });

  it('uses active status and no description when they are omitted', () => {
    expect(parseNewRole({ name: 'Vendedor' })).toEqual({ name: 'Vendedor', description: null, status: true });
  });

  it('throws when the name is missing', () => {
    expect(() => parseNewRole({ description: 'Sin nombre' })).toThrow(DomainError);
  });

  it('throws when status is not a boolean', () => {
    expect(() => parseNewRole({ name: 'Vendedor', status: 'activo' })).toThrow(DomainError);
  });
});
