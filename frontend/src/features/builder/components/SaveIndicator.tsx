import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { useBuilderStore } from '../store';

/** "Сохранено" / "Сохранение…" / unsaved / error status in the header. */
export function SaveIndicator({ onRetry }: { onRetry: () => void }) {
  const status = useBuilderStore((s) => s.saveStatus);
  const lastSavedAt = useBuilderStore((s) => s.lastSavedAt);

  const content = {
    saved: { icon: <Check className="size-3.5" />, text: 'Сохранено', tone: 'text-muted' },
    dirty: { icon: <span className="size-1.5 rounded-full bg-warning" />, text: 'Изменения…', tone: 'text-muted' },
    saving: { icon: <Loader2 className="size-3.5 animate-spin" />, text: 'Сохранение…', tone: 'text-muted' },
    error: { icon: <AlertCircle className="size-3.5" />, text: 'Не сохранено', tone: 'text-danger' },
  }[status];

  return (
    <button
      type="button"
      onClick={status === 'error' ? onRetry : undefined}
      title={lastSavedAt ? `Последнее сохранение: ${formatDateTime(lastSavedAt)}` : undefined}
      data-testid="save-status"
      data-status={status}
      className={cn('flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium whitespace-nowrap', content.tone, status === 'error' && 'hover:bg-danger-soft')}
      aria-live="polite"
    >
      {content.icon}
      <span className="hidden sm:inline">{status === 'error' ? `${content.text} · повторить` : content.text}</span>
    </button>
  );
}
