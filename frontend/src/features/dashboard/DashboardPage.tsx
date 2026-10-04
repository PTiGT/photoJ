import { useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, FileText, Plus, Search, Star, X } from 'lucide-react';
import { exportDocumentsToExcel } from '@/features/builder/exportDocument';
import type { DocumentSummary, DocumentType } from '@/types';
import { documentsApi } from '@/api';
import { useAsync, useDebouncedValue } from '@/hooks/useAsync';
import { useAuthStore } from '@/stores/authStore';
import { DOCUMENT_TYPES } from '@/lib/documentTypes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Segmented } from '@/components/ui/Segmented';
import { confirm } from '@/components/ui/ConfirmDialog';
import { DocumentCard } from './DocumentCard';
import { DocumentTypeIcon } from './DocumentTypeIcon';
import { CreateDocumentModal } from './CreateDocumentModal';

type Tab = 'all' | 'favorites';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[124px] rounded-2xl" />
      ))}
    </div>
  );
}

/** Shared optimistic actions for document cards. */
function useDocumentActions(onChange: () => void, patch: (fn: (docs: DocumentSummary[]) => DocumentSummary[]) => void) {
  return {
    toggleFavorite: async (doc: DocumentSummary) => {
      patch((docs) => docs.map((d) => (d.id === doc.id ? { ...d, isFavorite: !d.isFavorite } : d)));
      try {
        await documentsApi.setFavorite(doc.id, !doc.isFavorite);
        onChange();
      } catch (error) {
        patch((docs) => docs.map((d) => (d.id === doc.id ? { ...d, isFavorite: doc.isFavorite } : d)));
        toast.error((error as Error).message);
      }
    },
    duplicate: async (doc: DocumentSummary) => {
      try {
        await documentsApi.duplicate(doc.id);
        toast.success('Документ продублирован');
        onChange();
      } catch (error) {
        toast.error((error as Error).message);
      }
    },
    remove: async (doc: DocumentSummary) => {
      const ok = await confirm({
        title: 'Удалить документ?',
        message: `«${doc.title}» и вся история версий будут удалены без возможности восстановления.`,
        confirmLabel: 'Удалить',
        danger: true,
      });
      if (!ok) return;
      try {
        await documentsApi.remove(doc.id);
        patch((docs) => docs.filter((d) => d.id !== doc.id));
        toast.success('Документ удалён');
        onChange();
      } catch (error) {
        toast.error((error as Error).message);
      }
    },
  };
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [createType, setCreateType] = useState<DocumentType | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<DocumentType | undefined>();
  const [tab, setTab] = useState<Tab>('all');
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const recent = useAsync((signal) => documentsApi.list({ limit: 4 }, signal), []);
  const docs = useAsync(
    (signal) => documentsApi.list({ search: debouncedSearch || undefined, type, favorite: tab === 'favorites' }, signal),
    [debouncedSearch, type, tab],
  );

  const refreshAll = () => {
    recent.reload();
    docs.reload();
  };
  const patchBoth = (fn: (d: DocumentSummary[]) => DocumentSummary[]) => {
    docs.setData((d) => d && fn(d));
    recent.setData((d) => d && fn(d));
  };
  const actions = useDocumentActions(refreshAll, patchBoth);

  // Multi-select for exporting several documents into one Excel workbook
  const [selected, setSelected] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const toggleSelect = (doc: DocumentSummary) =>
    setSelected((ids) => (ids.includes(doc.id) ? ids.filter((id) => id !== doc.id) : [...ids, doc.id]));
  const exportSelected = async () => {
    setExporting(true);
    if (await exportDocumentsToExcel(selected)) setSelected([]);
    setExporting(false);
  };
  const cardProps = (doc: DocumentSummary) => ({
    document: doc,
    selected: selected.includes(doc.id),
    selectionMode: selected.length > 0,
    onToggleSelect: toggleSelect,
    onToggleFavorite: actions.toggleFavorite,
    onDuplicate: actions.duplicate,
    onDelete: actions.remove,
  });

  const openCreate = (preset?: DocumentType) => {
    setCreateType(preset);
    setCreateOpen(true);
  };

  const filtered = Boolean(debouncedSearch || type || tab === 'favorites');
  const hasAnyDocuments = (recent.data?.length ?? 0) > 0;

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{greeting()}, {user?.name.split(' ')[0]}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">Ваши QA-документы</h1>
        </div>
        <Button size="lg" icon={<Plus className="size-4" />} onClick={() => openCreate()} data-testid="create-document">
          Создать документ
        </Button>
      </section>

      <section aria-label="Быстрое создание" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {DOCUMENT_TYPES.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => openCreate(item.type)}
            className="group flex items-center gap-3 rounded-2xl border border-dashed border-line-strong/70 bg-surface/50 p-3.5 text-left transition hover:border-solid hover:border-accent/40 hover:bg-surface hover:shadow-soft"
          >
            <DocumentTypeIcon type={item.type} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{item.label}</span>
              <span className="flex items-center gap-1 text-xs text-muted group-hover:text-accent">
                <Plus className="size-3" /> Новый
              </span>
            </span>
          </button>
        ))}
      </section>

      {hasAnyDocuments && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted">Последние документы</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recent.data!.map((doc) => (
              <DocumentCard key={doc.id} {...cardProps(doc)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <h2 className="text-lg font-semibold tracking-tight">Мои документы</h2>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'all', label: 'Все' },
                { value: 'favorites', label: <><Star /> Избранное</> },
              ]}
            />
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию"
                aria-label="Поиск документов"
                className="field-input h-9 pl-9"
              />
            </div>
          </div>
        </div>

        <div className="scroll-thin -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <FilterChip active={!type} onClick={() => setType(undefined)}>
            Все типы
          </FilterChip>
          {DOCUMENT_TYPES.map((item) => (
            <FilterChip key={item.type} active={type === item.type} onClick={() => setType(type === item.type ? undefined : item.type)}>
              {item.emoji} {item.label}
            </FilterChip>
          ))}
        </div>

        {docs.error ? (
          <ErrorState message={docs.error} onRetry={docs.reload} />
        ) : docs.loading && !docs.data ? (
          <CardsSkeleton />
        ) : docs.data && docs.data.length > 0 ? (
          <div className={cn('grid gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3', docs.loading && 'opacity-60')}>
            {docs.data.map((doc) => (
              <DocumentCard key={doc.id} {...cardProps(doc)} />
            ))}
          </div>
        ) : filtered ? (
          <EmptyState
            icon={tab === 'favorites' ? <Star /> : <Search />}
            title={tab === 'favorites' && !debouncedSearch && !type ? 'Нет избранных документов' : 'Ничего не найдено'}
            description={tab === 'favorites' ? 'Отмечайте важные документы звёздочкой, чтобы они были под рукой.' : 'Попробуйте изменить запрос или фильтр.'}
            action={
              <Button
                variant="outline"
                icon={<X className="size-4" />}
                onClick={() => {
                  setSearch('');
                  setType(undefined);
                  setTab('all');
                }}
              >
                Сбросить фильтры
              </Button>
            }
            className="rounded-2xl border border-dashed border-line"
          />
        ) : (
          <EmptyState
            icon={<FileText />}
            title="Здесь появятся ваши документы"
            description="Выберите тип документа — конструктор сразу подготовит структуру, останется заполнить."
            action={
              <Button icon={<Plus className="size-4" />} onClick={() => openCreate()}>
                Создать первый документ
              </Button>
            }
            className="rounded-2xl border border-dashed border-line"
          />
        )}
      </section>

      <CreateDocumentModal open={createOpen} onClose={() => setCreateOpen(false)} initialType={createType} />

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 sm:bottom-6" role="region" aria-label="Выбранные документы">
          <div className="flex animate-slide-up items-center gap-2 rounded-2xl border border-line bg-surface py-2 pr-2 pl-4 shadow-pop">
            <span className="text-sm font-medium whitespace-nowrap">Выбрано: {selected.length}</span>
            <Button size="sm" icon={<FileSpreadsheet className="size-4" />} loading={exporting} onClick={exportSelected} data-testid="export-selected">
              Экспорт в Excel
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Отмена
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1 text-[13px] font-medium transition',
        active ? 'border-fg bg-fg text-canvas' : 'border-line bg-surface text-fg-soft hover:border-line-strong',
      )}
    >
      {children}
    </button>
  );
}
