import { ok } from '../utils/response.js';
import { documentService } from '../services/documentService.js';

export const blockController = {
  create: async (req, res) => ok(res, await documentService.addBlock(req.user, req.params.id, req.body), 201),
  update: async (req, res) =>
    ok(res, await documentService.updateBlock(req.user, req.params.id, req.params.blockId, req.body)),
  remove: async (req, res) => ok(res, await documentService.removeBlock(req.user, req.params.id, req.params.blockId)),
  reorder: async (req, res) => ok(res, await documentService.reorderBlocks(req.user, req.params.id, req.body.items)),
};
