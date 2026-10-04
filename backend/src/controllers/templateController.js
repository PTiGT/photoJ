import { ok } from '../utils/response.js';
import { templateService } from '../services/templateService.js';

export const templateController = {
  list: async (req, res) => ok(res, await templateService.list(req.user, req.validatedQuery)),
  get: async (req, res) => ok(res, await templateService.get(req.user, req.params.id)),
  create: async (req, res) => ok(res, await templateService.create(req.user, req.body), 201),
  update: async (req, res) => ok(res, await templateService.update(req.user, req.params.id, req.body)),
  remove: async (req, res) => ok(res, await templateService.remove(req.user, req.params.id)),
};
