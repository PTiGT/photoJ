import { useMemo } from 'react';
import { MousePointerClick } from 'lucide-react';
import { useBuilderStore } from '../store';
import { stepNumbers } from '@/lib/blockTree';
import { declaredRuns } from '@/lib/runs';
import { BlockRenderContext } from '@/blocks/editors/context';
import { useDropStore } from '../dnd';
import { cn } from '@/lib/utils';
import { ChildrenList } from './ChildrenList';
import { useHoverStore } from '../hoverStore';

/** Center area: the document being assembled. */
export function Canvas() {
  const blocks = useBuilderStore((s) => s.blocks);
  const source = useBuilderStore((s) => s.source);
  const dragging = useDropStore((s) => Boolean(s.dragging));
  const numbers = useMemo(() => stepNumbers(blocks), [blocks]);
  const runs = useMemo(() => declaredRuns(blocks), [blocks]);
  const context = useMemo(
    () => ({ stepNumbers: numbers, documentId: source?.kind === 'document' ? source.id : null, runs }),
    [numbers, source, runs],
  );

  return (
    <BlockRenderContext.Provider value={context}>
      <div
        className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-6 sm:py-8"
        onPointerDown={(e) => e.target === e.currentTarget && useBuilderStore.getState().select(null)}
        onPointerOver={(e) => e.target === e.currentTarget && useHoverStore.getState().set(null)}
        onPointerLeave={() => useHoverStore.getState().set(null)}
      >
        <ChildrenList
          parentId={null}
          parentType={null}
          empty={
          <div
            className={cn(
              'mb-2 flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition',
              dragging ? 'border-accent bg-accent-soft/50' : 'border-line-strong/70',
            )}
          >
            <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <MousePointerClick className="size-5" />
            </div>
            <h3 className="font-semibold">Соберите документ из блоков</h3>
            <p className="mt-1 max-w-sm text-sm text-muted">Перетащите компонент сюда или кликните по нему в панели компонентов.</p>
          </div>
          }
        />
      </div>
    </BlockRenderContext.Provider>
  );
}
