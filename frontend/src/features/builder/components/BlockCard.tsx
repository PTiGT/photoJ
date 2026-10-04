import { memo, useEffect, useRef, type MouseEvent } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ArrowDown, ArrowUp, ChevronRight, Copy, GripVertical, MoreHorizontal, Settings2, Trash2 } from 'lucide-react';
import { BLOCKS } from '@/blocks/registry';
import { BlockEditor } from '@/blocks/editors';
import { BlockSettingsPanel } from '@/blocks/settings/BlockSettingsPanel';
import { IconButton } from '@/components/ui/Button';
import { Menu, useMenu } from '@/components/ui/Menu';
import { isContainer } from '@/lib/blockTree';
import { cn, pluralize } from '@/lib/utils';
import { useBuilderStore } from '../store';
import { useDropStore, type DragData } from '../dnd';
import { blockMenuEntries, removeWithUndo } from './blockActions';
import { useHoverStore, useIsHovered } from '../hoverStore';
import { ChildrenList } from './ChildrenList';

function DropLine({ position }: { position: 'before' | 'after' }) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-x-1 z-20 h-0.5 rounded-full bg-accent', position === 'before' ? 'top-0' : 'bottom-0')}
      aria-hidden
    >
      <span className="absolute -top-[3px] -left-1 size-2 rounded-full border-2 border-accent bg-surface" />
    </div>
  );
}

/** Field label / group title edited inline in the card header. */
function HeaderLabel({ id, value, field, placeholder }: { id: string; value?: string; field: 'label' | 'title'; placeholder: string }) {
  const updateContent = useBuilderStore((s) => s.updateContent);
  return (
    <input
      value={value ?? ''}
      onChange={(e) => updateContent(id, { [field]: e.target.value }, field)}
      placeholder={placeholder}
      aria-label="Подпись блока"
      className="inline-input min-w-0 flex-1 px-1.5 py-0.5 text-[11.5px] font-semibold tracking-wider text-muted uppercase placeholder:tracking-normal placeholder:normal-case"
    />
  );
}

/** One block in the builder canvas: drag handle, inline editor, toolbar, nested children. */
export const BlockCard = memo(function BlockCard({ id }: { id: string }) {
  const block = useBuilderStore((s) => s.blocks.find((b) => b.id === id));
  const selected = useBuilderStore((s) => s.selectedId === id);
  const editing = useBuilderStore((s) => s.editingId === id);
  const shouldFocus = useBuilderStore((s) => s.focusId === id);
  const childCount = useBuilderStore((s) => (block && isContainer(block.type) ? s.blocks.filter((b) => b.parentId === id).length : 0));
  const hovered = useIsHovered(id);
  const indicator = useDropStore((s) => (s.target?.overId === id ? s.target.position : null));
  const menu = useMenu();
  const moreButton = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const dragData: DragData | undefined = block && { kind: 'block', id, type: block.type };
  const draggable = useDraggable({ id: `drag:${id}`, data: dragData });
  const droppable = useDroppable({ id, data: dragData });

  useEffect(() => {
    if (!shouldFocus || !cardRef.current) return;
    cardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    cardRef.current.querySelector<HTMLElement>('input, textarea')?.focus({ preventScroll: true });
    useBuilderStore.getState().clearFocus();
  }, [shouldFocus]);

  if (!block) return null;

  const definition = BLOCKS[block.type];
  const Icon = definition.icon;
  const compact = Boolean(definition.compact);
  const nested = block.parentId !== null;
  const nestedSection = nested && block.type === 'SECTION';
  const collapsed = Boolean(block.settings.collapsed);
  const store = useBuilderStore.getState();

  const openContextMenu = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('input, textarea, select')) return;
    event.preventDefault();
    event.stopPropagation();
    store.select(id);
    menu.openAt(event.clientX, event.clientY);
  };

  const handle = (
    <button
      ref={draggable.setActivatorNodeRef}
      type="button"
      {...draggable.listeners}
      {...draggable.attributes}
      aria-label={`Перетащить блок «${definition.label}»`}
      data-testid="drag-handle"
      className={cn(
        'flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-subtle transition hover:bg-surface-3 hover:text-fg active:cursor-grabbing',
        compact ? 'mt-1 h-6 w-4' : 'mt-0.5 h-7 w-5',
        !selected && !hovered && 'sm:opacity-0',
      )}
    >
      <GripVertical className="size-4" />
    </button>
  );

  const toolbar = (
    <div
      className={cn(
        'flex shrink-0 items-center gap-0.5 transition-opacity',
        selected || hovered ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:focus-within:opacity-100',
      )}
    >
      {definition.configurable && !compact && (
        <IconButton size="xs" label="Редактировать" active={editing} onClick={() => store.toggleEditing(id)}>
          <Settings2 />
        </IconButton>
      )}
      <span className="hidden items-center gap-0.5 md:flex">
        <IconButton size="xs" label="Переместить вверх" onClick={() => store.shiftBlock(id, -1)}>
          <ArrowUp />
        </IconButton>
        <IconButton size="xs" label="Переместить вниз" onClick={() => store.shiftBlock(id, 1)}>
          <ArrowDown />
        </IconButton>
        <IconButton size="xs" label="Дублировать" onClick={() => store.duplicateBlock(id)}>
          <Copy />
        </IconButton>
      </span>
      <IconButton size="xs" label="Удалить блок" tone="danger" onClick={() => removeWithUndo(id)}>
        <Trash2 />
      </IconButton>
      <IconButton ref={moreButton} size="xs" label="Ещё действия" onClick={() => menu.openBelow(moreButton.current!)}>
        <MoreHorizontal />
      </IconButton>
    </div>
  );

  const header = !compact && (
    <div className="mb-1.5 flex items-center gap-2">
      {block.type === 'SECTION' || block.type === 'STEP_GROUP' ? (
        <button
          type="button"
          onClick={() => store.updateSettings(id, { collapsed: !collapsed })}
          aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
          aria-expanded={!collapsed}
          className="flex size-6 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-fg"
        >
          <ChevronRight className={cn('size-4 transition-transform', !collapsed && 'rotate-90')} />
        </button>
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-3 text-muted" title={definition.label}>
          <Icon className="size-3.5" />
        </span>
      )}
      {block.type === 'SECTION' ? (
        <BlockEditor block={block} />
      ) : definition.labelKey ? (
        <HeaderLabel id={id} value={(block.content as Record<string, unknown>)[definition.labelKey] as string | undefined} field={definition.labelKey} placeholder={definition.label} />
      ) : (
        <span className="text-[11px] font-medium tracking-wide text-subtle uppercase">{definition.label}</span>
      )}
      {(block.type === 'SECTION' || block.type === 'STEP_GROUP') && collapsed && (
        <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] text-muted">{pluralize(childCount, ['элемент', 'элемента', 'элементов'])}</span>
      )}
      <div className="ml-auto">{toolbar}</div>
    </div>
  );

  const body =
    block.type === 'SECTION' || block.type === 'STEP_GROUP' ? null : (
      <div className={cn(!compact && 'pl-8')}>
        <BlockEditor block={block} />
      </div>
    );

  return (
    <div
      ref={droppable.setNodeRef}
      data-block-id={id}
      data-block-type={block.type}
      className={cn('relative', compact ? 'py-px' : 'py-1', draggable.isDragging && 'opacity-40')}
    >
      {indicator === 'before' && <DropLine position="before" />}
      <div
        ref={(node) => {
          cardRef.current = node;
          draggable.setNodeRef(node);
        }}
        data-testid="block-card"
        onPointerDown={() => !selected && store.select(id)}
        onFocusCapture={() => !selected && store.select(id)}
        onContextMenu={openContextMenu}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (useHoverStore.getState().id !== id) useHoverStore.getState().set(id);
        }}
        className={cn(
          'relative flex items-start gap-1 transition-colors',
          compact
            ? cn('rounded-lg px-1 py-0.5', selected ? 'bg-accent-soft/50' : 'hover:bg-surface-2')
            : nestedSection
              ? cn('rounded-r-xl border-l-2 py-2 pr-1 pl-1', selected ? 'border-accent bg-accent-soft/30' : 'border-line hover:border-line-strong')
              : cn(
                  'rounded-2xl border bg-surface p-3 pl-1.5 sm:p-4 sm:pl-2',
                  nested ? 'shadow-none' : 'shadow-soft',
                  selected ? 'border-accent/50 shadow-lift ring-3 ring-accent/10' : 'border-line hover:border-line-strong',
                ),
        )}
      >
        {handle}
        <div className="min-w-0 flex-1">
          {header}
          {compact ? (
            <div className="flex items-start">
              <BlockEditor block={block} />
              <div
                className={cn(
                  'absolute -top-3.5 right-28 z-10 rounded-lg border border-line bg-surface p-0.5 shadow-lift',
                  selected || hovered ? 'hidden sm:block' : 'hidden',
                )}
              >
                {toolbar}
              </div>
            </div>
          ) : (
            body
          )}
          {editing && <BlockSettingsPanel block={block} />}
          {isContainer(block.type) && !collapsed && (block.type !== 'CHECKBOX' || childCount > 0) && (
            <div className={cn(block.type === 'CHECKBOX' ? 'ml-5' : nestedSection ? 'mt-1 pl-6' : 'mt-2 sm:pl-8')}>
              <ChildrenList parentId={id} parentType={block.type} />
            </div>
          )}
        </div>
      </div>
      {indicator === 'after' && <DropLine position="after" />}
      <Menu position={menu.position} onClose={menu.close} items={menu.position ? blockMenuEntries(block) : []} align="end" />
    </div>
  );
});
