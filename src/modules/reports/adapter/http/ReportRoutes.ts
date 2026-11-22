import { Router } from 'express';
import { DomainError } from '../../../../shared/DomainError';
import HTTP_STATUS from '../../../../shared/httpStatus';
import { parseStockQuery } from '../../domain/StockReport';
import { ReportService } from '../../application/ReportService';

const parseId = (value: string): number => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new DomainError('El identificador no es válido');
  }

  return id;
};

export const createReportRouter = (service: ReportService): Router => {
  const router = Router();

  router.get('/stock/:productId', async (req, res) => {
    const report = await service.getProductReport(parseId(req.params.productId), parseStockQuery(req.query));
    res.status(HTTP_STATUS.OK).json(report);
  });

  return router;
};
