import { Router } from 'express';
import HTTP_STATUS from '../../../../shared/httpStatus';
import { AuthService } from '../../application/AuthService';

export const createAuthRouter = (service: AuthService): Router => {
  const router = Router();

  router.post('/login', async (req, res) => {
    const session = await service.login(req.body);
    res.status(HTTP_STATUS.OK).json(session);
  });

  return router;
};
