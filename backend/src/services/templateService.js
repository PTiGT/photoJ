import { randomUUID } from 'node:crypto';
import { prisma } from '../utils/prisma.js';
import { HttpError } from '../utils/httpError.js';
import { templateRepository } from '../repositories/templateRepository.js';
import { blockRepository } from '../repositories/blockRepository.js';
import { normalizeBlocks, cloneBlocks, sortDepthFirst } from '../domain/blockTree.js';
import { blankBlueprint } from '../domain/blueprints/index.js';
import { flattenBlueprint } from '../domain/blueprints/builder.js';
import { getOwnedDocument } from './accessService.js';

const isAdmin = (user) => user.role === 'ADMIN';

/** System templates are managed by admins; custom ones by their owners. */
function canEdit(user, template) {
  return template.isSystem ? isAdmin(user) : template.ownerId === user.id;
}

async function getVisible(user, id) {
  const template = await templateRepository.findById(id);
  if (!template || !(template.isSystem || template.ownerId === user.id || isAdmin(user))) {
    throw HttpError.notFound('Шаблон не найден');
  }
  return template;
}

async function getEditable(user, id) {
  const template = await getVisible(user, id);
  if (!canEdit(user, template)) throw HttpError.forbidden('Нет прав на изменение этого шаблона');
  return template;
}

export const templateService = {
  async list(user, { docType }) {
    const templates = await templateRepository.listVisible(user.id, docType);
    return templates.map((template) => ({ ...template, canEdit: canEdit(user, template) }));
  },

  async get(user, id) {
    const template = await getVisible(user, id);
    const blocks = sortDepthFirst(await templateRepository.blocks(id));
    return { ...template, blocks, canEdit: canEdit(user, template) };
  },

  async create(user, { name, description, docType, blocks, fromDocumentId, isSystem = false }) {
    if (isSystem && !isAdmin(user)) throw HttpError.forbidden('Только администратор может создавать системные шаблоны');

    let source = blocks;
    if (fromDocumentId) {
      const document = await getOwnedDocument(user, fromDocumentId);
      if (document.type !== docType) throw HttpError.badRequest('Тип шаблона не совпадает с типом документа');
      source = cloneBlocks(await blockRepository.listByDocument(fromDocumentId), randomUUID);
    }
    const normalized = normalizeBlocks(source ?? flattenBlueprint(blankBlueprint()));

    const template = await prisma.$transaction(async (tx) => {
      const created = await templateRepository.create(
        { name, description, docType, isSystem, ownerId: isSystem ? null : user.id },
        tx,
      );
      await templateRepository.replaceBlocks(created.id, normalized, tx);
      return created;
    });
    return this.get(user, template.id);
  },

  async update(user, id, { name, description, blocks }) {
    await getEditable(user, id);
    const normalized = blocks ? normalizeBlocks(blocks) : null;
    await prisma.$transaction(async (tx) => {
      await templateRepository.update(id, { name, description, updatedAt: new Date() }, tx);
      if (normalized) await templateRepository.replaceBlocks(id, normalized, tx);
    });
    return this.get(user, id);
  },

  async remove(user, id) {
    const template = await getEditable(user, id);
    if (template.isSystem && template.isDefault) {
      throw HttpError.badRequest('Базовый шаблон типа документа нельзя удалить');
    }
    await templateRepository.delete(id);
    return { id };
  },
};
