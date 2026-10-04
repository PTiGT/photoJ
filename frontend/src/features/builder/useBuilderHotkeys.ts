import { useEffect } from 'react';
import { useBuilderStore } from './store';
import { removeWithUndo } from './components/blockActions';

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** Global builder shortcuts. Undo/redo override native text undo for consistency. */
export function useBuilderHotkeys({ onSave }: { onSave: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return; // modals own the keyboard
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const store = useBuilderStore.getState();

      if (mod && key === 's') {
        event.preventDefault();
        onSave();
      } else if (mod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
      } else if (mod && key === 'y') {
        event.preventDefault();
        store.redo();
      } else if (mod && key === 'd' && store.selectedId) {
        event.preventDefault();
        store.duplicateBlock(store.selectedId);
      } else if (event.altKey && (key === 'arrowup' || key === 'arrowdown') && store.selectedId) {
        event.preventDefault();
        store.shiftBlock(store.selectedId, key === 'arrowup' ? -1 : 1);
      } else if ((key === 'delete' || key === 'backspace') && store.selectedId && !isEditable(event.target)) {
        event.preventDefault();
        removeWithUndo(store.selectedId);
      } else if (key === 'escape' && !isEditable(event.target)) {
        store.select(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSave]);
}
