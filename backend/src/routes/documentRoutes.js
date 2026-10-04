import { Router } from 'express';
import { z } from 'zod';
import { documentController } from '../controllers/documentController.js';
import { blockController } from '../controllers/blockController.js';
import { versionController } from '../controllers/versionController.js';
import { exportController } from '../controllers/exportController.js';
import { attachmentController } from '../controllers/attachmentController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { BULK_EXPORT_FORMATS, EXPORT_FORMATS } from '../services/export/exportService.js';
import {
  createBlockSchema,
  createDocumentSchema,
  listDocumentsQuery,
  reorderBlocksSchema,
  updateBlockSchema,
  updateDocumentSchema,
} from '../validators/schemas.js';

const uuid = z.string().uuid('некорректный идентификатор');
const docParams = z.object({ id: uuid });
const blockParams = z.object({ id: uuid, blockId: uuid });
const versionParams = z.object({ id: uuid, versionId: uuid });
const exportParams = z.object({ id: uuid, format: z.enum(EXPORT_FORMATS, { message: 'неподдерживаемый формат' }) });
const bulkExportParams = z.object({ format: z.enum(BULK_EXPORT_FORMATS, { message: 'массовый экспорт доступен только в xlsx' }) });
const bulkExportBody = z.object({ ids: z.array(uuid).min(1, 'выберите документы').max(100) });

export const documentRoutes = Router();
documentRoutes.use(requireAuth);

documentRoutes.get('/', validate(listDocumentsQuery, 'query'), documentController.list);
documentRoutes.post('/export/:format', validate(bulkExportParams, 'params'), validate(bulkExportBody), exportController.exportMany);
documentRoutes.post('/', validate(createDocumentSchema), documentController.create);
documentRoutes.get('/:id', validate(docParams, 'params'), documentController.get);
documentRoutes.put('/:id', validate(docParams, 'params'), validate(updateDocumentSchema), documentController.update);
documentRoutes.delete('/:id', validate(docParams, 'params'), documentController.remove);
documentRoutes.post('/:id/duplicate', validate(docParams, 'params'), documentController.duplicate);
documentRoutes.post('/:id/favorite', validate(docParams, 'params'), documentController.favorite);
documentRoutes.delete('/:id/favorite', validate(docParams, 'params'), documentController.unfavorite);

// Blocks — `reorder` must be declared before `/:blockId`
documentRoutes.put('/:id/blocks/reorder', validate(docParams, 'params'), validate(reorderBlocksSchema), blockController.reorder);
documentRoutes.post('/:id/blocks', validate(docParams, 'params'), validate(createBlockSchema), blockController.create);
documentRoutes.put('/:id/blocks/:blockId', validate(blockParams, 'params'), validate(updateBlockSchema), blockController.update);
documentRoutes.delete('/:id/blocks/:blockId', validate(blockParams, 'params'), blockController.remove);

documentRoutes.get('/:id/versions', validate(docParams, 'params'), versionController.list);
documentRoutes.get('/:id/versions/:versionId', validate(versionParams, 'params'), versionController.get);

documentRoutes.post('/:id/export/:format', validate(exportParams, 'params'), exportController.export);

documentRoutes.post('/:id/attachments', validate(docParams, 'params'), upload.single('file'), attachmentController.upload);
