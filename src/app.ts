import express from 'express';
import cors from 'cors';
import { notFoundHandler, errorHandler } from './shared/httpErrorHandlers';
import HTTP_STATUS from './shared/httpStatus';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(HTTP_STATUS.OK).json({ status: 'ok' });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
