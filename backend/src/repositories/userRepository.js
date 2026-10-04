import { prisma } from '../utils/prisma.js';

const publicSelect = { id: true, email: true, name: true, role: true, createdAt: true };

export const userRepository = {
  findById: (id) => prisma.user.findUnique({ where: { id }, select: publicSelect }),
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  create: (data) => prisma.user.create({ data, select: publicSelect }),
  list: () =>
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { ...publicSelect, _count: { select: { documents: true, templates: true } } },
    }),
  updateRole: (id, role) => prisma.user.update({ where: { id }, data: { role }, select: publicSelect }),
  delete: (id) => prisma.user.delete({ where: { id } }),
  count: () => prisma.user.count(),
  countAdmins: () => prisma.user.count({ where: { role: 'ADMIN' } }),
};
