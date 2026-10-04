import { create } from 'zustand';
import type { Block, BlockContentMap, BlockSettings, BlockType, DocumentType } from '@/types';
import { createBlock } from '@/blocks/registry';
import * as tree from '@/lib/blockTree';
import { uid } from '@/lib/utils';

export type SourceKind = 'document' | 'template';
export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

interface Snapshot {
  title: string;
  blocks: Block[];
}

export interface BuilderSource {
  kind: SourceKind;
  id: string;
  title: string;
  docType: DocumentType;
  blocks: Block[];
  latestVersion?: number;
  updatedAt?: string;
}

interface BuilderState {
  source: Omit<BuilderSource, 'blocks' | 'title'> | null;
  title: string;
  blocks: Block[];
  selectedId: string | null;
  /** Block whose settings panel is open */
  editingId: string | null;
  /** Newly created block that should receive focus once rendered */
  focusId: string | null;

  past: Snapshot[];
  future: Snapshot[];
  /** Coalesces rapid edits of one field into a single undo step */
  lastCoalesceKey: string | null;
  lastCommitAt: number;

  /** Increments on every content change; autosave compares it with savedRevision */
  revision: number;
  savedRevision: number;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  latestVersion: number;

  load: (source: BuilderSource) => void;
  reset: () => void;
  setTitle: (title: string) => void;
  select: (id: string | null) => void;
  toggleEditing: (id: string) => void;
  clearFocus: () => void;

  addBlock: (type: BlockType, parentId?: string | null, index?: number, content?: Partial<BlockContentMap[BlockType]>) => string | null;
  updateContent: <T extends BlockType>(id: string, patch: Partial<BlockContentMap[T]>, coalesce?: string) => void;
  updateSettings: (id: string, patch: Partial<BlockSettings>) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  moveBlock: (id: string, parentId: string | null, index: number) => boolean;
  shiftBlock: (id: string, direction: -1 | 1) => void;
  indentBlock: (id: string) => void;
  outdentBlock: (id: string) => void;
  replaceBlocks: (blocks: Block[], title?: string) => void;
  /** Applies a multi-block change as one undoable step (selection is kept). */
  setBlocks: (update: (blocks: Block[]) => Block[]) => void;

  undo: () => void;
  redo: () => void;

  markSaving: () => void;
  markSaved: (revision: number, info: { savedAt: string; latestVersion?: number }) => void;
  markError: () => void;
}

const HISTORY_LIMIT = 100;
const COALESCE_WINDOW_MS = 1200;

const initial = {
  source: null,
  title: '',
  blocks: [] as Block[],
  selectedId: null,
  editingId: null,
  focusId: null as string | null,
  past: [] as Snapshot[],
  future: [] as Snapshot[],
  lastCoalesceKey: null,
  lastCommitAt: 0,
  revision: 0,
  savedRevision: 0,
  saveStatus: 'saved' as SaveStatus,
  lastSavedAt: null,
  latestVersion: 0,
};

export const useBuilderStore = create<BuilderState>()((set, get) => {
  /**
   * Applies a change to title/blocks, pushing the previous state to history.
   * Edits with the same `coalesceKey` inside a short window share one undo step.
   */
  const commit = (next: Partial<Snapshot>, coalesceKey?: string, extra: Partial<BuilderState> = {}) => {
    const state = get();
    const blocks = next.blocks ?? state.blocks;
    const title = next.title ?? state.title;
    if (blocks === state.blocks && title === state.title) return;

    const now = Date.now();
    const coalesce = Boolean(coalesceKey) && coalesceKey === state.lastCoalesceKey && now - state.lastCommitAt < COALESCE_WINDOW_MS;
    const past = coalesce ? state.past : [...state.past, { title: state.title, blocks: state.blocks }].slice(-HISTORY_LIMIT);

    set({
      blocks,
      title,
      past,
      future: [],
      lastCoalesceKey: coalesceKey ?? null,
      lastCommitAt: now,
      revision: state.revision + 1,
      saveStatus: 'dirty',
      ...extra,
    });
  };

  const travel = (from: 'past' | 'future') => {
    const state = get();
    const stack = state[from];
    if (!stack.length) return;
    const target = stack[stack.length - 1];
    const current = { title: state.title, blocks: state.blocks };
    const exists = (id: string | null) => (id && target.blocks.some((b) => b.id === id) ? id : null);
    set({
      title: target.title,
      blocks: target.blocks,
      [from]: stack.slice(0, -1),
      ...(from === 'past' ? { future: [...state.future, current] } : { past: [...state.past, current] }),
      lastCoalesceKey: null,
      revision: state.revision + 1,
      saveStatus: 'dirty',
      selectedId: exists(state.selectedId),
      editingId: exists(state.editingId),
    });
  };

  return {
    ...initial,

    load: ({ blocks, title, ...source }) =>
      set({
        ...initial,
        source,
        title,
        blocks,
        latestVersion: source.latestVersion ?? 0,
        lastSavedAt: source.updatedAt ?? null,
      }),

    reset: () => set(initial),

    setTitle: (title) => commit({ title }, 'title'),

    select: (id) => set({ selectedId: id }),

    toggleEditing: (id) => set((s) => ({ editingId: s.editingId === id ? null : id, selectedId: id })),

    clearFocus: () => set({ focusId: null }),

    addBlock: (type, parentId = null, index, content) => {
      const { blocks } = get();
      const block = createBlock(type, content);
      const position = index ?? tree.childrenOf(blocks, parentId).length;
      const next = tree.insertBlock(blocks, block, parentId, position);
      if (next === blocks) return null;
      commit({ blocks: next }, undefined, { selectedId: block.id, focusId: block.id });
      return block.id;
    },

    updateContent: (id, patch, coalesce) => {
      const { blocks } = get();
      const next = blocks.map((b) => (b.id === id ? ({ ...b, content: { ...b.content, ...patch } } as Block) : b));
      commit({ blocks: next }, coalesce ? `${id}:${coalesce}` : undefined);
    },

    updateSettings: (id, patch) => {
      const { blocks } = get();
      commit({ blocks: blocks.map((b) => (b.id === id ? { ...b, settings: { ...b.settings, ...patch } } : b)) });
    },

    removeBlock: (id) => {
      const state = get();
      const block = tree.findBlock(state.blocks, id);
      if (!block) return;
      // Select a neighbour so keyboard deletion can continue naturally.
      const siblings = tree.childrenOf(state.blocks, block.parentId);
      const index = siblings.findIndex((b) => b.id === id);
      const neighbour = siblings[index + 1] ?? siblings[index - 1] ?? tree.findBlock(state.blocks, block.parentId);
      commit({ blocks: tree.removeBlock(state.blocks, id) }, undefined, {
        selectedId: neighbour?.id ?? null,
        editingId: state.editingId === id ? null : state.editingId,
      });
    },

    duplicateBlock: (id) => {
      const result = tree.duplicateBlock(get().blocks, id, uid);
      if (result.newId) commit({ blocks: result.blocks }, undefined, { selectedId: result.newId, focusId: result.newId });
    },

    moveBlock: (id, parentId, index) => {
      const { blocks } = get();
      const next = tree.moveBlock(blocks, id, parentId, index);
      if (next === blocks) return false;
      commit({ blocks: next });
      return true;
    },

    shiftBlock: (id, direction) => commit({ blocks: tree.shiftBlock(get().blocks, id, direction) }),
    indentBlock: (id) => commit({ blocks: tree.indentBlock(get().blocks, id) }),
    outdentBlock: (id) => commit({ blocks: tree.outdentBlock(get().blocks, id) }),

    replaceBlocks: (blocks, title) => commit({ blocks, title }, undefined, { selectedId: null, editingId: null }),

    setBlocks: (update) => commit({ blocks: update(get().blocks) }),

    undo: () => travel('past'),
    redo: () => travel('future'),

    markSaving: () => set({ saveStatus: 'saving' }),
    markSaved: (revision, { savedAt, latestVersion }) =>
      set((s) => ({
        savedRevision: Math.max(s.savedRevision, revision),
        saveStatus: s.revision === revision ? 'saved' : 'dirty',
        lastSavedAt: savedAt,
        latestVersion: latestVersion ?? s.latestVersion,
      })),
    markError: () => set({ saveStatus: 'error' }),
  };
});

export const selectCanUndo = (s: BuilderState) => s.past.length > 0;
export const selectCanRedo = (s: BuilderState) => s.future.length > 0;
export const selectIsDirty = (s: BuilderState) => s.revision !== s.savedRevision;
