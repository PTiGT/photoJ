import { useState } from 'react';
import type { CheckStatus } from '@/types';
import { Menu } from '@/components/ui/Menu';
import { levelSpans, percent, type ChecklistTable, type TableColumn } from '@/lib/checklistTable';
import { CHECK_STATUSES } from '@/lib/qaValues';
import { cn } from '@/lib/utils';

/* Spreadsheet palette (Google Sheets pastels) with dark-mode counterparts. */
const META = 'bg-[#fff2cc] dark:bg-amber-400/10';
const HEADER = 'bg-[#d9ead3] dark:bg-emerald-400/10';
const LEVELS = [
  'bg-[#f3f3f3] dark:bg-white/[0.04]',
  'bg-[#d0e0e3] dark:bg-cyan-400/10',
  'bg-[#d9d2e9] dark:bg-violet-400/15',
  'bg-[#fce5cd] dark:bg-orange-400/10',
  'bg-[#d9ead3] dark:bg-emerald-400/10',
];
export const STATUS_CELL: Record<CheckStatus, string> = {
  none: '',
  passed: 'bg-[#b6d7a8] dark:bg-green-500/25',
  failed: 'bg-[#f4cccc] dark:bg-red-500/25',
  blocked: 'bg-[#ffe599] dark:bg-amber-400/25',
  skipped: 'bg-[#d9d9d9] dark:bg-slate-400/25',
};

const COLUMN_WIDTHS: Record<TableColumn['kind'], number | undefined> = {
  type: 70,
  req: 90,
  level: 108,
  summary: undefined,
  status: 74,
  comment: 150,
  bug: 80,
};

const td = 'border border-[#bfbfbf] px-2 py-1 text-center align-middle dark:border-line-strong';

const STATS: [string, CheckStatus][] = [
  ['Passed, %', 'passed'],
  ['Failed, %', 'failed'],
  ['Blocked, %', 'blocked'],
  ['Not run, %', 'none'],
];

interface Props {
  table: ChecklistTable;
  /** When provided, status cells are clickable (run execution right in the preview). */
  onStatusChange?: (checkId: string, runIndex: number, status: CheckStatus) => void;
}

/** Checklist rendered exactly like the exported spreadsheet. */
export function ChecklistTablePreview({ table, onStatusChange }: Props) {
  const { columns, rows, meta, runs, stats } = table;
  const [menu, setMenu] = useState<{ x: number; y: number; checkId: string; runIndex: number } | null>(null);
  const leadCount = columns.findIndex((c) => c.kind === 'summary') + 1;
  const runColumns = (index: number) => columns.filter((c) => c.run?.index === index).length;
  const runSpan = columns.filter((c) => c.run).length;
  const trailing = columns.length - leadCount - runSpan;

  const spans = new Map<string, { length: number; title: string; id: string | null } | null>();
  for (const column of columns.filter((c) => c.kind === 'level')) {
    for (const span of levelSpans(rows, column.level!)) {
      for (let i = 0; i < span.length; i += 1) spans.set(`${column.level}:${span.start + i}`, i === 0 ? span : null);
    }
  }

  const metaRow = (label: string, values: string[], merged: boolean, key: string) => (
    <tr key={key}>
      <td colSpan={leadCount} className={cn(td, META)}>
        {label}
      </td>
      {merged ? (
        <td colSpan={runSpan} className={cn(td, META, 'whitespace-pre-line')}>
          {values[0]}
        </td>
      ) : (
        runs.map((run) => (
          <td key={run.id} colSpan={runColumns(run.index)} className={cn(td, META, 'whitespace-pre-line')}>
            {values[run.index]}
          </td>
        ))
      )}
      {trailing > 0 && <td colSpan={trailing} />}
    </tr>
  );

  const cellFor = (column: TableColumn, rowIndex: number) => {
    const row = rows[rowIndex];
    const key = `${column.kind}-${column.level ?? column.run?.id ?? ''}`;
    switch (column.kind) {
      case 'level': {
        const span = spans.get(`${column.level}:${rowIndex}`);
        if (span === null) return null; // covered by rowSpan
        return (
          <td key={key} rowSpan={span && span.length > 1 ? span.length : undefined} className={cn(td, span?.id && LEVELS[column.level! % LEVELS.length])}>
            {span?.title}
          </td>
        );
      }
      case 'summary':
        return (
          <td key={key} className={cn(td, 'text-left whitespace-pre-wrap')}>
            {row.text}
          </td>
        );
      case 'status': {
        const status = row.results[column.run!.index]?.status ?? 'none';
        const clickable = Boolean(onStatusChange && row.check);
        return (
          <td
            key={key}
            className={cn(td, STATUS_CELL[status], clickable && 'cursor-pointer hover:outline-2 hover:-outline-offset-2 hover:outline-accent')}
            onClick={(e) => clickable && setMenu({ x: e.clientX, y: e.clientY, checkId: row.check!.id, runIndex: column.run!.index })}
            data-testid={clickable ? 'table-status-cell' : undefined}
          >
            {status === 'none' ? '' : status}
          </td>
        );
      }
      case 'comment':
        return (
          <td key={key} className={cn(td, 'text-left')}>
            {row.results[column.run!.index]?.comment}
          </td>
        );
      case 'type':
        return (
          <td key={key} className={td}>
            {row.testType}
          </td>
        );
      case 'req':
        return (
          <td key={key} className={cn(td, 'font-mono text-[11px]')}>
            {row.requirement}
          </td>
        );
      case 'bug':
        return (
          <td key={key} className={cn(td, 'font-mono text-[11px]')}>
            {row.bugId}
          </td>
        );
    }
  };

  return (
    <div className="scroll-thin -mx-2 overflow-x-auto px-2 pb-1" data-testid="checklist-table">
      <table className="w-full min-w-[560px] border-collapse font-[Arial,sans-serif] text-[12px] text-fg">
        <colgroup>
          {columns.map((column, i) => (
            <col key={i} style={{ width: COLUMN_WIDTHS[column.kind], minWidth: column.kind === 'summary' ? 180 : undefined }} />
          ))}
        </colgroup>
        <tbody>
          {meta.map((item) => metaRow(item.label, item.values, item.merged, item.label))}
          {STATS.map(([label, status]) =>
            metaRow(
              label,
              stats.map((s) => percent(s[status], s.total)),
              false,
              label,
            ),
          )}
          {metaRow('Total', stats.map((s) => String(s.total)), false, 'total')}
          <tr>
            {columns.map((column, i) => (
              <th key={i} className={cn(td, HEADER, 'font-medium whitespace-nowrap')}>
                {column.header}
              </th>
            ))}
          </tr>
          {rows.length ? (
            rows.map((_, rowIndex) => <tr key={rowIndex}>{columns.map((column) => cellFor(column, rowIndex))}</tr>)
          ) : (
            <tr>
              <td colSpan={columns.length} className={cn(td, 'py-6 text-muted')}>
                Добавьте разделы и проверки — они появятся в таблице
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Menu
        position={menu}
        onClose={() => setMenu(null)}
        items={CHECK_STATUSES.map((status) => ({
          label: status.label,
          icon: <span className={cn('size-2 rounded-full', status.dot)} />,
          onSelect: () => menu && onStatusChange?.(menu.checkId, menu.runIndex, status.value),
        }))}
      />
    </div>
  );
}
