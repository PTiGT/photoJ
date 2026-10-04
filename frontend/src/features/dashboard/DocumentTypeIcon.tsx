import type { DocumentType } from '@/types';
import { DOCUMENT_TYPE_META } from '@/lib/documentTypes';
import { cn } from '@/lib/utils';

export function DocumentTypeIcon({ type, size = 'md' }: { type: DocumentType; size?: 'sm' | 'md' | 'lg' }) {
  const meta = DOCUMENT_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl',
        meta.tone,
        size === 'sm' && 'size-8 rounded-lg [&_svg]:size-4',
        size === 'md' && 'size-10 [&_svg]:size-5',
        size === 'lg' && 'size-12 [&_svg]:size-6',
      )}
    >
      <Icon />
    </span>
  );
}
