import { ok } from '../utils/response.js';
import { authService } from '../services/authService.js';

export const authController = {
  register: async (req, res) => ok(res, await authService.register(req.body), 201),
  login: async (req, res) => ok(res, await authService.login(req.body)),
  me: async (req, res) => ok(res, { user: req.user }),
};
