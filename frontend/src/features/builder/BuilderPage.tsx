import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Eye, FileText, LayoutGrid, Printer, SquarePen, Table2 } from 'lucide-react';
import { documentsApi, templatesApi, ApiError } from '@/api';
import type { Block, BlockOf, CheckStatus, DocumentType, ExportFormat } from '@/types';
import { DocumentPreview, TABLE_VIEW_TYPES, type PreviewView } from '@/blocks/preview/DocumentPreview';
import { Segmented } from '@/components/ui/Segmented';
import { useAuthStore } from '@/stores/authStore';
import { documentRuns, resultFor, resultPatch } from '@/lib/runs';
import { Button } from '@/components/ui/Button';
import { ErrorState, FullScreenLoader } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { cn } from '@/lib/utils';
import { useBuilderStore, type BuilderSource, type SourceKind } from './store';
import { drafts, useAutosave } from './persistence';
import { BuilderDndProvider } from './dnd';
import { useBuilderHotkeys } from './useBuilderHotkeys';
import { exportDocument } from './exportDocument';
import { BuilderHeader } from './components/BuilderHeader';
import { Palette } from './components/Palette';
import { Canvas } from './components/Canvas';
import { VersionsPanel } from './components/VersionsPanel';
import { ShortcutsModal } from './components/ShortcutsModal';

type MobilePane = 'components' | 'builder' | 'preview';

const sameContent = (a: { title: string; blocks: Block[] }, b: { title: string; blocks: Block[] }) =>
  a.title === b.title && JSON.stringify(a.blocks) === JSON.stringify(b.blocks);

/** Loads a document or template into the builder store; restores unsaved local drafts. */
function useBuilderSource(kind: SourceKind, id: string) {
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: true, error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: null });
    const request: Promise<BuilderSource> =
      kind === 'document'
        ? documentsApi.get(id).then((doc) => ({ kind, id, title: doc.title, docType: doc.type, blocks: doc.blocks, latestVersion: doc.latestVersion, updatedAt: doc.updatedAt }))
        : templatesApi.get(id).then((tpl) => {
            if (!tpl.canEdit) throw new ApiError('Этот шаблон нельзя редактировать', 403);
            return { kind, id, title: tpl.name, docType: tpl.docType, blocks: tpl.blocks, updatedAt: tpl.updatedAt };
          });

    request
      .then((source) => {
        if (!active) return;
        useBuilderStore.getState().load(source);
        const draft = drafts.read(kind, id);
        if (draft && source.updatedAt && draft.at > Date.parse(source.updatedAt) && !sameContent(draft, source)) {
          useBuilderStore.getState().replaceBlocks(draft.blocks, draft.title);
          toast.info('Восстановлены несохранённые изменения', {
            description: 'Они будут сохранены автоматически.',
            action: { label: 'Отменить', onClick: () => useBuilderStore.getState().undo() },
          });
        } else if (draft) {
          drafts.clear(kind, id);
        }
        setState({ loading: false, error: null });
      })
      .catch((error: Error) => active && setState({ loading: false, error: error.message }));

    return () => {
      active = false;
    };
  }, [kind, id, nonce]);

  return { ...state, retry: () => setNonce((n) => n + 1) };
}

/** Sets a check's status for one run straight from the table preview. */
function setCheckStatus(checkId: string, runIndex: number, status: CheckStatus) {
  const { blocks, updateContent } = useBuilderStore.getState();
  const check = blocks.find((b): b is BlockOf<'CHECKBOX'> => b.id === checkId && b.type === 'CHECKBOX');
  const run = documentRuns(blocks)[runIndex];
  if (!check || !run) return;
  const current = resultFor(check, run, runIndex);
  updateContent<'CHECKBOX'>(checkId, resultPatch(check, run, runIndex, { ...current, status }));
}

function PreviewPane({ view }: { view: PreviewView }) {
  const blocks = useDeferredValue(useBuilderStore((s) => s.blocks));
  const title = useDeferredValue(useBuilderStore((s) => s.title));
  const source = useBuilderStore((s) => s.source);
  const lastSavedAt = useBuilderStore((s) => s.lastSavedAt);
  const version = useBuilderStore((s) => s.latestVersion);
  const ownerName = useAuthStore((s) => s.user?.name);
  if (!source) return null;
  return (
    <DocumentPreview
      title={title}
      docType={source.docType}
      blocks={blocks}
      updatedAt={lastSavedAt}
      version={source.kind === 'document' ? version : undefined}
      view={view}
      ownerName={ownerName}
      onStatusChange={setCheckStatus}
    />
  );
}

/** Table/document preview mode, remembered per viewer. */
function usePreviewView(docType: DocumentType | undefined) {
  const [view, setView] = useState<PreviewView>(() => {
    try {
      return (localStorage.getItem('qa-preview-view') as PreviewView) || 'table';
    } catch {
      return 'table';
    }
  });
  const change = (next: PreviewView) => {
    setView(next);
    try {
      localStorage.setItem('qa-preview-view', next);
    } catch {
      /* ignore */
    }
  };
  const available = Boolean(docType && TABLE_VIEW_TYPES.includes(docType));
  return { view: available ? view : ('document' as PreviewView), setView: change, available };
}

function PreviewViewToggle({ view, onChange }: { view: PreviewView; onChange: (view: PreviewView) => void }) {
  return (
    <Segmented
      size="sm"
      value={view}
      onChange={onChange}
      options={[
        { value: 'table', label: <><Table2 /> Таблица</>, title: 'Как в Excel / Google Sheets' },
        { value: 'document', label: <><FileText /> Документ</> },
      ]}
    />
  );
}

function useSaveAsTemplate({ open, onClose, documentId }: { open: boolean; onClose: () => void; documentId: string }) {
  const title = useBuilderStore((s) => s.title);
  const docType = useBuilderStore((s) => s.source?.docType);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setName(title);
      setDescription('');
    }
  }, [open, title]);

  const submit = async (flush: () => Promise<boolean>) => {
    if (!docType || !name.trim()) return;
    setSaving(true);
    try {
      await flush();
      await templatesApi.create({ name: name.trim(), description: description.trim(), docType, fromDocumentId: documentId });
      toast.success('Шаблон сохранён', { action: { label: 'Открыть', onClick: () => navigate('/templates') } });
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return { name, setName, description, setDescription, saving, submit, open, onClose };
}

function BuilderScreen({ kind, id }: { kind: SourceKind; id: string }) {
  const { loading, error, retry } = useBuilderSource(kind, id);
  const save = useAutosave();
  const [mobilePane, setMobilePane] = useState<MobilePane>('builder');
  const [previewVisible, setPreviewVisible] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const docType = useBuilderStore((s) => s.source?.docType);
  const preview = usePreviewView(docType);
  const template = useSaveAsTemplate({ open: templateOpen, onClose: () => setTemplateOpen(false), documentId: id });

  const manualSave = useCallback(async () => {
    const ok = await save({ createVersion: kind === 'document' });
    if (!ok) return;
    const version = useBuilderStore.getState().latestVersion;
    toast.success(kind === 'document' ? `Сохранено · версия ${version}` : 'Шаблон сохранён');
  }, [save, kind]);

  useBuilderHotkeys({ onSave: manualSave });

  const onExport = (format: ExportFormat) => exportDocument(id, format, () => save());

  if (loading) return <FullScreenLoader label="Открываем конструктор…" />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  const paneClass = (pane: MobilePane) => (mobilePane === pane ? 'flex' : 'hidden');

  return (
    <BuilderDndProvider>
      <div className="flex h-dvh flex-col bg-canvas">
        <BuilderHeader
          onSave={manualSave}
          onRetry={() => void save()}
          onPreview={() => setPreviewOpen(true)}
          onExport={onExport}
          onHistory={() => setHistoryOpen(true)}
          onSaveAsTemplate={() => setTemplateOpen(true)}
          onShortcuts={() => setShortcutsOpen(true)}
          previewVisible={previewVisible}
          onTogglePreview={() => setPreviewVisible((v) => !v)}
        />

        <div className="flex min-h-0 flex-1">
          {/* Components */}
          <aside className={cn(paneClass('components'), 'w-full flex-col border-r border-line bg-surface-2/60 lg:flex lg:w-64 xl:w-72')} aria-label="Компоненты">
            <Palette onAdded={() => setMobilePane('builder')} />
          </aside>

          {/* Builder */}
          <main className={cn(paneClass('builder'), 'scroll-thin min-w-0 flex-1 flex-col overflow-y-auto pb-16 lg:flex lg:pb-0')} aria-label="Конструктор" data-testid="canvas">
            <Canvas />
          </main>

          {/* Preview */}
          <aside
            className={cn(
              paneClass('preview'),
              'scroll-thin w-full flex-col overflow-y-auto border-l border-line bg-surface-3/50 pb-16 lg:hidden lg:pb-0',
              previewVisible && 'xl:flex xl:w-[40%] xl:max-w-[640px] 2xl:w-[42%]',
            )}
            aria-label="Предпросмотр"
          >
            <div className="flex items-center justify-between gap-2 px-5 pt-4 text-xs font-semibold tracking-wider text-muted uppercase">
              Preview
              {preview.available ? (
                <PreviewViewToggle view={preview.view} onChange={preview.setView} />
              ) : (
                <span className="flex items-center gap-1.5 font-normal tracking-normal normal-case">
                  <span className="size-1.5 animate-pulse rounded-full bg-success" /> обновляется вживую
                </span>
              )}
            </div>
            <div className="p-3 sm:p-5">
              <PreviewPane view={preview.view} />
            </div>
          </aside>
        </div>

        {/* Mobile / tablet navigation between the three panes */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 backdrop-blur lg:hidden" aria-label="Режим конструктора">
          {(
            [
              ['components', 'Компоненты', LayoutGrid],
              ['builder', 'Конструктор', SquarePen],
              ['preview', 'Просмотр', Eye],
            ] as const
          ).map(([pane, label, Icon], index) => (
            <button
              key={pane}
              type="button"
              onClick={() => setMobilePane(pane)}
              aria-current={mobilePane === pane}
              className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium', mobilePane === pane ? 'text-accent' : 'text-muted')}
            >
              <Icon className="size-5" />
              <span>
                {index + 1}. {label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size={preview.view === 'table' ? 'wide' : 'xl'}
        title="Предпросмотр"
        description="Так документ будет выглядеть после экспорта"
        footer={
          <>
            <Button variant="ghost" icon={<Printer className="size-4" />} onClick={() => window.print()}>
              Печать
            </Button>
            {kind === 'document' && (
              <Button variant="outline" onClick={() => onExport('pdf')}>
                Скачать PDF
              </Button>
            )}
            <Button onClick={() => setPreviewOpen(false)}>Готово</Button>
          </>
        }
      >
        <div className="print-area bg-canvas p-3 sm:p-8">
          {preview.available && (
            <div className="mx-auto mb-3 flex justify-end">
              <PreviewViewToggle view={preview.view} onChange={preview.setView} />
            </div>
          )}
          <div className={cn('mx-auto', preview.view === 'table' ? 'max-w-none' : 'max-w-3xl')}>
            <PreviewPane view={preview.view} />
          </div>
        </div>
      </Modal>

      {kind === 'document' && <VersionsPanel open={historyOpen} onClose={() => setHistoryOpen(false)} documentId={id} />}
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Modal
        open={template.open}
        onClose={template.onClose}
        size="sm"
        title="Сохранить как шаблон"
        description="Структура документа станет шаблоном для новых документов этого типа"
        footer={
          <>
            <Button variant="ghost" onClick={template.onClose}>
              Отмена
            </Button>
            <Button loading={template.saving} disabled={!template.name.trim()} onClick={() => template.submit(() => save())}>
              Сохранить шаблон
            </Button>
          </>
        }
      >
        <div className="space-y-4 p-6">
          <Field label="Название шаблона" value={template.name} onChange={(e) => template.setName(e.target.value)} maxLength={200} />
          <Field label="Описание" value={template.description} onChange={(e) => template.setDescription(e.target.value)} maxLength={500} placeholder="Для чего этот шаблон" />
        </div>
      </Modal>
    </BuilderDndProvider>
  );
}

export function DocumentBuilderPage() {
  const { id = '' } = useParams();
  return <BuilderScreen key={id} kind="document" id={id} />;
}

export function TemplateBuilderPage() {
  const { id = '' } = useParams();
  return <BuilderScreen key={id} kind="template" id={id} />;
}
