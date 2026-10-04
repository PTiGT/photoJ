import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './utils/config.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.corsOrigin, exposedHeaders: ['Content-Disposition'] }));
  app.use(express.json({ limit: '5mb' }));
  if (!config.isTest) app.use(morgan('dev'));

  // Uploaded files have random unguessable names and are served statically.
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d', index: false }));
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
