import { AdjustmentLine, MovementLine, ReportProduct } from '../domain/StockReport';

export interface ReportRepository {
  findProduct: (id: number) => Promise<ReportProduct | undefined>;
  listAdjustments: (productId: number) => Promise<AdjustmentLine[]>;
  listMovements: (productId: number) => Promise<MovementLine[]>;
}
