import { prisma } from '../utils/prisma.js';

const blockSelect = { id: true, type: true, order: true, parentId: true, content: true, settings: true };

/** Persists builder blocks. All functions accept an optional transaction client. */
export const blockRepository = {
  listByDocument: (documentId, db = prisma) =>
    db.documentBlock.findMany({ where: { documentId }, orderBy: [{ parentId: 'asc' }, { order: 'asc' }], select: blockSelect }),

  findById: (documentId, id, db = prisma) =>
    db.documentBlock.findFirst({ where: { id, documentId }, select: blockSelect }),

  /** Replaces the whole block tree of a document. Blocks must be parent-first ordered. */
  async replaceAll(documentId, blocks, db = prisma) {
    await db.documentBlock.deleteMany({ where: { documentId } });
    if (blocks.length) {
      await db.documentBlock.createMany({ data: blocks.map((block) => ({ ...block, documentId })) });
    }
  },

  create: (documentId, block, db = prisma) =>
    db.documentBlock.create({ data: { ...block, documentId }, select: blockSelect }),

  update: (id, data, db = prisma) => db.documentBlock.update({ where: { id }, data, select: blockSelect }),

  delete: (id, db = prisma) => db.documentBlock.delete({ where: { id } }),

  updatePositions: (items, db = prisma) =>
    Promise.all(
      items.map(({ id, parentId, order }) => db.documentBlock.update({ where: { id }, data: { parentId, order } })),
    ),
};
