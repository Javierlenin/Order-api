import { Router } from 'express';
import HTTP_STATUS from '../../../../shared/httpStatus';
import { parseMovementQuery } from '../../domain/InventoryMovement';
import { InventoryMovementService } from '../../application/InventoryMovementService';

export const createInventoryMovementRouter = (service: InventoryMovementService): Router => {
  const router = Router();

  router.get('/', async (req, res) => {
    res.status(HTTP_STATUS.OK).json(await service.list(parseMovementQuery(req.query)));
  });

  return router;
};
