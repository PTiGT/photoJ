import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { idParam, updateUserRoleSchema } from '../validators/schemas.js';

export const adminRoutes = Router();
adminRoutes.use(requireAuth, requireAdmin);

adminRoutes.get('/stats', adminController.stats);
adminRoutes.get('/users', adminController.users);
adminRoutes.patch('/users/:id', validate(idParam, 'params'), validate(updateUserRoleSchema), adminController.updateRole);
adminRoutes.delete('/users/:id', validate(idParam, 'params'), adminController.deleteUser);
