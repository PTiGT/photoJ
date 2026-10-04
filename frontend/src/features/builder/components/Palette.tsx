import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Search } from 'lucide-react';
import type { BlockType } from '@/types';
import { BLOCKS, BLOCK_CATEGORIES, PALETTE_ORDER } from '@/blocks/registry';
import { insertionPoint } from '@/lib/blockTree';
import { cn } from '@/lib/utils';
import { useBuilderStore } from '../store';
import type { DragData } from '../dnd';

function PaletteItem({ type, onAdd }: { type: BlockType; onAdd: (type: BlockType) => void }) {
  const definition = BLOCKS[type];
  const Icon = definition.icon;
  const data: DragData = { kind: 'palette', type };
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `palette:${type}`, data });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => onAdd(type)}
      title={`${definition.hint}. Перетащите в документ или нажмите, чтобы добавить`}
      data-testid={`palette-${type}`}
      className={cn(
        'group flex w-full touch-none items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition',
        'hover:border-line hover:bg-surface hover:shadow-soft active:cursor-grabbing',
        isDragging && 'opacity-50',
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-fg-soft transition group-hover:border-accent/30 group-hover:bg-accent-soft group-hover:text-accent">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{definition.label}</span>
        <span className="block truncate text-[11.5px] text-muted">{definition.hint}</span>
      </span>
    </button>
  );
}

/** Left panel: draggable component library grouped by category. */
export function Palette({ onAdded }: { onAdded?: () => void }) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BLOCK_CATEGORIES.map((category) => ({
      category,
      types: PALETTE_ORDER.filter(
        (type) => BLOCKS[type].category === category && (!q || `${BLOCKS[type].label} ${BLOCKS[type].hint}`.toLowerCase().includes(q)),
      ),
    })).filter((group) => group.types.length);
  }, [query]);

  const add = (type: BlockType) => {
    const { blocks, selectedId, addBlock } = useBuilderStore.getState();
    const { parentId, index } = insertionPoint(blocks, selectedId, type);
    addBlock(type, parentId, index);
    onAdded?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти компонент" aria-label="Поиск компонентов" className="field-input h-8 pl-8 text-[13px]" />
        </div>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-4">
        {groups.map(({ category, types }) => (
          <div key={category} className="mb-3">
            <div className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-subtle uppercase">{category}</div>
            {types.map((type) => (
              <PaletteItem key={type} type={type} onAdd={add} />
            ))}
          </div>
        ))}
        {!groups.length && <p className="px-3 py-6 text-center text-sm text-muted">Ничего не найдено</p>}
      </div>
      <p className="hidden border-t border-line px-4 py-3 text-[11.5px] leading-snug text-muted lg:block">
        Перетащите компонент в документ или кликните — он добавится после выбранного блока.
      </p>
    </div>
  );
}
