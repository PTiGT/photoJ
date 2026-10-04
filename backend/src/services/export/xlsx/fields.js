import { sortDepthFirst } from '../../../domain/blockTree.js';

/*
 * Field extraction for row-based sheets (test cases, bug reports).
 * Blocks are matched by their label, so renamed or reordered fields
 * still land in the right column; unmatched fields are simply skipped.
 */

const value = (block) => (block?.content?.value ?? '').toString().trim();

export function fieldByLabel(blocks, pattern) {
  return blocks.find((b) => ['INPUT', 'TEXTAREA', 'SELECT', 'RADIO', 'STATUS'].includes(b.type) && pattern.test(b.content?.label ?? ''));
}

export const textOf = (blocks, pattern) => value(fieldByLabel(blocks, pattern));

export function summaryOf(blocks, fallback) {
  const titled = blocks.find((b) => b.type === 'INPUT' && /^(title|summary|заголовок|название|summary)/i.test(b.content?.label ?? ''));
  return value(titled) || value(blocks.find((b) => b.type === 'INPUT')) || fallback;
}

const numbered = (lines) =>
  lines
    .map((line, i) => `${i + 1}. ${line}`.trimEnd())
    .join('\n');

/** Steps (actions) and expected results as two numbered lists. */
export function stepsOf(blocks) {
  const steps = sortDepthFirst(blocks).filter((b) => b.type === 'STEP');
  return {
    steps: numbered(steps.map((s) => (s.content?.action ?? '').trim())),
    expected: numbered(steps.map((s) => (s.content?.expected ?? '').trim())),
    count: steps.length,
  };
}

export const typedValue = (blocks, type) => (blocks.find((b) => b.type === type)?.content?.value ?? '').toString();

export function environmentOf(blocks) {
  const env = blocks.find((b) => b.type === 'ENVIRONMENT');
  return (env?.content?.items ?? [])
    .filter((item) => item.value)
    .map((item) => `${item.key}: ${item.value}`.trim())
    .join('\n');
}

export function attachmentsOf(blocks, absoluteUrl) {
  return blocks
    .filter((b) => b.type === 'ATTACHMENT')
    .flatMap((b) => b.content?.files ?? [])
    .map((file) => `${file.name} — ${absoluteUrl(file.url)}`)
    .join('\n');
}

export function commentsOf(blocks) {
  return blocks
    .filter((b) => b.type === 'COMMENT' && b.content?.text?.trim())
    .map((b) => (b.content.author ? `${b.content.author}: ${b.content.text.trim()}` : b.content.text.trim()))
    .join('\n\n');
}
