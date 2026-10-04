import { ok } from '../utils/response.js';
import { versionService } from '../services/versionService.js';

export const versionController = {
  list: async (req, res) => ok(res, await versionService.list(req.user, req.params.id)),
  get: async (req, res) => ok(res, await versionService.get(req.user, req.params.id, req.params.versionId)),
};
