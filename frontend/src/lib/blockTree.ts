import type { Block, BlockTree, BlockType } from '@/types';

/*
 * Pure operations over the flat block list used by the builder.
 * Blocks are stored flat (id, parentId, order) exactly like in the DB;
 * every operation returns a new array with contiguous sibling orders.
 */

export type ParentId = string | null;

const ALL_TYPES: BlockType[] = [
  'TEXT', 'HEADING', 'INPUT', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'RADIO', 'STEP', 'STEP_GROUP',
  'SECTION', 'TABLE', 'IMAGE', 'ATTACHMENT', 'SEVERITY', 'PRIORITY', 'ENVIRONMENT', 'STATUS', 'COMMENT', 'RUN_INFO',
];

/** Container rules — mirrors backend ALLOWED_CHILDREN. */
export const ALLOWED_CHILDREN: Partial<Record<BlockType | 'ROOT', BlockType[]>> = {
  ROOT: ALL_TYPES,
  SECTION: ALL_TYPES,
  STEP_GROUP: ['STEP'],
  CHECKBOX: ['CHECKBOX'],
};

export function canContain(parentType: BlockType | null, childType: BlockType): boolean {
  return ALLOWED_CHILDREN[parentType ?? 'ROOT']?.includes(childType) ?? false;
}

export const isContainer = (type: BlockType) => Boolean(ALLOWED_CHILDREN[type]);

export function childrenOf(blocks: Block[], parentId: ParentId): Block[] {
  return blocks.filter((b) => (b.parentId ?? null) === parentId).sort((a, b) => a.order - b.order);
}

export function findBlock(blocks: Block[], id: string | null | undefined): Block | undefined {
  return id ? blocks.find((b) => b.id === id) : undefined;
}

/** Ids of all descendants of `id` (not including itself). */
export function descendantIds(blocks: Block[], id: string): Set<string> {
  const result = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    for (const block of blocks) {
      if (block.parentId === current && !result.has(block.id)) {
        result.add(block.id);
        stack.push(block.id);
      }
    }
  }
  return result;
}

export function sortDepthFirst(blocks: Block[]): Block[] {
  const result: Block[] = [];
  const walk = (parentId: ParentId) => {
    for (const block of childrenOf(blocks, parentId)) {
      result.push(block);
      walk(block.id);
    }
  };
  walk(null);
  return result;
}

export function buildTree(blocks: Block[]): BlockTree[] {
  const groups = new Map<ParentId, Block[]>();
  for (const block of blocks) {
    const key = block.parentId ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(block);
  }
  const attach = (parentId: ParentId): BlockTree[] =>
    (groups.get(parentId) ?? [])
      .sort((a, b) => a.order - b.order)
      .map((block) => ({ ...block, children: attach(block.id) }) as BlockTree);
  return attach(null);
}

/** Rewrites `order` of the given parent's children to match `orderedIds`. */
function applySiblingOrder(blocks: Block[], parentId: ParentId, orderedIds: string[]): Block[] {
  const position = new Map(orderedIds.map((id, index) => [id, index]));
  return blocks.map((b) =>
    position.has(b.id) ? ({ ...b, parentId, order: position.get(b.id)! } as Block) : b,
  );
}

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, length));
}

/** Inserts a (new) block under `parentId` at `index`. Returns unchanged list if not allowed. */
export function insertBlock(blocks: Block[], block: Block, parentId: ParentId, index: number): Block[] {
  const parent = findBlock(blocks, parentId);
  if (parentId && !parent) return blocks;
  if (!canContain(parent?.type ?? null, block.type)) return blocks;

  const siblings = childrenOf(blocks, parentId).map((b) => b.id);
  siblings.splice(clampIndex(index, siblings.length), 0, block.id);
  return applySiblingOrder([...blocks, { ...block, parentId } as Block], parentId, siblings);
}

/** Inserts a pre-built subtree (root + descendants with correct parentIds). */
export function insertSubtree(blocks: Block[], subtree: Block[], parentId: ParentId, index: number): Block[] {
  const [root, ...rest] = subtree;
  const withRoot = insertBlock(blocks, root, parentId, index);
  return withRoot === blocks ? blocks : [...withRoot, ...rest];
}

/** Removes a block and all its descendants. */
export function removeBlock(blocks: Block[], id: string): Block[] {
  const target = findBlock(blocks, id);
  if (!target) return blocks;
  const removed = descendantIds(blocks, id);
  removed.add(id);
  const remaining = blocks.filter((b) => !removed.has(b.id));
  const parentId = target.parentId ?? null;
  return applySiblingOrder(remaining, parentId, childrenOf(remaining, parentId).map((b) => b.id));
}

/**
 * Moves a block to `parentId` at `index` (index is computed on the sibling
 * list *without* the moved block). No-op for invalid targets.
 */
export function moveBlock(blocks: Block[], id: string, parentId: ParentId, index: number): Block[] {
  const block = findBlock(blocks, id);
  if (!block) return blocks;
  if (parentId === id || (parentId && descendantIds(blocks, id).has(parentId))) return blocks;
  const parent = findBlock(blocks, parentId);
  if (parentId && !parent) return blocks;
  if (!canContain(parent?.type ?? null, block.type)) return blocks;

  const oldParent = block.parentId ?? null;
  let next = blocks;
  if (oldParent !== parentId) {
    next = applySiblingOrder(next, oldParent, childrenOf(next, oldParent).filter((b) => b.id !== id).map((b) => b.id));
  }
  const siblings = childrenOf(next, parentId).filter((b) => b.id !== id).map((b) => b.id);
  siblings.splice(clampIndex(index, siblings.length), 0, id);
  return applySiblingOrder(next, parentId, siblings);
}

/** Moves a block one position up (-1) or down (+1) among its siblings. */
export function shiftBlock(blocks: Block[], id: string, direction: -1 | 1): Block[] {
  const block = findBlock(blocks, id);
  if (!block) return blocks;
  const siblings = childrenOf(blocks, block.parentId ?? null);
  const index = siblings.findIndex((b) => b.id === id);
  const target = index + direction;
  if (target < 0 || target >= siblings.length) return blocks;
  return moveBlock(blocks, id, block.parentId ?? null, target);
}

/** Makes the block the last child of its previous sibling (if that sibling accepts it). */
export function indentBlock(blocks: Block[], id: string): Block[] {
  const block = findBlock(blocks, id);
  if (!block) return blocks;
  const siblings = childrenOf(blocks, block.parentId ?? null);
  const previous = siblings[siblings.findIndex((b) => b.id === id) - 1];
  if (!previous || !canContain(previous.type, block.type)) return blocks;
  return moveBlock(blocks, id, previous.id, childrenOf(blocks, previous.id).length);
}

/** Moves the block out of its parent, right after the parent. */
export function outdentBlock(blocks: Block[], id: string): Block[] {
  const block = findBlock(blocks, id);
  const parent = findBlock(blocks, block?.parentId);
  if (!block || !parent) return blocks;
  const grandParentId = parent.parentId ?? null;
  const parentIndex = childrenOf(blocks, grandParentId).findIndex((b) => b.id === parent.id);
  return moveBlock(blocks, id, grandParentId, parentIndex + 1);
}

/** Deep-copies a block subtree with fresh ids; the root keeps its parentId. */
export function cloneSubtree(blocks: Block[], id: string, idFactory: () => string): Block[] {
  const root = findBlock(blocks, id);
  if (!root) return [];
  const ids = [id, ...descendantIds(blocks, id)];
  const idMap = new Map(ids.map((oldId) => [oldId, idFactory()]));
  return ids.map((oldId) => {
    const source = findBlock(blocks, oldId)!;
    return {
      ...source,
      id: idMap.get(oldId)!,
      parentId: oldId === id ? source.parentId : idMap.get(source.parentId!)!,
      content: structuredClone(source.content),
      settings: { ...source.settings },
    } as Block;
  });
}

/** Duplicates a subtree right after the original. Returns the new list and the copy's id. */
export function duplicateBlock(blocks: Block[], id: string, idFactory: () => string) {
  const source = findBlock(blocks, id);
  if (!source) return { blocks, newId: null };
  const copy = cloneSubtree(blocks, id, idFactory);
  const parentId = source.parentId ?? null;
  const index = childrenOf(blocks, parentId).findIndex((b) => b.id === id) + 1;
  return { blocks: insertSubtree(blocks, copy, parentId, index), newId: copy[0].id };
}

/**
 * Step numbers as shown in the document: sequential inside a run of
 * consecutive STEP siblings (a STEP_GROUP is one run).
 */
export function stepNumbers(blocks: Block[]): Map<string, number> {
  const numbers = new Map<string, number>();
  const parents = new Set<ParentId>(blocks.map((b) => b.parentId ?? null));
  for (const parentId of parents) {
    let counter = 0;
    for (const block of childrenOf(blocks, parentId)) {
      counter = block.type === 'STEP' ? counter + 1 : 0;
      if (block.type === 'STEP') numbers.set(block.id, counter);
    }
  }
  return numbers;
}

/** Depth of a block (root children = 0). */
export function depthOf(blocks: Block[], id: string): number {
  let depth = 0;
  let current = findBlock(blocks, id);
  while (current?.parentId) {
    depth += 1;
    current = findBlock(blocks, current.parentId);
  }
  return depth;
}

/**
 * Where a new block of `type` goes when added without dragging:
 * inside the selected container if it accepts the type, otherwise right
 * after the selected block, otherwise at the end of the document.
 */
export function insertionPoint(blocks: Block[], selectedId: string | null, type: BlockType): { parentId: ParentId; index: number } {
  const selected = findBlock(blocks, selectedId);
  if (selected) {
    if (canContain(selected.type, type) && isContainer(selected.type) && selected.type !== 'CHECKBOX') {
      return { parentId: selected.id, index: childrenOf(blocks, selected.id).length };
    }
    let current: Block | undefined = selected;
    while (current) {
      const parent = findBlock(blocks, current.parentId);
      if (canContain(parent?.type ?? null, type)) {
        const index = childrenOf(blocks, current.parentId ?? null).findIndex((b) => b.id === current!.id) + 1;
        return { parentId: current.parentId ?? null, index };
      }
      current = parent;
    }
  }
  return { parentId: null, index: childrenOf(blocks, null).length };
}
