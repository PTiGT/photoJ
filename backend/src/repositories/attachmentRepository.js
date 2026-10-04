import { prisma } from '../utils/prisma.js';

export const attachmentRepository = {
  create: (data) => prisma.attachment.create({ data }),
  findById: (id) => prisma.attachment.findUnique({ where: { id } }),
  findByStorageKey: (storageKey) => prisma.attachment.findUnique({ where: { storageKey } }),
  listByDocument: (documentId) => prisma.attachment.findMany({ where: { documentId } }),
  delete: (id) => prisma.attachment.delete({ where: { id } }),
};
