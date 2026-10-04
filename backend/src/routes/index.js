import { Router } from 'express';
import { ok } from '../utils/response.js';
import { authRoutes } from './authRoutes.js';
import { documentRoutes } from './documentRoutes.js';
import { templateRoutes } from './templateRoutes.js';
import { adminRoutes } from './adminRoutes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => ok(res, { status: 'ok' }));
apiRouter.use('/auth', authRoutes);
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/templates', templateRoutes);
apiRouter.use('/admin', adminRoutes);
