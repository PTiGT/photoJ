import { prisma } from '../utils/prisma.js';

const blockSelect = { id: true, type: true, order: true, parentId: true, content: true, settings: true };
const summarySelect = {
  id: true,
  name: true,
  description: true,
  docType: true,
  isSystem: true,
  isDefault: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { blocks: true } },
};

const toSummary = ({ _count, ...template }) => ({ ...template, blocksCount: _count.blocks });

export const templateRepository = {
  async listVisible(userId, docType) {
    const templates = await prisma.template.findMany({
      where: {
        OR: [{ isSystem: true }, { ownerId: userId }],
        ...(docType ? { docType } : {}),
      },
      orderBy: [{ isSystem: 'desc' }, { isDefault: 'desc' }, { createdAt: 'asc' }],
      select: summarySelect,
    });
    return templates.map(toSummary);
  },

  findById: (id, db = prisma) => db.template.findUnique({ where: { id } }),

  findDefault: (docType) => prisma.template.findFirst({ where: { docType, isSystem: true, isDefault: true } }),

  blocks: (templateId, db = prisma) =>
    db.templateBlock.findMany({ where: { templateId }, orderBy: [{ order: 'asc' }], select: blockSelect }),

  create: (data, db = prisma) => db.template.create({ data }),

  update: (id, data, db = prisma) => db.template.update({ where: { id }, data }),

  async replaceBlocks(templateId, blocks, db = prisma) {
    await db.templateBlock.deleteMany({ where: { templateId } });
    if (blocks.length) {
      await db.templateBlock.createMany({ data: blocks.map((block) => ({ ...block, templateId })) });
    }
  },

  delete: (id) => prisma.template.delete({ where: { id } }),

  countSystem: () => prisma.template.count({ where: { isSystem: true } }),
  countCustom: () => prisma.template.count({ where: { isSystem: false } }),
};
