import { HttpError } from '../utils/httpError.js';
import { verifyToken } from '../utils/token.js';
import { userRepository } from '../repositories/userRepository.js';

/** Requires a valid `Authorization: Bearer <jwt>` header and loads the user. */
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw HttpError.unauthorized();

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw HttpError.unauthorized('Сессия истекла, войдите снова');
  }

  const user = await userRepository.findById(payload.sub);
  if (!user) throw HttpError.unauthorized('Пользователь не найден');
  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (req.user?.role !== role) throw HttpError.forbidden();
    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
