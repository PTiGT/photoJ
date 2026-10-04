import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Check, FilePlus2, User } from 'lucide-react';
import type { DocumentType, TemplateSummary } from '@/types';
import { documentsApi, templatesApi } from '@/api';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_META } from '@/lib/documentTypes';
import { cn, pluralize } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Feedback';
import { DocumentTypeIcon } from './DocumentTypeIcon';

interface CreateDocumentModalProps {
  open: boolean;
  onClose: () => void;
  initialType?: DocumentType;
  initialTemplateId?: string;
}

const BLANK = 'blank';

/** Two-step flow: choose the document type, then a template (or start from scratch). */
export function CreateDocumentModal({ open, onClose, initialType, initialTemplateId }: CreateDocumentModalProps) {
  const navigate = useNavigate();
  const [type, setType] = useState<DocumentType | null>(initialType ?? null);
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [choice, setChoice] = useState<string>(initialTemplateId ?? '');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setType(initialType ?? null);
      setChoice(initialTemplateId ?? '');
      setTitle('');
    }
  }, [open, initialType, initialTemplateId]);

  useEffect(() => {
    if (!open || !type) return;
    let active = true;
    setTemplates(null);
    templatesApi
      .list(type)
      .then((list) => {
        if (!active) return;
        setTemplates(list);
        setChoice((current) => current || list.find((t) => t.isDefault)?.id || list[0]?.id || BLANK);
      })
      .catch((error: Error) => {
        toast.error(error.message);
        if (active) setTemplates([]);
      });
    return () => {
      active = false;
    };
  }, [open, type]);

  const create = async () => {
    if (!type) return;
    setCreating(true);
    try {
      const doc = await documentsApi.create({
        type,
        title: title.trim() || undefined,
        ...(choice === BLANK ? { blank: true } : { templateId: choice }),
      });
      onClose();
      navigate(`/documents/${doc.id}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const meta = type ? DOCUMENT_TYPE_META[type] : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={meta ? `Новый документ · ${meta.label}` : 'Создать документ'}
      description={meta ? 'Выберите шаблон или начните с пустого документа' : 'Какой документ собираем?'}
      footer={
        type && (
          <>
            {!initialType && (
              <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => setType(null)} className="mr-auto">
                Назад
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={create} loading={creating} disabled={!choice} data-testid="create-document-submit">
              Создать документ
            </Button>
          </>
        )
      }
    >
      {!type ? (
        <div className="grid gap-2.5 p-5 sm:grid-cols-2 sm:p-6">
          {DOCUMENT_TYPES.map((item) => (
            <button
              key={item.type}
              type="button"
              data-testid={`type-${item.type}`}
              onClick={() => {
                setChoice('');
                setType(item.type);
              }}
              className="group flex items-start gap-3.5 rounded-xl border border-line p-4 text-left transition hover:border-accent/50 hover:bg-accent-soft/40 focus-visible:border-accent"
            >
              <DocumentTypeIcon type={item.type} />
              <span>
                <span className="block font-semibold">
                  {item.emoji} {item.label}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">{item.description}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-5 p-5 sm:p-6">
          <Field
            label="Название"
            placeholder={`${meta!.label} без названия`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            maxLength={200}
            data-autofocus
          />
          <div>
            <div className="mb-2 text-[13px] font-medium text-fg-soft">Шаблон</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <TemplateOption
                selected={choice === BLANK}
                onSelect={() => setChoice(BLANK)}
                title="Создать с нуля"
                description="Пустой холст — добавьте блоки сами"
                icon={<FilePlus2 className="size-4" />}
              />
              {templates === null
                ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-[74px]" />)
                : templates.map((template) => (
                    <TemplateOption
                      key={template.id}
                      selected={choice === template.id}
                      onSelect={() => setChoice(template.id)}
                      title={template.name}
                      description={template.description || pluralize(template.blocksCount, ['блок', 'блока', 'блоков'])}
                      badge={template.isSystem ? (template.isDefault ? 'Базовый' : undefined) : 'Мой'}
                      icon={template.isSystem ? <span className="text-sm">{meta!.emoji}</span> : <User className="size-4" />}
                    />
                  ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

interface TemplateOptionProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}

function TemplateOption({ selected, onSelect, title, description, icon, badge }: TemplateOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition',
        selected ? 'border-accent bg-accent-soft/50 ring-3 ring-accent/10' : 'border-line hover:border-line-strong',
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {badge && <span className="rounded bg-surface-3 px-1.5 py-px text-[10px] font-medium text-muted">{badge}</span>}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{description}</span>
      </span>
      {selected && <Check className="absolute top-3 right-3 size-4 text-accent" />}
    </button>
  );
}
