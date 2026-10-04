import { useRef } from 'react';
import { Link } from 'react-router';
import { Check, CheckSquare, Copy, ExternalLink, MoreHorizontal, Star, Trash2 } from 'lucide-react';
import type { DocumentSummary } from '@/types';
import { DOCUMENT_TYPE_META } from '@/lib/documentTypes';
import { cn, formatRelative, pluralize } from '@/lib/utils';
import { IconButton } from '@/components/ui/Button';
import { Menu, useMenu } from '@/components/ui/Menu';
import { DocumentTypeIcon } from './DocumentTypeIcon';

interface DocumentCardProps {
  document: DocumentSummary;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
  onDuplicate: (doc: DocumentSummary) => void;
  onDelete: (doc: DocumentSummary) => void;
}

export function DocumentCard({ document: doc, selected = false, selectionMode = false, onToggleSelect, onToggleFavorite, onDuplicate, onDelete }: DocumentCardProps) {
  const menu = useMenu();
  const trigger = useRef<HTMLButtonElement>(null);
  const items = [
    { label: 'Открыть', icon: <ExternalLink />, onSelect: () => trigger.current?.closest('article')?.querySelector('a')?.click() },
    { label: 'Дублировать', icon: <Copy />, onSelect: () => onDuplicate(doc) },
    ...(onToggleSelect ? [{ label: selected ? 'Снять выбор' : 'Выбрать для экспорта', icon: <CheckSquare />, onSelect: () => onToggleSelect(doc) }] : []),
    'separator' as const,
    { label: 'Удалить', icon: <Trash2 />, danger: true, onSelect: () => onDelete(doc) },
  ];

  return (
    <article
      data-testid="document-card"
      onContextMenu={(e) => {
        e.preventDefault();
        menu.openAt(e.clientX, e.clientY);
      }}
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift',
        selected ? 'border-accent ring-3 ring-accent/15' : 'border-line hover:border-line-strong',
      )}
    >
      {onToggleSelect && (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Выбрать «${doc.title}»`}
          data-testid="select-document"
          onClick={() => onToggleSelect(doc)}
          className={cn(
            'absolute top-3 right-3 z-20 flex size-5 items-center justify-center rounded-md border transition',
            selected ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong bg-surface',
            selected || selectionMode ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100',
          )}
        >
          {selected && <Check className="size-3.5" strokeWidth={3} />}
        </button>
      )}
      <div className="flex items-start gap-3">
        <DocumentTypeIcon type={doc.type} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted">{DOCUMENT_TYPE_META[doc.type].label}</div>
          <Link
            to={`/documents/${doc.id}`}
            onClick={(e) => {
              if (!selectionMode || !onToggleSelect) return;
              e.preventDefault();
              onToggleSelect(doc);
            }}
            className="mt-0.5 line-clamp-2 pr-6 text-[15px] leading-snug font-semibold after:absolute after:inset-0 after:rounded-2xl"
          >
            {doc.title}
          </Link>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-1 text-xs text-muted">
        <span>{formatRelative(doc.updatedAt)}</span>
        <span className="text-subtle">·</span>
        <span>{pluralize(doc.blocksCount, ['блок', 'блока', 'блоков'])}</span>
        <div className="relative z-10 ml-auto flex items-center">
          <IconButton
            size="sm"
            label={doc.isFavorite ? 'Убрать из избранного' : 'В избранное'}
            onClick={() => onToggleFavorite(doc)}
            className={cn(doc.isFavorite ? 'text-amber-500 hover:text-amber-500' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100')}
          >
            <Star className={cn(doc.isFavorite && 'fill-current')} />
          </IconButton>
          <IconButton ref={trigger} size="sm" label="Действия" onClick={() => menu.openBelow(trigger.current!)}>
            <MoreHorizontal />
          </IconButton>
        </div>
      </div>
      <Menu position={menu.position} onClose={menu.close} items={items} align="end" />
    </article>
  );
}
