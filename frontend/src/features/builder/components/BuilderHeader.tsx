import { useRef } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Download, Eye, History, Keyboard, LayoutTemplate, MoreHorizontal, PanelRight, Redo2, Save, Undo2 } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { Menu, useMenu } from '@/components/ui/Menu';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { DOCUMENT_TYPE_META } from '@/lib/documentTypes';
import { modKey } from '@/lib/utils';
import type { ExportFormat } from '@/types';
import { selectCanRedo, selectCanUndo, useBuilderStore } from '../store';
import { EXPORT_FORMATS } from '../exportDocument';
import { SaveIndicator } from './SaveIndicator';

interface BuilderHeaderProps {
  onSave: () => void;
  onRetry: () => void;
  onPreview: () => void;
  onExport: (format: ExportFormat) => void;
  onHistory: () => void;
  onSaveAsTemplate: () => void;
  onShortcuts: () => void;
  previewVisible: boolean;
  onTogglePreview: () => void;
}

export function BuilderHeader(props: BuilderHeaderProps) {
  const title = useBuilderStore((s) => s.title);
  const source = useBuilderStore((s) => s.source);
  const canUndo = useBuilderStore(selectCanUndo);
  const canRedo = useBuilderStore(selectCanRedo);
  const { setTitle, undo, redo } = useBuilderStore.getState();
  const exportMenu = useMenu();
  const moreMenu = useMenu();
  const exportButton = useRef<HTMLButtonElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  if (!source) return null;

  const isDocument = source.kind === 'document';
  const meta = DOCUMENT_TYPE_META[source.docType];
  const TypeIcon = meta.icon;

  return (
    <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-line bg-surface px-2 sm:gap-2 sm:px-3">
      <Link to={isDocument ? '/' : '/templates'} aria-label="Назад">
        <IconButton label={isDocument ? 'К документам' : 'К шаблонам'} tabIndex={-1}>
          <ArrowLeft />
        </IconButton>
      </Link>
      <span className={`hidden size-8 shrink-0 items-center justify-center rounded-lg sm:flex ${meta.tone}`} title={meta.label}>
        <TypeIcon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {!isDocument && <span className="hidden shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 sm:inline dark:bg-amber-500/15 dark:text-amber-300">Шаблон</span>}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => !e.target.value.trim() && setTitle(`${meta.label} без названия`)}
          maxLength={200}
          aria-label="Название документа"
          data-testid="document-title"
          className="inline-input min-w-0 truncate text-[15px] font-semibold"
        />
        <SaveIndicator onRetry={props.onRetry} />
      </div>

      <div className="flex items-center">
        <IconButton label={`Отменить (${modKey}+Z)`} disabled={!canUndo} onClick={undo} data-testid="undo">
          <Undo2 />
        </IconButton>
        <IconButton label={`Вернуть (${modKey}+Shift+Z)`} disabled={!canRedo} onClick={redo} className="hidden sm:inline-flex">
          <Redo2 />
        </IconButton>
      </div>
      <div className="mx-1 hidden h-6 w-px bg-line md:block" />

      {isDocument && (
        <IconButton label="История версий" onClick={props.onHistory} className="hidden md:inline-flex" data-testid="open-history">
          <History />
        </IconButton>
      )}
      <IconButton label={props.previewVisible ? 'Скрыть панель предпросмотра' : 'Показать панель предпросмотра'} active={props.previewVisible} onClick={props.onTogglePreview} className="hidden xl:inline-flex">
        <PanelRight />
      </IconButton>
      <Button variant="ghost" size="sm" icon={<Eye className="size-4" />} onClick={props.onPreview} className="hidden md:inline-flex">
        Предпросмотр
      </Button>
      {isDocument && (
        <Button ref={exportButton} variant="outline" size="sm" icon={<Download className="size-4" />} onClick={() => exportMenu.openBelow(exportButton.current!)} className="hidden sm:inline-flex" data-testid="export-button">
          Экспорт
        </Button>
      )}
      <Button size="sm" icon={<Save className="size-4" />} onClick={props.onSave} data-testid="save-button" className="hidden sm:inline-flex">
        Сохранить
      </Button>
      <IconButton ref={moreButton} label="Ещё" onClick={() => moreMenu.openBelow(moreButton.current!)}>
        <MoreHorizontal />
      </IconButton>
      <span className="hidden lg:block">
        <ThemeToggle />
      </span>

      <Menu
        position={exportMenu.position}
        onClose={exportMenu.close}
        align="end"
        items={EXPORT_FORMATS.map((f) => ({ label: `${f.label} — ${f.hint}`, icon: <Download />, onSelect: () => props.onExport(f.format) }))}
      />
      <Menu
        position={moreMenu.position}
        onClose={moreMenu.close}
        align="end"
        items={[
          { label: 'Сохранить', icon: <Save />, shortcut: `${modKey}S`, onSelect: props.onSave },
          { label: 'Предпросмотр', icon: <Eye />, onSelect: props.onPreview },
          ...(isDocument
            ? [
                { label: 'История версий', icon: <History />, onSelect: props.onHistory },
                ...EXPORT_FORMATS.map((f) => ({ label: `Экспорт в ${f.label}`, icon: <Download />, onSelect: () => props.onExport(f.format) })),
                'separator' as const,
                { label: 'Сохранить как шаблон', icon: <LayoutTemplate />, onSelect: props.onSaveAsTemplate },
              ]
            : []),
          { label: 'Горячие клавиши', icon: <Keyboard />, onSelect: props.onShortcuts },
        ]}
      />
    </header>
  );
}
