import { describe, expect, it } from 'vitest';
import type { Block, BlockType } from '@/types';
import {
  buildTree,
  canContain,
  childrenOf,
  duplicateBlock,
  indentBlock,
  insertBlock,
  insertionPoint,
  moveBlock,
  outdentBlock,
  removeBlock,
  shiftBlock,
  stepNumbers,
} from './blockTree';

let counter = 0;
const id = () => `id-${++counter}`;
const make = (type: BlockType, parentId: string | null = null, order = 0, content: Record<string, unknown> = {}): Block =>
  ({ id: id(), type, parentId, order, content, settings: {} }) as Block;

const ids = (blocks: Block[], parentId: string | null = null) => childrenOf(blocks, parentId).map((b) => b.id);

describe('blockTree', () => {
  it('knows container rules', () => {
    expect(canContain(null, 'SECTION')).toBe(true);
    expect(canContain('STEP_GROUP', 'STEP')).toBe(true);
    expect(canContain('STEP_GROUP', 'TEXT')).toBe(false);
    expect(canContain('CHECKBOX', 'CHECKBOX')).toBe(true);
  });

  it('inserts at an index and normalizes orders', () => {
    const a = make('TEXT');
    const b = make('TEXT', null, 1);
    const c = make('HEADING');
    const next = insertBlock([a, b], c, null, 1);
    expect(ids(next)).toEqual([a.id, c.id, b.id]);
    expect(childrenOf(next, null).map((x) => x.order)).toEqual([0, 1, 2]);
  });

  it('refuses invalid inserts', () => {
    const group = make('STEP_GROUP');
    const blocks = [group];
    expect(insertBlock(blocks, make('TABLE'), group.id, 0)).toBe(blocks);
  });

  it('removes a subtree', () => {
    const section = make('SECTION');
    const child = make('CHECKBOX', section.id);
    const grandChild = make('CHECKBOX', child.id);
    const other = make('TEXT', null, 1);
    const next = removeBlock([section, child, grandChild, other], section.id);
    expect(next.map((b) => b.id)).toEqual([other.id]);
    expect(next[0].order).toBe(0);
  });

  it('moves between parents and prevents moving into own descendant', () => {
    const s1 = make('SECTION');
    const s2 = make('SECTION', null, 1);
    const check = make('CHECKBOX', s1.id);
    let blocks = [s1, s2, check];
    blocks = moveBlock(blocks, check.id, s2.id, 0);
    expect(ids(blocks, s2.id)).toEqual([check.id]);
    expect(ids(blocks, s1.id)).toEqual([]);

    const nested = make('SECTION', s1.id);
    blocks = [...blocks, nested];
    expect(moveBlock(blocks, s1.id, nested.id, 0)).toBe(blocks);
  });

  it('shifts up and down within siblings', () => {
    const a = make('TEXT');
    const b = make('TEXT', null, 1);
    const c = make('TEXT', null, 2);
    const blocks = [a, b, c];
    expect(ids(shiftBlock(blocks, c.id, -1))).toEqual([a.id, c.id, b.id]);
    expect(ids(shiftBlock(blocks, a.id, 1))).toEqual([b.id, a.id, c.id]);
    expect(shiftBlock(blocks, a.id, -1)).toBe(blocks);
  });

  it('indents into the previous sibling and outdents back', () => {
    const first = make('CHECKBOX');
    const second = make('CHECKBOX', null, 1);
    const indented = indentBlock([first, second], second.id);
    expect(ids(indented, first.id)).toEqual([second.id]);
    const outdented = outdentBlock(indented, second.id);
    expect(ids(outdented)).toEqual([first.id, second.id]);
  });

  it('duplicates a subtree right after the original with new ids', () => {
    const group = make('STEP_GROUP');
    const step = make('STEP', group.id, 0, { action: 'Click' });
    const after = make('TEXT', null, 1);
    const { blocks, newId } = duplicateBlock([group, step, after], group.id, id);
    expect(ids(blocks)).toEqual([group.id, newId, after.id]);
    const copiedSteps = childrenOf(blocks, newId);
    expect(copiedSteps).toHaveLength(1);
    expect(copiedSteps[0].id).not.toBe(step.id);
    expect(copiedSteps[0].content).toEqual({ action: 'Click' });
  });

  it('numbers steps per consecutive run', () => {
    const s1 = make('STEP');
    const s2 = make('STEP', null, 1);
    const text = make('TEXT', null, 2);
    const s3 = make('STEP', null, 3);
    const numbers = stepNumbers([s1, s2, text, s3]);
    expect([numbers.get(s1.id), numbers.get(s2.id), numbers.get(s3.id)]).toEqual([1, 2, 1]);
  });

  it('builds a nested tree', () => {
    const section = make('SECTION');
    const check = make('CHECKBOX', section.id);
    const [tree] = buildTree([check, section]);
    expect(tree.children.map((c) => c.id)).toEqual([check.id]);
  });

  it('computes insertion point from the selection', () => {
    const section = make('SECTION');
    const check = make('CHECKBOX', section.id);
    const group = make('STEP_GROUP', null, 1);
    const blocks = [section, check, group];
    expect(insertionPoint(blocks, section.id, 'CHECKBOX')).toEqual({ parentId: section.id, index: 1 });
    expect(insertionPoint(blocks, check.id, 'TEXT')).toEqual({ parentId: section.id, index: 1 });
    expect(insertionPoint(blocks, group.id, 'STEP')).toEqual({ parentId: group.id, index: 0 });
    expect(insertionPoint(blocks, group.id, 'TEXT')).toEqual({ parentId: null, index: 2 });
    expect(insertionPoint(blocks, null, 'TEXT')).toEqual({ parentId: null, index: 2 });
  });
});
