import { Router } from 'express';
import { DomainError } from '../../../../shared/DomainError';
import HTTP_STATUS from '../../../../shared/httpStatus';
import { RoleService } from '../../application/RoleService';

const parseId = (value: string): number => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new DomainError('El identificador no es válido');
  }

  return id;
};

export const createRoleRouter = (service: RoleService): Router => {
  const router = Router();

  router.get('/', async (_req, res) => {
    const roles = await service.list();
    res.status(HTTP_STATUS.OK).json(roles);
  });

  router.get('/:id', async (req, res) => {
    const role = await service.getById(parseId(req.params.id));
    res.status(HTTP_STATUS.OK).json(role);
  });

  router.post('/', async (req, res) => {
    const role = await service.create(req.body);
    res.status(HTTP_STATUS.CREATED).json(role);
  });

  router.put('/:id', async (req, res) => {
    const role = await service.update(parseId(req.params.id), req.body);
    res.status(HTTP_STATUS.OK).json(role);
  });

  router.delete('/:id', async (req, res) => {
    await service.remove(parseId(req.params.id));
    res.status(HTTP_STATUS.NO_CONTENT).send();
  });

  return router;
};
