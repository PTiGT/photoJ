import { userRepository } from '../repositories/userRepository.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/token.js';
import { HttpError } from '../utils/httpError.js';

const toPublic = ({ id, email, name, role }) => ({ id, email, name, role });

export const authService = {
  async register({ email, name, password }) {
    if (await userRepository.findByEmail(email)) throw HttpError.conflict('Пользователь с таким email уже существует');
    const user = await userRepository.create({ email, name, passwordHash: await hashPassword(password) });
    return { token: signToken(user), user: toPublic(user) };
  },

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw HttpError.unauthorized('Неверный email или пароль');
    }
    return { token: signToken(user), user: toPublic(user) };
  },
};
