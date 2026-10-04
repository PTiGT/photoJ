import { z } from 'zod';
import { BLOCK_TYPES } from '../domain/blockTypes.js';
import { DOCUMENT_TYPES } from '../domain/documentTypes.js';

const uuid = z.string().uuid('некорректный идентификатор');
const title = z.string().trim().min(1, 'не может быть пустым').max(200, 'слишком длинное');

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('некорректный email'),
  name: z.string().trim().min(2, 'минимум 2 символа').max(100),
  password: z.string().min(8, 'минимум 8 символов').max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('некорректный email'),
  password: z.string().min(1, 'введите пароль'),
});

export const blockInputSchema = z.object({
  id: uuid,
  type: z.enum(BLOCK_TYPES),
  parentId: uuid.nullable().optional(),
  order: z.number().int().min(0).default(0),
  content: z.record(z.string(), z.unknown()).default({}),
  settings: z.record(z.string(), z.unknown()).default({}),
});

export const blocksSchema = z.array(blockInputSchema).max(2000, 'слишком много блоков');

export const listDocumentsQuery = z.object({
  search: z.string().trim().max(200).optional(),
  type: z.enum(DOCUMENT_TYPES).optional(),
  favorite: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const createDocumentSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  title: title.optional(),
  templateId: uuid.optional(),
  blank: z.boolean().optional(),
});

export const updateDocumentSchema = z.object({
  title: title.optional(),
  blocks: blocksSchema.optional(),
  createVersion: z.boolean().optional(),
});

export const createBlockSchema = blockInputSchema.extend({ id: uuid.optional() });

export const updateBlockSchema = z.object({
  content: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const reorderBlocksSchema = z.object({
  items: z
    .array(z.object({ id: uuid, parentId: uuid.nullable(), order: z.number().int().min(0) }))
    .min(1)
    .max(2000),
});

export const listTemplatesQuery = z.object({ docType: z.enum(DOCUMENT_TYPES).optional() });

export const createTemplateSchema = z
  .object({
    name: title,
    description: z.string().trim().max(500).default(''),
    docType: z.enum(DOCUMENT_TYPES),
    blocks: blocksSchema.optional(),
    fromDocumentId: uuid.optional(),
    isSystem: z.boolean().optional(),
  })
  .refine((v) => !(v.blocks && v.fromDocumentId), { message: 'Укажите blocks или fromDocumentId, но не оба' });

export const updateTemplateSchema = z.object({
  name: title.optional(),
  description: z.string().trim().max(500).optional(),
  blocks: blocksSchema.optional(),
});

export const updateUserRoleSchema = z.object({ role: z.enum(['USER', 'ADMIN']) });

export const idParam = z.object({ id: uuid });
