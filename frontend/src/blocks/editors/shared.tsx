import type { ReactNode } from 'react';
import type { BlockContentMap, BlockOf, BlockType } from '@/types';
import { useBuilderStore } from '@/features/builder/store';
import { cn } from '@/lib/utils';

export interface EditorProps<T extends BlockType> {
  block: BlockOf<T>;
}

/** Returns a typed updater for the block's content. `key` coalesces typing into one undo step. */
export function useUpdate<T extends BlockType>(block: BlockOf<T>) {
  const updateContent = useBuilderStore((s) => s.updateContent);
  return (patch: Partial<BlockContentMap[T]>, key?: string) => updateContent<T>(block.id, patch, key);
}

/** Editable field label rendered as small caps above a value. */
export function LabelInput({ value, onChange, placeholder = 'Подпись поля' }: { value?: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <input
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Подпись поля"
      className="inline-input -ml-2 w-auto max-w-full px-2 py-0.5 text-[11px] font-semibold tracking-wider text-muted uppercase placeholder:normal-case placeholder:tracking-normal"
      size={Math.max(8, (value ?? placeholder).length + 2)}
    />
  );
}

export function Pill({ active, onClick, children, tone, testId }: { active: boolean; onClick: () => void; children: ReactNode; tone?: string; testId?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'rounded-lg px-2.5 py-1 text-[13px] font-medium transition-all',
        active ? cn(tone ?? 'bg-accent text-accent-fg', 'shadow-soft ring-1 ring-black/5') : 'bg-surface-3/70 text-muted hover:bg-surface-3 hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

export const valueInputClass = 'field-input';
