import { Router } from 'express';
import { DomainError } from '../../../../shared/DomainError';
import HTTP_STATUS from '../../../../shared/httpStatus';
import { UserService } from '../../application/UserService';

const parseId = (value: string): number => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new DomainError('El identificador no es válido');
  }

  return id;
};

export const createUserRouter = (service: UserService): Router => {
  const router = Router();

  router.get('/', async (_req, res) => {
    const users = await service.list();
    res.status(HTTP_STATUS.OK).json(users);
  });

  router.get('/:id', async (req, res) => {
    const user = await service.getById(parseId(req.params.id));
    res.status(HTTP_STATUS.OK).json(user);
  });

  router.post('/', async (req, res) => {
    const user = await service.create(req.body);
    res.status(HTTP_STATUS.CREATED).json(user);
  });

  router.put('/:id', async (req, res) => {
    const user = await service.update(parseId(req.params.id), req.body);
    res.status(HTTP_STATUS.OK).json(user);
  });

  router.delete('/:id', async (req, res) => {
    await service.remove(parseId(req.params.id));
    res.status(HTTP_STATUS.NO_CONTENT).send();
  });

  return router;
};
