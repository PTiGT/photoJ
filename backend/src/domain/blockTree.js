import { canContain, parseContent, settingsSchema } from './blockTypes.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Validates a flat block list coming from the client and returns it
 * normalised: content parsed per type, orders made contiguous per parent,
 * parents sorted before children (safe for bulk inserts).
 */
export function normalizeBlocks(blocks) {
  const byId = new Map();
  for (const block of blocks) {
    if (byId.has(block.id)) throw new HttpError(400, `Повторяющийся id блока: ${block.id}`);
    byId.set(block.id, block);
  }

  for (const block of blocks) {
    const parent = block.parentId ? byId.get(block.parentId) : null;
    if (block.parentId && !parent) throw new HttpError(400, `Родительский блок не найден: ${block.parentId}`);
    if (!canContain(parent?.type ?? null, block.type)) {
      throw new HttpError(400, `Блок ${block.type} не может находиться внутри ${parent?.type ?? 'документа'}`);
    }
    assertNoCycle(block, byId);
  }

  const children = groupByParent(blocks);
  const result = [];
  const walk = (parentId) => {
    const list = children.get(parentId) ?? [];
    list.forEach((block, order) => {
      result.push({
        id: block.id,
        type: block.type,
        parentId: block.parentId ?? null,
        order,
        content: safeParseContent(block),
        settings: settingsSchema.parse(block.settings ?? {}),
      });
      walk(block.id);
    });
  };
  walk(null);
  return result;
}

function safeParseContent(block) {
  try {
    return parseContent(block.type, block.content);
  } catch (error) {
    const issue = error?.issues?.[0];
    const where = issue?.path?.length ? ` (${issue.path.join('.')})` : '';
    throw new HttpError(400, `Некорректное содержимое блока ${block.type}${where}`);
  }
}

function assertNoCycle(block, byId) {
  const seen = new Set([block.id]);
  let current = block.parentId ? byId.get(block.parentId) : null;
  while (current) {
    if (seen.has(current.id)) throw new HttpError(400, 'Обнаружена циклическая вложенность блоков');
    seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : null;
  }
}

/** Groups blocks by parentId, each group sorted by `order`. */
export function groupByParent(blocks) {
  const map = new Map();
  for (const block of blocks) {
    const key = block.parentId ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(block);
  }
  for (const list of map.values()) list.sort((a, b) => a.order - b.order);
  return map;
}

/** Returns blocks in depth-first order (parents before children, siblings by order). */
export function sortDepthFirst(blocks) {
  const groups = groupByParent(blocks);
  const result = [];
  const walk = (parentId) => {
    for (const block of groups.get(parentId) ?? []) {
      result.push(block);
      walk(block.id);
    }
  };
  walk(null);
  return result;
}

/** Builds a nested tree `{ ...block, children: [] }` from a flat list. */
export function buildTree(blocks) {
  const groups = groupByParent(blocks);
  const attach = (parentId) =>
    (groups.get(parentId) ?? []).map((block) => ({ ...block, children: attach(block.id) }));
  return attach(null);
}

/** Copies a block list assigning new ids while preserving hierarchy. */
export function cloneBlocks(blocks, idFactory) {
  const idMap = new Map(blocks.map((block) => [block.id, idFactory()]));
  return blocks.map((block) => ({
    id: idMap.get(block.id),
    type: block.type,
    order: block.order,
    parentId: block.parentId ? idMap.get(block.parentId) ?? null : null,
    content: block.content ?? {},
    settings: block.settings ?? {},
  }));
}
