import { Router } from 'express';
import HTTP_STATUS from '../../../../shared/httpStatus';
import { AuthService } from '../../application/AuthService';

export const createAuthRouter = (service: AuthService): Router => {
  const router = Router();

  router.post('/login', async (req, res) => {
    const session = await service.login(req.body);
    res.status(HTTP_STATUS.OK).json(session);
  });

  router.post('/register', async (req, res) => {
    const session = await service.register(req.body);
    res.status(HTTP_STATUS.CREATED).json(session);
  });

  return router;
};
