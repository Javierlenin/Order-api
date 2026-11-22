import type { Request, Response } from 'express';
import { DomainError } from './DomainError';
import { errorHandler } from './httpErrorHandlers';
import { NotFoundError } from './NotFoundError';
import { UnauthorizedError } from './UnauthorizedError';

const invoke = (err: Error & { status?: number }) => {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
    },
  };

  errorHandler(err, {} as Request, res as unknown as Response, () => undefined);
  return res;
};

describe('errorHandler', () => {
  it('maps NotFoundError to 404 with its message', () => {
    const res = invoke(new NotFoundError('Pedido no encontrado'));

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Pedido no encontrado' });
  });

  it('maps DomainError to 400 with its message', () => {
    const res = invoke(new DomainError('El total debe ser mayor que 0'));

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'El total debe ser mayor que 0' });
  });

  it('maps UnauthorizedError to 401 with its message', () => {
    const res = invoke(new UnauthorizedError('No autorizado'));

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'No autorizado' });
  });

  it('hides unexpected errors behind a generic 500', () => {
    const res = invoke(new Error('detalle interno'));

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Error interno del servidor' });
  });
});
