import { HttpError } from '../utils/httpError.js';
import { userRepository } from '../repositories/userRepository.js';
import { documentRepository } from '../repositories/documentRepository.js';
import { templateRepository } from '../repositories/templateRepository.js';
import { versionRepository } from '../repositories/versionRepository.js';
import { DOCUMENT_TYPES } from '../domain/documentTypes.js';

export const adminService = {
  async stats() {
    const [users, documents, byType, systemTemplates, customTemplates, versions] = await Promise.all([
      userRepository.count(),
      documentRepository.count(),
      documentRepository.countByType(),
      templateRepository.countSystem(),
      templateRepository.countCustom(),
      versionRepository.count(),
    ]);
    const documentsByType = Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, 0]));
    for (const row of byType) documentsByType[row.type] = row._count._all;
    return { users, documents, documentsByType, systemTemplates, customTemplates, versions };
  },

  async listUsers() {
    const users = await userRepository.list();
    return users.map(({ _count, ...user }) => ({ ...user, documentsCount: _count.documents, templatesCount: _count.templates }));
  },

  async updateRole(actor, id, role) {
    if (actor.id === id && role !== 'ADMIN') throw HttpError.badRequest('Нельзя снять роль администратора с самого себя');
    const user = await userRepository.findById(id);
    if (!user) throw HttpError.notFound('Пользователь не найден');
    return userRepository.updateRole(id, role);
  },

  async deleteUser(actor, id) {
    if (actor.id === id) throw HttpError.badRequest('Нельзя удалить собственный аккаунт');
    const user = await userRepository.findById(id);
    if (!user) throw HttpError.notFound('Пользователь не найден');
    await userRepository.delete(id);
    return { id };
  },
};
