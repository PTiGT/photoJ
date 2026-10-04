import { memo, useMemo, type ReactNode } from 'react';
import { Check, MessageSquare, Paperclip } from 'lucide-react';
import type { Block, BlockTree, CheckStatus, DocumentType, Priority, Severity } from '@/types';
import { buildChecklistTable } from '@/lib/checklistTable';
import { ChecklistTablePreview } from './ChecklistTablePreview';
import { buildTree } from '@/lib/blockTree';
import { DOCUMENT_TYPE_META } from '@/lib/documentTypes';
import { CHECK_STATUS_META, PRIORITY_TONE, SEVERITY_TONE } from '@/lib/qaValues';
import { cn, formatDateTime, formatShortDate, formatSize } from '@/lib/utils';

const EMPTY = <span className="text-subtle">—</span>;

const hasText = (value?: string) => Boolean(value && value.trim());

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <div className="mb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase">
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </div>
  );
}

function Field({ label, children, required }: { label?: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="break-inside-avoid">
      {label && <Label required={required}>{label}</Label>}
      <div className="text-[14px] leading-relaxed whitespace-pre-wrap text-fg-soft">{children}</div>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: string }) {
  return <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', tone)}>{children}</span>;
}

function DataTable({ columns, rows, first }: { columns: string[]; rows: string[][]; first?: string }) {
  const body = rows.length ? rows : [columns.map(() => '')];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-y border-line bg-surface-2">
            {columns.map((column, i) => (
              <th key={i} className={cn('px-2.5 py-2 text-left text-[11px] font-semibold text-muted', i === 0 && first)}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r} className="border-b border-line align-top">
              {columns.map((_, c) => (
                <td key={c} className="px-2.5 py-2 whitespace-pre-wrap text-fg-soft">
                  {hasText(row[c]) ? row[c] : EMPTY}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepsTable({ steps }: { steps: BlockTree[] }) {
  return (
    <DataTable
      first="w-8"
      columns={['#', 'Действие', 'Ожидаемый результат']}
      rows={steps.map((step, i) => {
        const content = step.content as { action?: string; expected?: string };
        return [String(i + 1), content.action ?? '', content.expected ?? ''];
      })}
    />
  );
}

function CheckItem({ node, depth }: { node: BlockTree & { type: 'CHECKBOX' }; depth: number }) {
  const { label, checked, status = 'none', comment } = node.content;
  const done = checked || status === 'passed';
  const meta = CHECK_STATUS_META[status];
  return (
    <li>
      <div className="flex items-start gap-2.5 py-1" style={{ paddingLeft: depth * 20 }}>
        <span
          className={cn(
            'mt-[3px] flex size-4 shrink-0 items-center justify-center rounded border',
            done ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong',
          )}
        >
          {done && <Check className="size-3" strokeWidth={3} />}
        </span>
        <span className={cn('flex-1 text-[14px] text-fg-soft', status === 'skipped' && 'text-muted line-through')}>
          {hasText(label) ? label : EMPTY}
        </span>
        {status !== 'none' && <Badge tone={meta.tone}>{meta.label}</Badge>}
      </div>
      {hasText(comment) && (
        <p className="pb-1 text-[13px] text-muted italic" style={{ paddingLeft: depth * 20 + 26 }}>
          {comment}
        </p>
      )}
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <CheckItem key={child.id} node={child as BlockTree & { type: 'CHECKBOX' }} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Groups consecutive STEP siblings into one numbered table (same as exports). */
function renderChildren(children: BlockTree[], depth: number) {
  const units: ReactNode[] = [];
  let run: BlockTree[] = [];
  let checks: BlockTree[] = [];
  const flush = () => {
    if (run.length) units.push(<StepsTable key={`steps-${run[0].id}`} steps={run} />);
    if (checks.length)
      units.push(
        <ul key={`checks-${checks[0].id}`} className="-my-1">
          {checks.map((c) => (
            <CheckItem key={c.id} node={c as BlockTree & { type: 'CHECKBOX' }} depth={0} />
          ))}
        </ul>,
      );
    run = [];
    checks = [];
  };
  for (const child of children) {
    if (child.type === 'STEP') {
      if (checks.length) flush();
      run.push(child);
    } else if (child.type === 'CHECKBOX') {
      if (run.length) flush();
      checks.push(child);
    } else {
      flush();
      const node = <PreviewBlock key={child.id} node={child} depth={depth} />;
      units.push(node);
    }
  }
  flush();
  return units;
}

const HEADING_CLASSES = ['text-xl font-bold', 'text-[17px] font-semibold', 'text-[15px] font-semibold'];

function PreviewBlock({ node, depth }: { node: BlockTree; depth: number }) {
  const required = node.settings.required;
  switch (node.type) {
    case 'HEADING': {
      const level = Math.min(3, (node.content.level ?? 1) + depth - 1);
      return <h3 className={cn('pt-2 tracking-tight text-fg', HEADING_CLASSES[level - 1])}>{node.content.text || EMPTY}</h3>;
    }
    case 'TEXT':
      return hasText(node.content.text) ? <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-fg-soft">{node.content.text}</p> : null;
    case 'INPUT':
    case 'TEXTAREA':
    case 'SELECT':
    case 'RADIO':
      return (
        <Field label={node.settings.hideLabel ? undefined : node.content.label} required={required}>
          {hasText(node.content.value) ? node.content.value : EMPTY}
        </Field>
      );
    case 'STATUS':
      return (
        <Field label={node.settings.hideLabel ? undefined : node.content.label || 'Статус'}>
          {node.content.value ? <Badge tone="bg-accent-soft text-accent">{node.content.value}</Badge> : EMPTY}
        </Field>
      );
    case 'SEVERITY':
      return (
        <Field label={node.content.label || 'Severity'}>
          {node.content.value ? <Badge tone={SEVERITY_TONE[node.content.value as Severity]}>{node.content.value}</Badge> : EMPTY}
        </Field>
      );
    case 'PRIORITY':
      return (
        <Field label={node.content.label || 'Priority'}>
          {node.content.value ? <Badge tone={PRIORITY_TONE[node.content.value as Priority]}>{node.content.value}</Badge> : EMPTY}
        </Field>
      );
    case 'CHECKBOX':
      return (
        <ul>
          <CheckItem node={node} depth={0} />
        </ul>
      );
    case 'STEP':
      return <StepsTable steps={[node]} />;
    case 'STEP_GROUP':
      return (
        <div className="break-inside-avoid">
          <Label>{node.content.title || 'Шаги'}</Label>
          <StepsTable steps={node.children} />
        </div>
      );
    case 'SECTION':
      return (
        <section className={cn(depth > 1 && 'border-l-2 border-line pl-4')}>
          <h3 className={cn('tracking-tight text-fg', depth === 1 ? 'border-b border-line pb-2 text-[17px] font-semibold' : 'text-[15px] font-semibold')}>
            {node.content.title || 'Раздел'}
          </h3>
          {hasText(node.content.description) && <p className="mt-1.5 text-[13px] text-muted italic">{node.content.description}</p>}
          {node.children.length > 0 && <div className="mt-3 space-y-4">{renderChildren(node.children, depth + 1)}</div>}
        </section>
      );
    case 'TABLE':
      return (
        <div>
          {!node.settings.hideLabel && node.content.label && <Label>{node.content.label}</Label>}
          <DataTable columns={node.content.columns ?? []} rows={node.content.rows ?? []} />
        </div>
      );
    case 'ENVIRONMENT':
      return (
        <div className="break-inside-avoid">
          <Label>{node.content.label || 'Environment'}</Label>
          <dl className="grid grid-cols-[minmax(110px,35%)_1fr] border-t border-line text-[13px]">
            {(node.content.items ?? []).map((item, i) => (
              <div key={i} className="contents">
                <dt className="border-b border-line bg-surface-2 px-2.5 py-2 font-medium text-muted">{item.key || EMPTY}</dt>
                <dd className="border-b border-line px-2.5 py-2 text-fg-soft">{hasText(item.value) ? item.value : EMPTY}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case 'IMAGE':
      if (!node.content.src) return null;
      return (
        <figure className="break-inside-avoid">
          {node.content.label && <Label>{node.content.label}</Label>}
          <img src={node.content.src} alt={node.content.caption || node.content.label || 'Изображение'} className="mx-auto max-h-96 rounded-lg border border-line" />
          {node.content.caption && <figcaption className="mt-1.5 text-center text-xs text-muted italic">{node.content.caption}</figcaption>}
        </figure>
      );
    case 'ATTACHMENT': {
      const files = node.content.files ?? [];
      return (
        <Field label={node.content.label || 'Вложения'}>
          {files.length
            ? files.map((file) => (
                <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] text-accent hover:underline">
                  <Paperclip className="size-3.5" />
                  {file.name}
                  <span className="text-muted">{formatSize(file.size)}</span>
                </a>
              ))
            : EMPTY}
        </Field>
      );
    }
    case 'RUN_INFO': {
      const runs = node.content.runs ?? [];
      return (
        <div className="break-inside-avoid">
          <Label>Прогоны</Label>
          {(node.content.project || node.content.tester) && (
            <p className="mb-2 text-[13px] text-fg-soft">
              {[node.content.project && `Project: ${node.content.project}`, node.content.tester && `Tester: ${node.content.tester}`].filter(Boolean).join(' · ')}
            </p>
          )}
          <DataTable columns={['Окружение', 'Дата', 'Build', 'Тип теста']} rows={runs.map((run) => [run.environment ?? '', run.date ?? '', run.build ?? '', run.testType ?? ''])} />
        </div>
      );
    }
    case 'COMMENT':
      if (!hasText(node.content.text)) return null;
      return (
        <blockquote className="break-inside-avoid rounded-r-lg border-l-[3px] border-accent bg-accent-soft/60 px-4 py-3 text-[14px] text-fg-soft">
          {node.content.author && (
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-fg">
              <MessageSquare className="size-3.5 text-muted" /> {node.content.author}
            </div>
          )}
          <p className="whitespace-pre-wrap">{node.content.text}</p>
        </blockquote>
      );
  }
}

export type PreviewView = 'document' | 'table';

/** Document types that can be shown as a spreadsheet-like table. */
export const TABLE_VIEW_TYPES: DocumentType[] = ['CHECKLIST', 'TEST_LIST'];

interface DocumentPreviewProps {
  title: string;
  docType: DocumentType;
  blocks: Block[];
  updatedAt?: string | null;
  version?: number;
  className?: string;
  /** `table` renders checklists / test lists like the exported spreadsheet */
  view?: PreviewView;
  ownerName?: string;
  onStatusChange?: (checkId: string, runIndex: number, status: CheckStatus) => void;
}

/** Read-only render of a document as it will look when exported. */
export const DocumentPreview = memo(function DocumentPreview({
  title,
  docType,
  blocks,
  updatedAt,
  version,
  className,
  view = 'document',
  ownerName,
  onStatusChange,
}: DocumentPreviewProps) {
  const asTable = view === 'table' && TABLE_VIEW_TYPES.includes(docType);
  const treeNodes = useMemo(() => buildTree(blocks), [blocks]);
  const table = useMemo(
    () => (asTable ? buildChecklistTable(blocks, { title, updatedAt, ownerName, formatDate: formatShortDate }) : null),
    [asTable, blocks, title, updatedAt, ownerName],
  );
  const meta = DOCUMENT_TYPE_META[docType];
  const info = [updatedAt && `Обновлён ${formatDateTime(updatedAt)}`, version && `версия ${version}`].filter(Boolean).join(' · ');

  return (
    <article
      className={cn('rounded-xl bg-paper px-6 py-8 shadow-lift ring-1 ring-line sm:px-10 sm:py-10', asTable && 'px-4 sm:px-6', className)}
      data-testid="document-preview"
    >
      <header className="mb-7 border-b-2 border-fg pb-5">
        <span className="inline-flex rounded-md bg-accent-soft px-2 py-0.5 text-[10.5px] font-bold tracking-[0.1em] text-accent uppercase">
          {meta.label}
        </span>
        <h1 className="mt-3 text-[26px] leading-tight font-bold tracking-tight text-fg">{title || 'Без названия'}</h1>
        {info && <p className="mt-1.5 text-xs text-muted">{info}</p>}
      </header>
      {table ? (
        <div className="space-y-5">
          <ChecklistTablePreview table={table} onStatusChange={onStatusChange} />
          {table.notes.length > 0 && renderChildren(table.notes, 1)}
        </div>
      ) : treeNodes.length ? (
        <div className="space-y-5">{renderChildren(treeNodes, 1)}</div>
      ) : (
        <p className="py-10 text-center text-sm text-muted">Документ пока пуст — добавьте блоки в конструкторе.</p>
      )}
    </article>
  );
});
