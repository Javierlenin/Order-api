import { NextFunction, Request, Response } from 'express';

import { DomainError } from './DomainError';
import HTTP_STATUS from './httpStatus';
import { NotFoundError } from './NotFoundError';
import { UnauthorizedError } from './UnauthorizedError';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Ruta no encontrada' });
};

export const errorHandler = (
  err: Error & { status?: number },
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof NotFoundError) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: err.message });
    return;
  }

  if (err instanceof UnauthorizedError) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: err.message });
    return;
  }

  if (err instanceof DomainError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: err.message });
    return;
  }

  const status = err.status ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;

  if (status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    console.error(err);
  }

  res.status(status).json({
    error: status < HTTP_STATUS.INTERNAL_SERVER_ERROR ? 'La petición no es válida' : 'Error interno del servidor',
  });
};
