import { MessageSquare } from 'lucide-react';
import { AutoTextarea } from '@/components/ui/AutoTextarea';
import { Segmented } from '@/components/ui/Segmented';
import { cn } from '@/lib/utils';
import { useUpdate, type EditorProps } from './shared';

const HEADING_CLASSES = { 1: 'text-2xl font-bold', 2: 'text-xl font-semibold', 3: 'text-base font-semibold' };

export function HeadingEditor({ block }: EditorProps<'HEADING'>) {
  const update = useUpdate(block);
  const level = block.content.level ?? 2;
  return (
    <div className="flex items-center gap-2">
      <input
        value={block.content.text ?? ''}
        onChange={(e) => update({ text: e.target.value }, 'text')}
        placeholder="Заголовок"
        aria-label="Текст заголовка"
        className={cn('inline-input tracking-tight', HEADING_CLASSES[level])}
      />
      <Segmented
        size="sm"
        value={String(level) as '1' | '2' | '3'}
        onChange={(v) => update({ level: Number(v) as 1 | 2 | 3 })}
        options={[
          { value: '1', label: 'H1' },
          { value: '2', label: 'H2' },
          { value: '3', label: 'H3' },
        ]}
      />
    </div>
  );
}

export function TextEditor({ block }: EditorProps<'TEXT'>) {
  const update = useUpdate(block);
  return (
    <AutoTextarea
      value={block.content.text ?? ''}
      onChange={(e) => update({ text: e.target.value }, 'text')}
      placeholder="Начните писать…"
      aria-label="Текст"
      minRows={2}
      className="inline-input text-[15px] leading-relaxed"
    />
  );
}

export function CommentEditor({ block }: EditorProps<'COMMENT'>) {
  const update = useUpdate(block);
  return (
    <div className="rounded-xl border-l-[3px] border-accent bg-accent-soft/60 p-3">
      <div className="mb-1 flex items-center gap-2 text-muted">
        <MessageSquare className="size-4 shrink-0" />
        <input
          value={block.content.author ?? ''}
          onChange={(e) => update({ author: e.target.value }, 'author')}
          placeholder="Автор"
          aria-label="Автор комментария"
          className="inline-input px-1.5 py-0.5 text-[13px] font-semibold text-fg hover:bg-surface/60"
        />
      </div>
      <AutoTextarea
        value={block.content.text ?? ''}
        onChange={(e) => update({ text: e.target.value }, 'text')}
        placeholder="Комментарий, заметка, уточнение…"
        aria-label="Текст комментария"
        minRows={2}
        className="inline-input text-sm hover:bg-surface/60 focus:bg-surface"
      />
    </div>
  );
}
