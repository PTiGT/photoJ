import { prisma } from '../utils/prisma.js';

const summarySelect = (userId) => ({
  id: true,
  title: true,
  type: true,
  createdAt: true,
  updatedAt: true,
  favorites: { where: { userId }, select: { userId: true } },
  _count: { select: { blocks: true } },
});

const toSummary = ({ favorites, _count, ...doc }) => ({
  ...doc,
  isFavorite: favorites.length > 0,
  blocksCount: _count.blocks,
});

export const documentRepository = {
  async listForUser(userId, { search, type, favorite, limit }) {
    const docs = await prisma.document.findMany({
      where: {
        ownerId: userId,
        ...(type ? { type } : {}),
        ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
        ...(favorite ? { favorites: { some: { userId } } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: summarySelect(userId),
    });
    return docs.map(toSummary);
  },

  findById: (id, db = prisma) => db.document.findUnique({ where: { id } }),

  async findSummary(id, userId) {
    const doc = await prisma.document.findUnique({ where: { id }, select: summarySelect(userId) });
    return doc ? toSummary(doc) : null;
  },

  create: (data, db = prisma) => db.document.create({ data }),

  update: (id, data, db = prisma) => db.document.update({ where: { id }, data }),

  /** Bumps updatedAt after block-level changes. */
  touch: (id, db = prisma) => db.document.update({ where: { id }, data: { updatedAt: new Date() } }),

  delete: (id) => prisma.document.delete({ where: { id } }),

  countByType: () => prisma.document.groupBy({ by: ['type'], _count: { _all: true } }),
  count: () => prisma.document.count(),
};
