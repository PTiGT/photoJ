import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { buildTree, cloneBlocks, normalizeBlocks, sortDepthFirst } from '../../src/domain/blockTree.js';
import { canContain } from '../../src/domain/blockTypes.js';
import { block } from '../helpers.js';

describe('canContain', () => {
  it('allows any block at root and inside sections', () => {
    expect(canContain(null, 'STEP')).toBe(true);
    expect(canContain('SECTION', 'SECTION')).toBe(true);
  });

  it('restricts step groups to steps and checkboxes to checkboxes', () => {
    expect(canContain('STEP_GROUP', 'STEP')).toBe(true);
    expect(canContain('STEP_GROUP', 'TEXT')).toBe(false);
    expect(canContain('CHECKBOX', 'CHECKBOX')).toBe(true);
    expect(canContain('INPUT', 'TEXT')).toBe(false);
  });
});

describe('normalizeBlocks', () => {
  it('makes sibling orders contiguous and puts parents first', () => {
    const section = block('SECTION', { title: 'A' }, { order: 5 });
    const child2 = block('CHECKBOX', { label: '2' }, { parentId: section.id, order: 20 });
    const child1 = block('CHECKBOX', { label: '1' }, { parentId: section.id, order: 10 });
    const result = normalizeBlocks([child2, child1, section]);

    expect(result.map((b) => b.id)).toEqual([section.id, child1.id, child2.id]);
    expect(result.map((b) => b.order)).toEqual([0, 0, 1]);
  });

  it('rejects unknown parents', () => {
    expect(() => normalizeBlocks([block('TEXT', {}, { parentId: randomUUID() })])).toThrow(/Родительский блок/);
  });

  it('rejects forbidden nesting', () => {
    const group = block('STEP_GROUP');
    expect(() => normalizeBlocks([group, block('TEXT', {}, { parentId: group.id })])).toThrow(/не может находиться/);
  });

  it('rejects duplicate ids', () => {
    const a = block('TEXT');
    expect(() => normalizeBlocks([a, { ...a }])).toThrow(/Повторяющийся/);
  });

  it('rejects cycles', () => {
    const a = block('SECTION');
    const b = block('SECTION', {}, { parentId: a.id });
    a.parentId = b.id;
    expect(() => normalizeBlocks([a, b])).toThrow();
  });

  it('validates content per type and strips unknown keys', () => {
    const [result] = normalizeBlocks([block('SEVERITY', { value: 'Major', junk: 1 })]);
    expect(result.content).toEqual({ value: 'Major' });
    expect(() => normalizeBlocks([block('SEVERITY', { value: 'Super bad' })])).toThrow(/SEVERITY/);
  });
});

describe('tree helpers', () => {
  const root = block('SECTION', { title: 'Root' });
  const nested = block('SECTION', { title: 'Nested' }, { parentId: root.id });
  const leaf = block('CHECKBOX', { label: 'Leaf' }, { parentId: nested.id });
  const blocks = normalizeBlocks([leaf, nested, root]);

  it('buildTree nests children', () => {
    const [tree] = buildTree(blocks);
    expect(tree.children[0].children[0].content.label).toBe('Leaf');
  });

  it('sortDepthFirst orders parents before children', () => {
    expect(sortDepthFirst([...blocks].reverse()).map((b) => b.content.title ?? b.content.label)).toEqual(['Root', 'Nested', 'Leaf']);
  });

  it('cloneBlocks assigns new ids and keeps hierarchy', () => {
    const clones = cloneBlocks(blocks, randomUUID);
    expect(clones.some((c) => blocks.some((b) => b.id === c.id))).toBe(false);
    const [cRoot, cNested, cLeaf] = sortDepthFirst(clones);
    expect(cNested.parentId).toBe(cRoot.id);
    expect(cLeaf.parentId).toBe(cNested.id);
  });
});
