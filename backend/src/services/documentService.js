import { randomUUID } from 'node:crypto';
import { prisma } from '../utils/prisma.js';
import { HttpError } from '../utils/httpError.js';
import { documentRepository } from '../repositories/documentRepository.js';
import { blockRepository } from '../repositories/blockRepository.js';
import { templateRepository } from '../repositories/templateRepository.js';
import { favoriteRepository } from '../repositories/favoriteRepository.js';
import { versionRepository } from '../repositories/versionRepository.js';
import { normalizeBlocks, cloneBlocks, sortDepthFirst } from '../domain/blockTree.js';
import { BLUEPRINTS, blankBlueprint } from '../domain/blueprints/index.js';
import { flattenBlueprint } from '../domain/blueprints/builder.js';
import { DOCUMENT_TYPE_LABELS } from '../domain/documentTypes.js';
import { getOwnedDocument } from './accessService.js';
import { versionService } from './versionService.js';

async function resolveInitialBlocks(user, { type, templateId, blank }, title) {
  if (templateId) {
    const template = await templateRepository.findById(templateId);
    const visible = template && (template.isSystem || template.ownerId === user.id);
    if (!visible) throw HttpError.notFound('Шаблон не найден');
    if (template.docType !== type) throw HttpError.badRequest('Шаблон предназначен для другого типа документа');
    return cloneBlocks(await templateRepository.blocks(template.id), randomUUID);
  }
  if (blank) return flattenBlueprint(blankBlueprint());

  const fallback = await templateRepository.findDefault(type);
  if (fallback) return cloneBlocks(await templateRepository.blocks(fallback.id), randomUUID);
  return flattenBlueprint(BLUEPRINTS.find((bp) => bp.docType === type && bp.isDefault).blocks);
}

/** Creates a document with its blocks and the first version in one transaction. */
async function createWithBlocks({ ownerId, title, type, blocks }) {
  const normalized = normalizeBlocks(blocks);
  return prisma.$transaction(async (tx) => {
    const document = await documentRepository.create({ ownerId, title, type }, tx);
    await blockRepository.replaceAll(document.id, normalized, tx);
    await versionService.snapshot(tx, { documentId: document.id, authorId: ownerId, title, blocks: normalized, force: true });
    return document;
  });
}

export const documentService = {
  list: (user, query) => documentRepository.listForUser(user.id, query),

  async get(user, id) {
    await getOwnedDocument(user, id);
    const [summary, blocks, latest] = await Promise.all([
      documentRepository.findSummary(id, user.id),
      blockRepository.listByDocument(id),
      versionRepository.latest(id),
    ]);
    return { ...summary, blocks: sortDepthFirst(blocks), latestVersion: latest?.number ?? 0 };
  },

  async create(user, input) {
    const title = input.title ?? `${DOCUMENT_TYPE_LABELS[input.type]} без названия`;
    const blocks = await resolveInitialBlocks(user, input, title);
    const document = await createWithBlocks({ ownerId: user.id, title, type: input.type, blocks });
    return this.get(user, document.id);
  },

  async duplicate(user, id) {
    const source = await getOwnedDocument(user, id);
    const blocks = cloneBlocks(await blockRepository.listByDocument(id), randomUUID);
    const title = `${source.title} (копия)`.slice(0, 200);
    const document = await createWithBlocks({ ownerId: user.id, title, type: source.type, blocks });
    return documentRepository.findSummary(document.id, user.id);
  },

  /**
   * Saves title and/or the whole block tree (used by autosave).
   * `createVersion` marks a manual save which always produces a new version.
   */
  async update(user, id, { title, blocks, createVersion = false }) {
    const document = await getOwnedDocument(user, id);
    const normalized = blocks ? normalizeBlocks(blocks) : null;

    const { updated, version } = await prisma.$transaction(async (tx) => {
      if (normalized) await blockRepository.replaceAll(id, normalized, tx);
      const updated = await documentRepository.update(id, { title: title ?? document.title, updatedAt: new Date() }, tx);
      const snapshotBlocks = normalized ?? sortDepthFirst(await blockRepository.listByDocument(id, tx));
      const version = await versionService.snapshot(tx, {
        documentId: id,
        authorId: user.id,
        title: updated.title,
        blocks: snapshotBlocks,
        force: createVersion,
      });
      return { updated, version };
    });

    return {
      id,
      title: updated.title,
      updatedAt: updated.updatedAt,
      latestVersion: version.number,
      versionCreatedAt: version.createdAt,
    };
  },

  async remove(user, id) {
    await getOwnedDocument(user, id);
    await documentRepository.delete(id);
    return { id };
  },

  async setFavorite(user, id, isFavorite) {
    await getOwnedDocument(user, id);
    if (isFavorite) await favoriteRepository.add(user.id, id);
    else await favoriteRepository.remove(user.id, id);
    return { id, isFavorite };
  },

  // ── Block-level operations ─────────────────────────────────────

  async addBlock(user, documentId, input) {
    await getOwnedDocument(user, documentId);
    const existing = await blockRepository.listByDocument(documentId);
    const block = { ...input, id: input.id ?? randomUUID(), parentId: input.parentId ?? null };
    if (existing.some((b) => b.id === block.id)) throw HttpError.conflict('Блок с таким id уже существует');

    // Insert at the requested position by shifting following siblings.
    const shifted = existing.map((b) =>
      (b.parentId ?? null) === block.parentId && b.order >= block.order ? { ...b, order: b.order + 1 } : b,
    );
    const normalized = normalizeBlocks([...shifted, block]);
    await prisma.$transaction(async (tx) => {
      await blockRepository.replaceAll(documentId, normalized, tx);
      await documentRepository.touch(documentId, tx);
    });
    return normalized.find((b) => b.id === block.id);
  },

  async updateBlock(user, documentId, blockId, { content, settings }) {
    await getOwnedDocument(user, documentId);
    const block = await blockRepository.findById(documentId, blockId);
    if (!block) throw HttpError.notFound('Блок не найден');

    const [validated] = normalizeBlocks([
      {
        ...block,
        parentId: null,
        content: content ? { ...block.content, ...content } : block.content,
        settings: settings ? { ...block.settings, ...settings } : block.settings,
      },
    ]).filter((b) => b.id === blockId);

    const updated = await blockRepository.update(blockId, { content: validated.content, settings: validated.settings });
    await documentRepository.touch(documentId);
    return updated;
  },

  async removeBlock(user, documentId, blockId) {
    await getOwnedDocument(user, documentId);
    const block = await blockRepository.findById(documentId, blockId);
    if (!block) throw HttpError.notFound('Блок не найден');

    await prisma.$transaction(async (tx) => {
      await blockRepository.delete(blockId, tx);
      const siblings = (await blockRepository.listByDocument(documentId, tx)).filter(
        (b) => (b.parentId ?? null) === (block.parentId ?? null),
      );
      await blockRepository.updatePositions(
        siblings.sort((a, b) => a.order - b.order).map((b, order) => ({ id: b.id, parentId: b.parentId, order })),
        tx,
      );
      await documentRepository.touch(documentId, tx);
    });
    return { id: blockId };
  },

  async reorderBlocks(user, documentId, items) {
    await getOwnedDocument(user, documentId);
    const existing = await blockRepository.listByDocument(documentId);
    const byId = new Map(existing.map((b) => [b.id, b]));
    for (const item of items) {
      if (!byId.has(item.id)) throw HttpError.badRequest(`Блок ${item.id} не принадлежит документу`);
      byId.set(item.id, { ...byId.get(item.id), parentId: item.parentId, order: item.order });
    }

    const normalized = normalizeBlocks([...byId.values()]);
    await prisma.$transaction(async (tx) => {
      await blockRepository.updatePositions(
        normalized.map(({ id, parentId, order }) => ({ id, parentId, order })),
        tx,
      );
      await documentRepository.touch(documentId, tx);
    });
    return normalized;
  },
};
