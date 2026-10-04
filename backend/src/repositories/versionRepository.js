import { prisma } from '../utils/prisma.js';

export const versionRepository = {
  list: (documentId) =>
    prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { number: 'desc' },
      select: { id: true, number: true, title: true, createdAt: true, author: { select: { name: true } } },
    }),

  findById: (documentId, id) => prisma.documentVersion.findFirst({ where: { id, documentId } }),

  latest: (documentId, db = prisma) =>
    db.documentVersion.findFirst({ where: { documentId }, orderBy: { number: 'desc' } }),

  create: (data, db = prisma) => db.documentVersion.create({ data }),

  count: () => prisma.documentVersion.count(),
};
