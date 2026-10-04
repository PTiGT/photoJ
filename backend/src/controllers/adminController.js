import { ok } from '../utils/response.js';
import { adminService } from '../services/adminService.js';

export const adminController = {
  stats: async (_req, res) => ok(res, await adminService.stats()),
  users: async (_req, res) => ok(res, await adminService.listUsers()),
  updateRole: async (req, res) => ok(res, await adminService.updateRole(req.user, req.params.id, req.body.role)),
  deleteUser: async (req, res) => ok(res, await adminService.deleteUser(req.user, req.params.id)),
};
