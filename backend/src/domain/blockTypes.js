import { z } from 'zod';

/** All block kinds supported by the builder. Mirrors the Prisma BlockType enum. */
export const BLOCK_TYPES = [
  'TEXT',
  'HEADING',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'CHECKBOX',
  'RADIO',
  'STEP',
  'STEP_GROUP',
  'SECTION',
  'TABLE',
  'IMAGE',
  'ATTACHMENT',
  'SEVERITY',
  'PRIORITY',
  'ENVIRONMENT',
  'STATUS',
  'COMMENT',
  'RUN_INFO',
];

export const SEVERITY_VALUES = ['Blocker', 'Critical', 'Major', 'Minor', 'Trivial'];
export const PRIORITY_VALUES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
export const CHECK_STATUSES = ['none', 'passed', 'failed', 'blocked', 'skipped'];

/**
 * Which child block types a container accepts. Types not listed are leaves.
 * `ROOT` describes the top level of a document.
 */
export const ALLOWED_CHILDREN = {
  ROOT: BLOCK_TYPES,
  SECTION: BLOCK_TYPES,
  STEP_GROUP: ['STEP'],
  CHECKBOX: ['CHECKBOX'],
};

export function canContain(parentType, childType) {
  const allowed = ALLOWED_CHILDREN[parentType ?? 'ROOT'];
  return Boolean(allowed && allowed.includes(childType));
}

const str = (max = 20000) => z.string().max(max);
const runResult = z.object({ status: z.enum(CHECK_STATUSES), comment: z.string().max(5000).optional() });
const label = str(300).optional();
const options = z.array(str(300)).max(100).optional();

/**
 * Content schemas per block type. Fields are optional so partially filled
 * blocks can always be saved; unknown keys are stripped.
 */
export const CONTENT_SCHEMAS = {
  TEXT: z.object({ text: str().optional() }),
  HEADING: z.object({ text: str(500).optional(), level: z.number().int().min(1).max(3).optional() }),
  INPUT: z.object({ label, value: str(2000).optional(), placeholder: str(300).optional() }),
  TEXTAREA: z.object({ label, value: str().optional(), placeholder: str(300).optional() }),
  SELECT: z.object({ label, options, value: str(300).optional() }),
  RADIO: z.object({ label, options, value: str(300).optional() }),
  CHECKBOX: z.object({
    label,
    checked: z.boolean().optional(),
    // status/comment of the first (or the only) run — see domain/runs.js
    status: z.enum(CHECK_STATUSES).optional(),
    comment: str(5000).optional(),
    // results of the other runs, keyed by RUN_INFO run id
    results: z.record(str(64), runResult).optional(),
    requirement: str(200).optional(),
    testType: str(100).optional(),
    bugId: str(200).optional(),
  }),
  STEP: z.object({ action: str(5000).optional(), expected: str(5000).optional() }),
  STEP_GROUP: z.object({ title: str(300).optional() }),
  SECTION: z.object({ title: str(300).optional(), description: str(5000).optional() }),
  TABLE: z.object({
    label,
    columns: z.array(str(300)).max(20).optional(),
    rows: z.array(z.array(str(5000)).max(20)).max(500).optional(),
  }),
  IMAGE: z.object({ label, src: str(2048).optional(), caption: str(500).optional(), attachmentId: str(64).optional() }),
  ATTACHMENT: z.object({
    label,
    files: z
      .array(
        z.object({
          id: str(64),
          name: str(500),
          size: z.number().int().nonnegative(),
          mimeType: str(200).optional(),
          url: str(2048),
        }),
      )
      .max(50)
      .optional(),
  }),
  SEVERITY: z.object({ label, value: z.enum(SEVERITY_VALUES).or(z.literal('')).optional() }),
  PRIORITY: z.object({ label, value: z.enum(PRIORITY_VALUES).or(z.literal('')).optional() }),
  ENVIRONMENT: z.object({
    label,
    items: z.array(z.object({ key: str(200), value: str(1000) })).max(50).optional(),
  }),
  STATUS: z.object({ label, options, value: str(300).optional() }),
  COMMENT: z.object({ author: str(200).optional(), text: str().optional() }),
  RUN_INFO: z.object({
    project: str(300).optional(),
    tester: str(200).optional(),
    runs: z
      .array(
        z.object({
          id: str(64),
          environment: str(500).optional(),
          date: str(50).optional(),
          build: str(100).optional(),
          testType: str(100).optional(),
        }),
      )
      .max(20)
      .optional(),
  }),
};

export const settingsSchema = z
  .object({
    collapsed: z.boolean().optional(),
    required: z.boolean().optional(),
    hideLabel: z.boolean().optional(),
  })
  .passthrough();

/** Validates and normalises block content for the given type. */
export function parseContent(type, content) {
  const schema = CONTENT_SCHEMAS[type];
  if (!schema) throw new Error(`Неизвестный тип блока: ${type}`);
  return schema.parse(content ?? {});
}
