import { beforeEach, describe, expect, it } from 'vitest';
import { useBuilderStore } from './store';
import { childrenOf } from '@/lib/blockTree';

const store = () => useBuilderStore.getState();

describe('builder store', () => {
  beforeEach(() => {
    store().load({ kind: 'document', id: 'doc', title: 'Doc', docType: 'BUG_REPORT', blocks: [], latestVersion: 1 });
  });

  it('adds blocks and tracks revisions', () => {
    const id = store().addBlock('TEXT');
    expect(store().blocks).toHaveLength(1);
    expect(store().selectedId).toBe(id);
    expect(store().revision).toBe(1);
    expect(store().saveStatus).toBe('dirty');
  });

  it('undoes and redoes structural changes', () => {
    const a = store().addBlock('TEXT')!;
    store().addBlock('HEADING');
    store().removeBlock(a);
    expect(store().blocks.map((b) => b.type)).toEqual(['HEADING']);

    store().undo();
    expect(store().blocks.map((b) => b.type).sort()).toEqual(['HEADING', 'TEXT']);
    store().redo();
    expect(store().blocks.map((b) => b.type)).toEqual(['HEADING']);
  });

  it('coalesces typing into a single undo step', () => {
    const id = store().addBlock('TEXT')!;
    store().updateContent(id, { text: 'H' }, 'text');
    store().updateContent(id, { text: 'He' }, 'text');
    store().updateContent(id, { text: 'Hey' }, 'text');
    expect(store().past).toHaveLength(2); // add + one typing step
    store().undo();
    expect(store().blocks[0].content).toEqual({ text: '' });
  });

  it('clears redo stack after a new change', () => {
    store().addBlock('TEXT');
    store().undo();
    expect(store().future).toHaveLength(1);
    store().addBlock('HEADING');
    expect(store().future).toHaveLength(0);
  });

  it('adds steps into a step group and rejects invalid children', () => {
    const group = store().addBlock('STEP_GROUP')!;
    expect(store().addBlock('STEP', group)).not.toBeNull();
    expect(store().addBlock('TABLE', group)).toBeNull();
    expect(childrenOf(store().blocks, group)).toHaveLength(1);
  });

  it('marks saved only when the saved revision is current', () => {
    store().addBlock('TEXT');
    const revision = store().revision;
    store().addBlock('TEXT');
    store().markSaved(revision, { savedAt: new Date().toISOString(), latestVersion: 2 });
    expect(store().saveStatus).toBe('dirty');
    expect(store().latestVersion).toBe(2);
    store().markSaved(store().revision, { savedAt: new Date().toISOString() });
    expect(store().saveStatus).toBe('saved');
  });

  it('duplicates the selected block with children', () => {
    const section = store().addBlock('SECTION')!;
    store().addBlock('CHECKBOX', section);
    store().duplicateBlock(section);
    expect(store().blocks.filter((b) => b.type === 'SECTION')).toHaveLength(2);
    expect(store().blocks.filter((b) => b.type === 'CHECKBOX')).toHaveLength(2);
  });
});
