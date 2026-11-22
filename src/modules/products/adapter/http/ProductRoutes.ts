import { Router } from 'express';
import { DomainError } from '../../../../shared/DomainError';
import HTTP_STATUS from '../../../../shared/httpStatus';
import { ProductService } from '../../application/ProductService';

const parseId = (value: string): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new DomainError('El identificador no es válido');
  }
  return id;
};

export const createProductRouter = (service: ProductService): Router => {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.status(HTTP_STATUS.OK).json(await service.list());
  });

  router.get('/:id/stock', async (req, res) => {
    res.status(HTTP_STATUS.OK).json(await service.getStock(parseId(req.params.id)));
  });

  router.get('/:id', async (req, res) => {
    res.status(HTTP_STATUS.OK).json(await service.getById(parseId(req.params.id)));
  });

  router.post('/', async (req, res) => {
    res.status(HTTP_STATUS.CREATED).json(await service.create(req.body));
  });

  router.put('/:id', async (req, res) => {
    res.status(HTTP_STATUS.OK).json(await service.update(parseId(req.params.id), req.body));
  });

  router.patch('/:id/status', async (req, res) => {
    res.status(HTTP_STATUS.OK).json(await service.setStatus(parseId(req.params.id), req.body));
  });

  return router;
};
