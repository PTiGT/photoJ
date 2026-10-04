import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { History, RotateCcw, X } from 'lucide-react';
import { documentsApi } from '@/api';
import type { VersionDetails, VersionSummary } from '@/types';
import { DocumentPreview } from '@/blocks/preview/DocumentPreview';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { confirm } from '@/components/ui/ConfirmDialog';
import { cn, formatDateTime, formatRelative } from '@/lib/utils';
import { useBuilderStore } from '../store';

interface VersionsPanelProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
}

/** Slide-over listing document versions; a version can be previewed and restored. */
export function VersionsPanel({ open, onClose, documentId }: VersionsPanelProps) {
  const latestVersion = useBuilderStore((s) => s.latestVersion);
  const docType = useBuilderStore((s) => s.source?.docType);
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<VersionDetails | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    documentsApi
      .versions(documentId)
      .then(setVersions)
      .catch((e: Error) => setError(e.message));
  }, [open, documentId, latestVersion]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !viewing && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, viewing, onClose]);

  const view = async (version: VersionSummary) => {
    setLoadingId(version.id);
    try {
      setViewing(await documentsApi.version(documentId, version.id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingId(null);
    }
  };

  const restore = async () => {
    if (!viewing) return;
    const ok = await confirm({
      title: `Восстановить версию ${viewing.number}?`,
      message: 'Текущее содержимое будет заменено. Действие можно отменить через Ctrl+Z.',
      confirmLabel: 'Восстановить',
    });
    if (!ok) return;
    useBuilderStore.getState().replaceBlocks(viewing.blocks, viewing.title);
    toast.success(`Версия ${viewing.number} восстановлена`);
    setViewing(null);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 animate-fade-in bg-slate-950/20" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm animate-slide-in-right flex-col border-l border-line bg-surface shadow-pop" aria-label="История версий">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <History className="size-4 text-muted" />
          <h2 className="font-semibold">История версий</h2>
          <IconButton label="Закрыть" size="sm" className="ml-auto" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <p className="border-b border-line bg-surface-2 px-5 py-2.5 text-xs text-muted">
          Версия создаётся при ручном сохранении (Ctrl+S) и автоматически раз в 10 минут работы.
        </p>
        <div className="scroll-thin flex-1 overflow-y-auto p-3">
          {error ? (
            <ErrorState message={error} />
          ) : !versions ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : versions.length === 0 ? (
            <EmptyState icon={<History />} title="Пока нет версий" />
          ) : (
            <ol className="relative space-y-1 before:absolute before:top-4 before:bottom-4 before:left-[21px] before:w-px before:bg-line">
              {versions.map((version, index) => (
                <li key={version.id}>
                  <button
                    type="button"
                    onClick={() => view(version)}
                    disabled={loadingId === version.id}
                    data-testid="version-item"
                    className="relative flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition hover:bg-surface-2"
                  >
                    <span className={cn('relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-surface', index === 0 ? 'bg-accent' : 'bg-line-strong')} style={{ marginLeft: 6 }} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        Версия {version.number}
                        {index === 0 && <span className="rounded bg-accent-soft px-1.5 py-px text-[10px] font-medium text-accent">последняя</span>}
                      </span>
                      <span className="block text-xs text-muted">
                        {formatDateTime(version.createdAt)} · {formatRelative(version.createdAt)}
                      </span>
                      {version.authorName && <span className="block truncate text-xs text-subtle">{version.authorName}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        size="xl"
        title={viewing ? `Версия ${viewing.number}` : ''}
        description={viewing ? `Сохранена ${formatDateTime(viewing.createdAt)} · только просмотр` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setViewing(null)}>
              Закрыть
            </Button>
            <Button icon={<RotateCcw className="size-4" />} onClick={restore}>
              Восстановить эту версию
            </Button>
          </>
        }
      >
        {viewing && docType && (
          <div className="bg-canvas p-4 sm:p-8">
            <DocumentPreview title={viewing.title} docType={docType} blocks={viewing.blocks} updatedAt={viewing.createdAt} version={viewing.number} className="mx-auto max-w-3xl" />
          </div>
        )}
      </Modal>
    </>,
    document.body,
  );
}
