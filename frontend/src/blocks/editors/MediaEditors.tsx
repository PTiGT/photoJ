import { useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import { FileText, ImagePlus, Link2, Paperclip, Upload, X } from 'lucide-react';
import { documentsApi } from '@/api';
import type { AttachmentFile } from '@/types';
import { Button, IconButton } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Feedback';
import { cn, formatSize } from '@/lib/utils';
import { useUpdate, type EditorProps } from './shared';
import { useBlockRenderContext } from './context';

const MAX_BYTES = 10 * 1024 * 1024;

function useUploader(onUploaded: (file: AttachmentFile) => void) {
  const { documentId } = useBlockRenderContext();
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList | File[] | null) => {
    if (!files?.length) return;
    if (!documentId) {
      toast.error('Загрузка файлов доступна в документах, в шаблоне укажите ссылку');
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_BYTES) {
          toast.error(`«${file.name}» больше 10 МБ`);
          continue;
        }
        onUploaded(await documentsApi.upload(documentId, file));
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  };
  return { upload, uploading, canUpload: Boolean(documentId) };
}

function useFileDrop(onFiles: (files: FileList) => void) {
  const [over, setOver] = useState(false);
  return {
    over,
    handlers: {
      onDragOver: (e: DragEvent) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: DragEvent) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setOver(false);
        onFiles(e.dataTransfer.files);
      },
    },
  };
}

export function ImageEditor({ block }: EditorProps<'IMAGE'>) {
  const update = useUpdate(block);
  const input = useRef<HTMLInputElement>(null);
  const [urlMode, setUrlMode] = useState(false);
  const { upload, uploading, canUpload } = useUploader((file) => update({ src: file.url, attachmentId: file.id }));
  const drop = useFileDrop((files) => upload(files));
  const { src, caption } = block.content;

  return (
    <div className="space-y-2" onPaste={(e) => e.clipboardData.files.length && upload(e.clipboardData.files)}>
      {src ? (
        <figure className="group/img relative overflow-hidden rounded-xl border border-line bg-surface-2">
          <img src={src} alt={caption || 'Изображение'} className="mx-auto max-h-80 object-contain" />
          <IconButton size="sm" label="Убрать изображение" onClick={() => update({ src: '', attachmentId: undefined })} className="absolute top-2 right-2 bg-surface/90 opacity-0 shadow-soft group-hover/img:opacity-100 focus:opacity-100">
            <X />
          </IconButton>
        </figure>
      ) : (
        <div
          {...drop.handlers}
          tabIndex={0}
          className={cn(
            'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-7 text-center transition',
            drop.over ? 'border-accent bg-accent-soft' : 'border-line',
          )}
        >
          {uploading ? (
            <Spinner />
          ) : (
            <>
              <ImagePlus className="size-6 text-subtle" />
              <p className="text-[13px] text-muted">
                {canUpload ? 'Перетащите скриншот, вставьте из буфера (Ctrl+V) или' : 'Укажите ссылку на изображение'}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {canUpload && (
                  <Button size="sm" variant="outline" icon={<Upload className="size-3.5" />} onClick={() => input.current?.click()}>
                    Выбрать файл
                  </Button>
                )}
                <Button size="sm" variant="ghost" icon={<Link2 className="size-3.5" />} onClick={() => setUrlMode(true)}>
                  По ссылке
                </Button>
              </div>
              {urlMode && (
                <input
                  autoFocus
                  placeholder="https://…"
                  aria-label="Ссылка на изображение"
                  className="field-input h-9 max-w-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') update({ src: e.currentTarget.value.trim() });
                  }}
                  onBlur={(e) => e.target.value.trim() && update({ src: e.target.value.trim() })}
                />
              )}
            </>
          )}
          <input ref={input} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(e) => upload(e.target.files)} />
        </div>
      )}
      <input
        value={caption ?? ''}
        onChange={(e) => update({ caption: e.target.value }, 'caption')}
        placeholder="Подпись к изображению"
        aria-label="Подпись к изображению"
        className="inline-input text-center text-[13px] text-muted italic"
      />
    </div>
  );
}

export function AttachmentEditor({ block }: EditorProps<'ATTACHMENT'>) {
  const update = useUpdate(block);
  const input = useRef<HTMLInputElement>(null);
  const files = block.content.files ?? [];
  // Keep a ref so sequential uploads append to the latest list.
  const filesRef = useRef(files);
  filesRef.current = files;
  const { upload, uploading, canUpload } = useUploader((file) => {
    filesRef.current = [...filesRef.current, file];
    update({ files: filesRef.current });
  });
  const drop = useFileDrop((list) => upload(list));

  return (
    <div className="space-y-1.5">
      <div {...drop.handlers} className={cn('rounded-xl border transition', drop.over ? 'border-accent bg-accent-soft' : 'border-line')}>
        {files.map((file) => (
          <div key={file.id} className="group/row flex items-center gap-3 border-b border-line px-3 py-2">
            <FileText className="size-4 shrink-0 text-muted" />
            <a href={file.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium hover:text-accent">
              {file.name}
            </a>
            <span className="text-xs text-muted">{formatSize(file.size)}</span>
            <IconButton size="xs" tone="danger" label="Убрать файл" onClick={() => update({ files: files.filter((f) => f.id !== file.id) })} className="opacity-0 group-hover/row:opacity-100 focus:opacity-100">
              <X />
            </IconButton>
          </div>
        ))}
        <button
          type="button"
          disabled={!canUpload || uploading}
          onClick={() => input.current?.click()}
          className="flex w-full items-center justify-center gap-2 px-3 py-3 text-[13px] text-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? <Spinner className="size-4" /> : <Paperclip className="size-4" />}
          {canUpload ? 'Прикрепить файлы или перетащите их сюда' : 'Вложения доступны в документах'}
        </button>
        <input ref={input} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>
    </div>
  );
}
