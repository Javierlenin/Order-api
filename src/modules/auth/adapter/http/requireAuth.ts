import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../../../../shared/UnauthorizedError';
import { AuthIdentity } from '../../domain/Credentials';
import { AuthService } from '../../application/AuthService';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthIdentity;
    }
  }
}

export const requireAuth = (service: AuthService) => (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';

  if (!token) {
    next(new UnauthorizedError('No autorizado'));
    return;
  }

  try {
    req.auth = service.verify(token);
    next();
  } catch (error) {
    next(error);
  }
};
