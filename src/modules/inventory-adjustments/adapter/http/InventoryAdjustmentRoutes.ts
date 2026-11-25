import { Router } from 'express';
import { DomainError } from '../../../../shared/DomainError';
import HTTP_STATUS from '../../../../shared/httpStatus';
import { InventoryAdjustmentService } from '../../application/InventoryAdjustmentService';

const parseId = (value: string): number => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new DomainError('El identificador no es válido');
  }

  return id;
};

export const createInventoryAdjustmentRouter = (service: InventoryAdjustmentService): Router => {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.status(HTTP_STATUS.OK).json(await service.list());
  });

  router.get('/:id', async (req, res) => {
    res.status(HTTP_STATUS.OK).json(await service.getById(parseId(req.params.id)));
  });

  router.post('/', async (req, res) => {
    res.status(HTTP_STATUS.CREATED).json(await service.create(req.body));
  });

  return router;
};
