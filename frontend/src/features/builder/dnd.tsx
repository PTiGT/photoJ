import { useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { BlockType } from '@/types';
import { BLOCKS } from '@/blocks/registry';
import { canContain, childrenOf, descendantIds, findBlock } from '@/lib/blockTree';
import { useBuilderStore } from './store';

export type DragData =
  | { kind: 'palette'; type: BlockType }
  | { kind: 'block'; id: string; type: BlockType }
  | { kind: 'zone'; parentId: string | null };

export interface DropTarget {
  parentId: string | null;
  index: number;
  /** Block the indicator is drawn on, or `zone:<parent>` for container ends */
  overId: string;
  position: 'before' | 'after' | 'inside';
}

interface DropState {
  target: DropTarget | null;
  dragging: DragData | null;
  set: (patch: Partial<Pick<DropState, 'target' | 'dragging'>>) => void;
}

/** Tiny store so each card can subscribe to "is the drop indicator on me?". */
export const useDropStore = create<DropState>((set) => ({ target: null, dragging: null, set }));

export const zoneId = (parentId: string | null) => `zone:${parentId ?? 'root'}`;

/** Chooses the innermost droppable under the pointer (smallest area wins). */
function innermost(forbidden: React.RefObject<Set<string>>): CollisionDetection {
  return (args) => {
    const hits = pointerWithin(args);
    const candidates = (hits.length ? hits : rectIntersection(args)).filter((c) => !forbidden.current.has(String(c.id)));
    const area = (id: string | number) => {
      const rect = args.droppableRects.get(id);
      return rect ? rect.width * rect.height : Infinity;
    };
    return candidates.sort((a, b) => area(a.id) - area(b.id)).slice(0, 1);
  };
}

function pointerY(event: DragMoveEvent) {
  const activator = event.activatorEvent as PointerEvent | TouchEvent;
  const start = 'touches' in activator ? activator.touches[0]?.clientY ?? 0 : activator.clientY;
  return start + event.delta.y;
}

/** Computes where the dragged item would land for the current pointer position. */
function computeTarget(event: DragMoveEvent): DropTarget | null {
  const { over, active } = event;
  if (!over) return null;
  const data = active.data.current as DragData;
  const overData = over.data.current as DragData | undefined;
  const { blocks } = useBuilderStore.getState();

  let target: DropTarget | null = null;
  if (overData?.kind === 'zone') {
    target = {
      parentId: overData.parentId,
      index: childrenOf(blocks, overData.parentId).length,
      overId: zoneId(overData.parentId),
      position: 'inside',
    };
  } else if (overData?.kind === 'block') {
    const overBlock = findBlock(blocks, overData.id);
    if (!overBlock) return null;
    const before = pointerY(event) < over.rect.top + over.rect.height / 2;
    const parentId = overBlock.parentId ?? null;
    const siblings = childrenOf(blocks, parentId).filter((b) => data.kind !== 'block' || b.id !== data.id);
    const index = siblings.findIndex((b) => b.id === overBlock.id) + (before ? 0 : 1);
    target = { parentId, index, overId: overBlock.id, position: before ? 'before' : 'after' };
  }
  if (!target) return null;

  const parentType = findBlock(blocks, target.parentId)?.type ?? null;
  const type = data.kind === 'zone' ? null : data.type;
  if (!type || !canContain(parentType, type)) return null;
  return target;
}

export function BuilderDndProvider({ children }: { children: ReactNode }) {
  const forbidden = useRef<Set<string>>(new Set());
  const [overlay, setOverlay] = useState<DragData | null>(null);
  const setDrop = useDropStore((s) => s.set);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData;
    // A block can't be dropped into itself or its descendants.
    if (data.kind === 'block') {
      const ids = [data.id, ...descendantIds(useBuilderStore.getState().blocks, data.id)];
      forbidden.current = new Set([...ids, ...ids.map((id) => zoneId(id))]);
    } else {
      forbidden.current = new Set();
    }
    setOverlay(data);
    setDrop({ dragging: data, target: null });
  };

  const onDragMove = (event: DragMoveEvent) => {
    const next = computeTarget(event);
    const current = useDropStore.getState().target;
    if (next?.overId !== current?.overId || next?.index !== current?.index || next?.position !== current?.position) {
      setDrop({ target: next });
    }
  };

  const finish = () => {
    setOverlay(null);
    setDrop({ dragging: null, target: null });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const target = useDropStore.getState().target;
    const data = event.active.data.current as DragData;
    finish();
    if (!target) return;
    const store = useBuilderStore.getState();
    if (data.kind === 'palette') store.addBlock(data.type, target.parentId, target.index);
    if (data.kind === 'block') {
      store.moveBlock(data.id, target.parentId, target.index);
      store.select(data.id);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={innermost(forbidden)}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragOver={onDragMove as never}
      onDragEnd={onDragEnd}
      onDragCancel={finish}
      autoScroll={{ threshold: { x: 0, y: 0.15 } }}
    >
      {children}
      <DragOverlay dropAnimation={null}>{overlay && <DragPreview data={overlay} />}</DragOverlay>
    </DndContext>
  );
}

function DragPreview({ data }: { data: DragData }) {
  if (data.kind === 'zone') return null;
  const definition = BLOCKS[data.type];
  const Icon = definition.icon;
  const block = data.kind === 'block' ? findBlock(useBuilderStore.getState().blocks, data.id) : null;
  const summary = block ? (block.content as { label?: string; title?: string; text?: string }) : null;
  const text = summary?.title || summary?.label || summary?.text || '';
  return (
    <div className="flex w-64 cursor-grabbing items-center gap-2.5 rounded-xl border border-accent/40 bg-surface px-3 py-2.5 shadow-pop">
      <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold">{definition.label}</span>
        {text && <span className="block truncate text-xs text-muted">{text}</span>}
      </span>
    </div>
  );
}
