import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { AutoTextarea } from '@/components/ui/AutoTextarea';
import { IconButton } from '@/components/ui/Button';
import { useUpdate, type EditorProps } from './shared';
import { useBlockRenderContext } from './context';
import { useIsHovered } from '@/features/builder/hoverStore';
import { useBuilderStore } from '@/features/builder/store';

export function SectionHeaderEditor({ block }: EditorProps<'SECTION'>) {
  const update = useUpdate(block);
  const hovered = useIsHovered(block.id);
  const selected = useBuilderStore((s) => s.selectedId === block.id);
  const active = hovered || selected;
  const [showDescription, setShowDescription] = useState(Boolean(block.content.description));
  return (
    <div className="min-w-0 flex-1">
      <input
        value={block.content.title ?? ''}
        onChange={(e) => update({ title: e.target.value }, 'title')}
        placeholder="Название раздела"
        aria-label="Название раздела"
        className="inline-input text-[15px] font-semibold"
      />
      {showDescription || block.content.description ? (
        <AutoTextarea
          value={block.content.description ?? ''}
          onChange={(e) => update({ description: e.target.value }, 'description')}
          placeholder="Описание раздела"
          aria-label="Описание раздела"
          className="inline-input text-[13px] text-muted"
          autoFocus={showDescription && !block.content.description}
        />
      ) : (
        active && (
          <button type="button" onClick={() => setShowDescription(true)} className="px-2 text-xs text-subtle hover:text-accent">
            + описание
          </button>
        )
      )}
    </div>
  );
}

export function StepEditor({ block }: EditorProps<'STEP'>) {
  const update = useUpdate(block);
  const number = useBlockRenderContext().stepNumbers.get(block.id) ?? 1;
  return (
    <div className="flex min-w-0 flex-1 items-start gap-2.5">
      <span className="mt-1.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-soft font-mono text-xs font-medium text-accent" data-testid="step-number">
        {number}
      </span>
      <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2">
        <AutoTextarea
          value={block.content.action ?? ''}
          onChange={(e) => update({ action: e.target.value }, 'action')}
          placeholder="Действие"
          aria-label={`Шаг ${number}: действие`}
          className="field-input py-1.5"
        />
        <AutoTextarea
          value={block.content.expected ?? ''}
          onChange={(e) => update({ expected: e.target.value }, 'expected')}
          placeholder="Ожидаемый результат"
          aria-label={`Шаг ${number}: ожидаемый результат`}
          className="field-input py-1.5"
        />
      </div>
    </div>
  );
}

export function TableEditor({ block }: EditorProps<'TABLE'>) {
  const update = useUpdate(block);
  const columns = block.content.columns ?? [];
  const rows = block.content.rows ?? [];

  const setCell = (r: number, c: number, value: string) =>
    update({ rows: rows.map((row, ri) => (ri === r ? columns.map((_, ci) => (ci === c ? value : (row[ci] ?? ''))) : row)) }, `cell-${r}-${c}`);
  const setColumn = (c: number, value: string) => update({ columns: columns.map((col, ci) => (ci === c ? value : col)) }, `col-${c}`);
  const addColumn = () => update({ columns: [...columns, `Колонка ${columns.length + 1}`], rows: rows.map((row) => [...row, '']) });
  const removeColumn = (c: number) => update({ columns: columns.filter((_, i) => i !== c), rows: rows.map((row) => row.filter((_, i) => i !== c)) });
  const addRow = () => update({ rows: [...rows, columns.map(() => '')] });
  const removeRow = (r: number) => update({ rows: rows.filter((_, i) => i !== r) });

  return (
    <div className="space-y-1.5">
      <div className="scroll-thin overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-2">
              {columns.map((column, c) => (
                <th key={c} className="group/col relative border-b border-line p-1 text-left font-medium">
                  <input value={column} onChange={(e) => setColumn(c, e.target.value)} aria-label={`Колонка ${c + 1}`} className="inline-input py-1 text-xs font-semibold text-muted" />
                  {columns.length > 1 && (
                    <IconButton size="xs" label="Удалить колонку" tone="danger" onClick={() => removeColumn(c)} className="absolute top-1.5 right-1 opacity-0 group-hover/col:opacity-100 focus:opacity-100">
                      <X />
                    </IconButton>
                  )}
                </th>
              ))}
              <th className="w-9 border-b border-line p-1">
                <IconButton size="sm" label="Добавить колонку" onClick={addColumn} disabled={columns.length >= 20}>
                  <Plus />
                </IconButton>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="group/row">
                {columns.map((_, c) => (
                  <td key={c} className="border-b border-line p-1 align-top last:border-r-0">
                    <AutoTextarea value={row[c] ?? ''} onChange={(e) => setCell(r, c, e.target.value)} aria-label={`Строка ${r + 1}, колонка ${c + 1}`} className="inline-input py-1" />
                  </td>
                ))}
                <td className="border-b border-line p-1 text-center align-top">
                  <IconButton size="sm" label="Удалить строку" tone="danger" onClick={() => removeRow(r)} className="opacity-0 group-hover/row:opacity-100 focus:opacity-100">
                    <X />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={addRow} className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted hover:bg-surface-2 hover:text-accent">
          <Plus className="size-3.5" /> Добавить строку
        </button>
      </div>
    </div>
  );
}

export function EnvironmentEditor({ block }: EditorProps<'ENVIRONMENT'>) {
  const update = useUpdate(block);
  const items = block.content.items ?? [];
  const setItem = (index: number, patch: Partial<{ key: string; value: string }>, field: string) =>
    update({ items: items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }, `${field}-${index}`);

  return (
    <div className="space-y-1.5">
      <div className="divide-y divide-line rounded-xl border border-line">
        {items.map((item, index) => (
          <div key={index} className="group/row flex items-center gap-1 p-1">
            <input value={item.key} onChange={(e) => setItem(index, { key: e.target.value }, 'key')} placeholder="Параметр" aria-label="Параметр окружения" className="inline-input w-2/5 py-1 text-sm font-medium text-muted" />
            <input value={item.value} onChange={(e) => setItem(index, { value: e.target.value }, 'value')} placeholder="Значение" aria-label={`Значение ${item.key}`} className="inline-input flex-1 py-1 text-sm" />
            <IconButton size="sm" tone="danger" label="Удалить параметр" onClick={() => update({ items: items.filter((_, i) => i !== index) })} className="opacity-0 group-hover/row:opacity-100 focus:opacity-100">
              <X />
            </IconButton>
          </div>
        ))}
        <button type="button" onClick={() => update({ items: [...items, { key: '', value: '' }] })} className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted hover:bg-surface-2 hover:text-accent">
          <Plus className="size-3.5" /> Добавить параметр
        </button>
      </div>
    </div>
  );
}
