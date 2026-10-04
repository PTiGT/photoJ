import { useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useShallow } from 'zustand/react/shallow';
import { Plus } from 'lucide-react';
import type { BlockType } from '@/types';
import { BLOCKS, PALETTE_ORDER } from '@/blocks/registry';
import { Menu, useMenu } from '@/components/ui/Menu';
import { canContain, childrenOf } from '@/lib/blockTree';
import { cn } from '@/lib/utils';
import { useBuilderStore } from '../store';
import { useDropStore, zoneId } from '../dnd';
import { BlockCard } from './BlockCard';

function AddButton({ onClick, children, testId }: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-muted transition hover:bg-accent-soft hover:text-accent"
    >
      <Plus className="size-3.5" />
      {children}
    </button>
  );
}

/** Children of a container (or the document root) + a droppable zone + quick-add buttons. */
export function ChildrenList({ parentId, parentType, empty }: { parentId: string | null; parentType: BlockType | null; empty?: React.ReactNode }) {
  const ids = useBuilderStore(useShallow((s) => childrenOf(s.blocks, parentId).map((b) => b.id)));
  const addBlock = useBuilderStore((s) => s.addBlock);
  const dropping = useDropStore((s) => s.target?.overId === zoneId(parentId));
  const { setNodeRef } = useDroppable({ id: zoneId(parentId), data: { kind: 'zone', parentId } });
  const menu = useMenu();
  const anchor = useRef<HTMLElement | null>(null);
  const isRoot = parentId === null;

  const accepted = PALETTE_ORDER.filter((type) => canContain(parentType, type));

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative rounded-xl transition-colors',
        isRoot ? 'min-h-24 pb-4' : 'min-h-8 pb-1',
        dropping && 'bg-accent-soft/60 ring-2 ring-accent/40 ring-dashed',
      )}
    >
      {ids.length === 0 && empty}
      {ids.map((id) => (
        <BlockCard key={id} id={id} />
      ))}

      {parentType === 'STEP_GROUP' && (
        <AddButton onClick={() => addBlock('STEP', parentId)} testId="add-step">
          Добавить шаг
        </AddButton>
      )}
      {parentType === 'SECTION' && (
        <div className="flex flex-wrap gap-1">
          <AddButton onClick={() => addBlock('CHECKBOX', parentId)}>Проверка</AddButton>
          <AddButton onClick={() => addBlock('SECTION', parentId)}>Подраздел</AddButton>
          <AddButton
            onClick={(e) => {
              anchor.current = e.currentTarget;
              menu.openBelow(e.currentTarget, 'start');
            }}
          >
            Блок…
          </AddButton>
        </div>
      )}
      {isRoot && ids.length > 0 && (
        <button
          type="button"
          onClick={(e) => menu.openBelow(e.currentTarget, 'start')}
          data-testid="add-block"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong/80 py-3 text-sm font-medium text-muted transition hover:border-accent/60 hover:bg-accent-soft/40 hover:text-accent"
        >
          <Plus className="size-4" /> Добавить блок
        </button>
      )}
      <Menu
        position={menu.position}
        onClose={menu.close}
        items={accepted.map((type) => {
          const Icon = BLOCKS[type].icon;
          return { label: BLOCKS[type].label, icon: <Icon />, onSelect: () => addBlock(type, parentId) };
        })}
      />
    </div>
  );
}
