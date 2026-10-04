import { create } from 'zustand';

/**
 * Id of the innermost block under the pointer. CSS `group-hover` can't be
 * used for nested cards because it matches every hovered ancestor.
 */
export const useHoverStore = create<{ id: string | null; set: (id: string | null) => void }>((set) => ({
  id: null,
  set: (id) => set({ id }),
}));

export const useIsHovered = (id: string) => useHoverStore((s) => s.id === id);
