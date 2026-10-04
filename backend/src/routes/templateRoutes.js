import { Router } from 'express';
import { templateController } from '../controllers/templateController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { createTemplateSchema, idParam, listTemplatesQuery, updateTemplateSchema } from '../validators/schemas.js';

export const templateRoutes = Router();
templateRoutes.use(requireAuth);

templateRoutes.get('/', validate(listTemplatesQuery, 'query'), templateController.list);
templateRoutes.post('/', validate(createTemplateSchema), templateController.create);
templateRoutes.get('/:id', validate(idParam, 'params'), templateController.get);
templateRoutes.put('/:id', validate(idParam, 'params'), validate(updateTemplateSchema), templateController.update);
templateRoutes.delete('/:id', validate(idParam, 'params'), templateController.remove);
