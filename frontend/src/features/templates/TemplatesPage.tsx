import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FilePlus2, LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react';
import type { DocumentType, TemplateSummary } from '@/types';
import { templatesApi } from '@/api';
import { useAsync } from '@/hooks/useAsync';
import { useIsAdmin } from '@/stores/authStore';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_META } from '@/lib/documentTypes';
import { cn, pluralize } from '@/lib/utils';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { confirm } from '@/components/ui/ConfirmDialog';
import { Segmented } from '@/components/ui/Segmented';
import { CreateDocumentModal } from '@/features/dashboard/CreateDocumentModal';
import { DocumentTypeIcon } from '@/features/dashboard/DocumentTypeIcon';

type Filter = 'all' | 'system' | 'mine';

function NewTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [docType, setDocType] = useState<DocumentType>('BUG_REPORT');
  const [name, setName] = useState('');
  const [isSystem, setIsSystem] = useState(false);
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // Start from the type's base template so the author doesn't begin empty.
      const base = (await templatesApi.list(docType)).find((t) => t.isDefault);
      const blocks = base ? (await templatesApi.get(base.id)).blocks : undefined;
      const template = await templatesApi.create({ name: name.trim(), docType, blocks, isSystem: isAdmin && isSystem });
      onClose();
      navigate(`/templates/${template.id}/edit`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новый шаблон"
      description="Шаблон откроется в конструкторе — настройте набор блоков"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={create} loading={saving} disabled={!name.trim()}>
            Создать и открыть
          </Button>
        </>
      }
    >
      <div className="space-y-5 p-6">
        <Field label="Название" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Bug Report для платежей" maxLength={200} data-autofocus />
        <div>
          <div className="mb-2 text-[13px] font-medium text-fg-soft">Тип документа</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DOCUMENT_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => setDocType(t.type)}
                className={cn('rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition', docType === t.type ? 'border-accent bg-accent-soft/50 ring-3 ring-accent/10' : 'border-line hover:border-line-strong')}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isSystem} onChange={(e) => setIsSystem(e.target.checked)} className="size-4 accent-[var(--c-accent)]" />
            Системный шаблон (доступен всем пользователям)
          </label>
        )}
      </div>
    </Modal>
  );
}

function TemplateCard({ template, onUse, onDelete }: { template: TemplateSummary; onUse: () => void; onDelete: () => void }) {
  const navigate = useNavigate();
  return (
    <article className="group flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-soft transition hover:border-line-strong hover:shadow-lift">
      <div className="flex items-start gap-3">
        <DocumentTypeIcon type={template.docType} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-semibold">{template.name}</h3>
            {template.isDefault && <span className="rounded bg-accent-soft px-1.5 py-px text-[10px] font-semibold text-accent">Базовый</span>}
            <span className={cn('rounded px-1.5 py-px text-[10px] font-semibold', template.isSystem ? 'bg-surface-3 text-muted' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300')}>
              {template.isSystem ? 'Системный' : 'Мой'}
            </span>
          </div>
          <p className="mt-1 mb-4 line-clamp-2 text-[13px] text-muted">{template.description || 'Без описания'}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-1 border-t border-line pt-3">
        <span className="text-xs text-muted">
          {DOCUMENT_TYPE_META[template.docType].label} · {pluralize(template.blocksCount, ['блок', 'блока', 'блоков'])}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          {template.canEdit && (
            <>
              <IconButton size="sm" label="Редактировать шаблон" onClick={() => navigate(`/templates/${template.id}/edit`)}>
                <Pencil />
              </IconButton>
              {!template.isDefault && (
                <IconButton size="sm" tone="danger" label="Удалить шаблон" onClick={onDelete}>
                  <Trash2 />
                </IconButton>
              )}
            </>
          )}
          <Button size="sm" variant="secondary" icon={<FilePlus2 className="size-3.5" />} onClick={onUse}>
            Использовать
          </Button>
        </div>
      </div>
    </article>
  );
}

export function TemplatesPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [newOpen, setNewOpen] = useState(false);
  const [useTemplate, setUseTemplate] = useState<TemplateSummary | null>(null);
  const templates = useAsync(() => templatesApi.list(), []);

  const remove = async (template: TemplateSummary) => {
    const ok = await confirm({ title: 'Удалить шаблон?', message: `Шаблон «${template.name}» будет удалён. Документы, созданные по нему, не изменятся.`, confirmLabel: 'Удалить', danger: true });
    if (!ok) return;
    try {
      await templatesApi.remove(template.id);
      templates.setData((list) => list?.filter((t) => t.id !== template.id));
      toast.success('Шаблон удалён');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const visible = (templates.data ?? []).filter((t) => (filter === 'all' ? true : filter === 'system' ? t.isSystem : !t.isSystem));

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Шаблоны</h1>
          <p className="mt-1 text-sm text-muted">Готовые структуры документов. Создавайте свои или сохраняйте документ как шаблон.</p>
        </div>
        <Button size="lg" icon={<Plus className="size-4" />} onClick={() => setNewOpen(true)}>
          Новый шаблон
        </Button>
      </section>

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Все' },
          { value: 'system', label: 'Системные' },
          { value: 'mine', label: 'Мои' },
        ]}
      />

      {templates.error ? (
        <ErrorState message={templates.error} onRetry={templates.reload} />
      ) : templates.loading && !templates.data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate />}
          title={filter === 'mine' ? 'У вас пока нет своих шаблонов' : 'Шаблонов нет'}
          description="Создайте шаблон здесь или в конструкторе через меню «Сохранить как шаблон»."
          className="rounded-2xl border border-dashed border-line"
        />
      ) : (
        DOCUMENT_TYPES.map((type) => {
          const group = visible.filter((t) => t.docType === type.type);
          if (!group.length) return null;
          return (
            <section key={type.type}>
              <h2 className="mb-3 text-sm font-semibold text-muted">
                {type.emoji} {type.label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((template) => (
                  <TemplateCard key={template.id} template={template} onUse={() => setUseTemplate(template)} onDelete={() => remove(template)} />
                ))}
              </div>
            </section>
          );
        })
      )}

      <NewTemplateModal open={newOpen} onClose={() => setNewOpen(false)} />
      <CreateDocumentModal open={Boolean(useTemplate)} onClose={() => setUseTemplate(null)} initialType={useTemplate?.docType} initialTemplateId={useTemplate?.id} />
    </div>
  );
}
