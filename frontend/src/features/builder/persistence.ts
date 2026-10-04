import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { documentsApi, templatesApi } from '@/api';
import type { Block } from '@/types';
import { useBuilderStore, type SourceKind } from './store';

const AUTOSAVE_DELAY_MS = 1000;
const RETRY_DELAY_MS = 5000;

interface SavePayload {
  title: string;
  blocks: Block[];
  createVersion: boolean;
  keepalive: boolean;
}

/** Persists builder content to the right endpoint depending on what is edited. */
async function persist(kind: SourceKind, id: string, { title, blocks, createVersion, keepalive }: SavePayload) {
  if (kind === 'document') {
    const result = await documentsApi.update(id, { title, blocks, createVersion }, keepalive);
    return { savedAt: result.updatedAt, latestVersion: result.latestVersion };
  }
  const result = await templatesApi.update(id, { name: title, blocks }, keepalive);
  return { savedAt: result.updatedAt };
}

// ── Local draft backup ────────────────────────────────────────────
// Unsaved changes are mirrored to localStorage so a crash, a closed tab or a
// failed request never loses user input. The draft is removed after a save.

interface Draft {
  title: string;
  blocks: Block[];
  at: number;
}

const draftKey = (kind: SourceKind, id: string) => `qa-draft:${kind}:${id}`;

export const drafts = {
  write(kind: SourceKind, id: string, draft: Omit<Draft, 'at'>) {
    try {
      localStorage.setItem(draftKey(kind, id), JSON.stringify({ ...draft, at: Date.now() }));
    } catch {
      /* storage full or unavailable — autosave still works */
    }
  },
  read(kind: SourceKind, id: string): Draft | null {
    try {
      const raw = localStorage.getItem(draftKey(kind, id));
      return raw ? (JSON.parse(raw) as Draft) : null;
    } catch {
      return null;
    }
  },
  clear(kind: SourceKind, id: string) {
    try {
      localStorage.removeItem(draftKey(kind, id));
    } catch {
      /* ignore */
    }
  },
};

/**
 * Debounced autosave. Returns `save` for manual saves (Ctrl+S) which also
 * creates a document version.
 */
export function useAutosave() {
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const errorShown = useRef(false);

  const save = useCallback(async ({ createVersion = false, keepalive = false } = {}): Promise<boolean> => {
    // Serialize saves: wait for the running one, then save the latest state.
    while (inFlight.current) await inFlight.current;

    const state = useBuilderStore.getState();
    const { source, revision, savedRevision, title, blocks } = state;
    if (!source) return false;
    if (revision === savedRevision && !createVersion) return true;

    state.markSaving();
    let ok = true;
    inFlight.current = persist(source.kind, source.id, { title, blocks, createVersion, keepalive })
      .then((info) => {
        useBuilderStore.getState().markSaved(revision, info);
        if (useBuilderStore.getState().revision === revision) drafts.clear(source.kind, source.id);
        errorShown.current = false;
      })
      .catch((error: Error) => {
        ok = false;
        useBuilderStore.getState().markError();
        if (!errorShown.current) {
          toast.error(`Не удалось сохранить: ${error.message}`, { description: 'Изменения сохранены локально, повторим автоматически.' });
          errorShown.current = true;
        }
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void save(), RETRY_DELAY_MS);
      })
      .finally(() => {
        inFlight.current = null;
      });
    await inFlight.current;
    return ok;
  }, []);

  useEffect(() => {
    const unsubscribe = useBuilderStore.subscribe((state, previous) => {
      if (state.revision === previous.revision || !state.source) return;
      drafts.write(state.source.kind, state.source.id, { title: state.title, blocks: state.blocks });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    });

    const beforeUnload = (event: BeforeUnloadEvent) => {
      const { revision, savedRevision } = useBuilderStore.getState();
      if (revision !== savedRevision) {
        void save({ keepalive: true });
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', beforeUnload);
      clearTimeout(timer.current);
      // Flush pending changes when leaving the editor inside the SPA.
      const { revision, savedRevision } = useBuilderStore.getState();
      if (revision !== savedRevision) void save({ keepalive: true });
    };
  }, [save]);

  return save;
}
