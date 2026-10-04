import { ok } from '../utils/response.js';
import { documentService } from '../services/documentService.js';

export const documentController = {
  list: async (req, res) => ok(res, await documentService.list(req.user, req.validatedQuery)),
  get: async (req, res) => ok(res, await documentService.get(req.user, req.params.id)),
  create: async (req, res) => ok(res, await documentService.create(req.user, req.body), 201),
  update: async (req, res) => ok(res, await documentService.update(req.user, req.params.id, req.body)),
  remove: async (req, res) => ok(res, await documentService.remove(req.user, req.params.id)),
  duplicate: async (req, res) => ok(res, await documentService.duplicate(req.user, req.params.id), 201),
  favorite: async (req, res) => ok(res, await documentService.setFavorite(req.user, req.params.id, true)),
  unfavorite: async (req, res) => ok(res, await documentService.setFavorite(req.user, req.params.id, false)),
};
