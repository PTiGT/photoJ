import { prisma } from '../utils/prisma.js';

export const favoriteRepository = {
  add: (userId, documentId) =>
    prisma.documentFavorite.upsert({
      where: { userId_documentId: { userId, documentId } },
      create: { userId, documentId },
      update: {},
    }),
  remove: (userId, documentId) => prisma.documentFavorite.deleteMany({ where: { userId, documentId } }),
  exists: async (userId, documentId) =>
    Boolean(await prisma.documentFavorite.findUnique({ where: { userId_documentId: { userId, documentId } } })),
};
