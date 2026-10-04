import { ok } from '../utils/response.js';
import { attachmentService } from '../services/attachmentService.js';

export const attachmentController = {
  upload: async (req, res) => ok(res, await attachmentService.upload(req.user, req.params.id, req.file), 201),
};
