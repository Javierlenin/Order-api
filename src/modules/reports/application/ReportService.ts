import { NotFoundError } from '../../../shared/NotFoundError';
import {
  buildStockHistory,
  currentStock,
  filterStockEvents,
  ProductStockReport,
  StockEvent,
  StockMovement,
  StockQuery,
} from '../domain/StockReport';
import { ReportRepository } from '../ports/ReportRepository';

const PRODUCT_NOT_FOUND_MESSAGE = 'Producto no encontrado';

const toMovement = (event: StockEvent): StockMovement => ({
  id: event.id,
  origin: event.origin,
  occurredAt: event.occurredAt,
  type: event.type,
  quantity: event.quantity,
  stockBefore: event.stockBefore,
  stockAfter: event.stockAfter,
  userId: event.userId,
  userName: event.userName,
});

export class ReportService {
  constructor(private readonly repository: ReportRepository) {}

  getProductReport = async (productId: number, query: StockQuery): Promise<ProductStockReport> => {
    const product = await this.repository.findProduct(productId);

    if (!product) {
      throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    }

    const events = buildStockHistory(
      await this.repository.listAdjustments(productId),
      await this.repository.listMovements(productId),
    );

    return {
      product: {
        id: product.id,
        codeProduct: product.codeProduct,
        name: product.name,
        stock: currentStock(events),
      },
      movements: filterStockEvents(events, query).map(toMovement),
    };
  };
}
