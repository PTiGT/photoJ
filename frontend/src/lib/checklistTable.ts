import type { Block, BlockOf, BlockTree, RunResult, TestRun } from '@/types';
import { buildTree } from './blockTree';
import { documentRuns, findRunInfo, resultFor } from './runs';

/*
 * Table model of a checklist / test list — the same layout the exports use:
 *   [Test Type] [Requirements] Module | Submodule | Element/function | Summary | Status per run [Comment] [BUG ID]
 * (mirrors backend/src/services/export/checklistTable.js)
 */

export const LEVEL_HEADERS = ['Module', 'Submodule', 'Element/function'];
const FIELD_TYPES = ['INPUT', 'TEXTAREA', 'SELECT', 'RADIO', 'STATUS', 'SEVERITY', 'PRIORITY'];

export type ColumnKind = 'type' | 'req' | 'level' | 'summary' | 'status' | 'comment' | 'bug';

export interface TableColumn {
  kind: ColumnKind;
  header: string;
  level?: number;
  run?: TestRun & { index: number };
}

export interface TableRow {
  path: { id: string; title: string }[];
  check: BlockOf<'CHECKBOX'> | null;
  indent: number;
  text: string;
  results: (RunResult | null)[];
  testType: string;
  requirement: string;
  bugId: string;
}

export interface MetaItem {
  label: string;
  values: string[];
  merged: boolean;
}

export interface ChecklistTable {
  runs: (TestRun & { index: number })[];
  columns: TableColumn[];
  rows: TableRow[];
  meta: MetaItem[];
  stats: Record<'passed' | 'failed' | 'blocked' | 'skipped' | 'none' | 'total', number>[];
  /** Root-level blocks that are not part of the table (text, images…) */
  notes: BlockTree[];
}

export function buildChecklistTable(
  blocks: Block[],
  { title, updatedAt, ownerName, formatDate }: { title: string; updatedAt?: string | null; ownerName?: string; formatDate: (d: string | Date) => string },
): ChecklistTable {
  const rawRows: Omit<TableRow, 'text' | 'results' | 'testType' | 'requirement' | 'bugId'>[] = [];
  const fields: BlockTree[] = [];
  const notes: BlockTree[] = [];
  let environment: BlockTree | null = null;

  const addCheck = (node: BlockTree, path: TableRow['path'], indent: number) => {
    rawRows.push({ path, check: node as BlockOf<'CHECKBOX'>, indent });
    for (const child of node.children) if (child.type === 'CHECKBOX') addCheck(child, path, indent + 1);
  };
  const walk = (nodes: BlockTree[], path: TableRow['path']) => {
    for (const node of nodes) {
      if (node.type === 'SECTION') {
        const next = [...path, { id: node.id, title: node.content.title || 'Раздел' }];
        const before = rawRows.length;
        walk(node.children, next);
        if (rawRows.length === before) rawRows.push({ path: next, check: null, indent: 0 });
      } else if (node.type === 'CHECKBOX') addCheck(node, path, 0);
      else if (node.type === 'RUN_INFO') continue;
      else if (node.type === 'ENVIRONMENT' && !environment) environment = node;
      else if (path.length === 0 && FIELD_TYPES.includes(node.type)) fields.push(node);
      else if (path.length === 0) notes.push(node);
    }
  };
  walk(buildTree(blocks), []);

  const runInfo = findRunInfo(blocks)?.content ?? {};
  const runs = documentRuns(blocks).map((run, index) => ({ ...run, index }));
  const levels = Math.max(0, ...rawRows.map((row) => row.path.length));

  const rows: TableRow[] = rawRows.map((row) => {
    const content = row.check?.content ?? {};
    const label = content.label?.trim() || '—';
    return {
      ...row,
      text: row.check ? (row.indent ? `${'   '.repeat(row.indent - 1)}↳ ${label}` : label) : '',
      results: runs.map((run) => (row.check ? resultFor(row.check, run, run.index) : null)),
      testType: content.testType ?? '',
      requirement: content.requirement ?? '',
      bugId: content.bugId ?? '',
    };
  });

  const columns: TableColumn[] = [];
  if (rows.some((r) => r.testType)) columns.push({ kind: 'type', header: 'Test Type' });
  if (rows.some((r) => r.requirement)) columns.push({ kind: 'req', header: 'Requirements' });
  for (let level = 0; level < levels; level += 1) columns.push({ kind: 'level', level, header: LEVEL_HEADERS[level] ?? `Level ${level + 1}` });
  columns.push({ kind: 'summary', header: 'Summary' });
  for (const run of runs) {
    columns.push({ kind: 'status', run, header: 'Status' });
    if (rows.some((r) => r.results[run.index]?.comment)) columns.push({ kind: 'comment', run, header: 'Comment' });
  }
  if (rows.some((r) => r.bugId)) columns.push({ kind: 'bug', header: 'BUG ID' });

  const env = environment as BlockTree | null;
  const environmentText =
    env?.type === 'ENVIRONMENT'
      ? (env.content.items ?? [])
          .filter((item) => item.value)
          .map((item) => `${item.key} ${item.value}`.trim())
          .join('\n')
      : '';
  const date = updatedAt ? formatDate(updatedAt) : '';
  const meta = [
    { label: 'Project', values: [runInfo.project || title] },
    { label: 'Date', values: runs.map((run) => run.date || date) },
    { label: 'Build', values: runs.map((run) => run.build || '') },
    { label: 'Tester', values: [runInfo.tester || ownerName || ''] },
    { label: 'Environment', values: runs.map((run) => run.environment || environmentText) },
    ...(runs.some((run) => run.testType) ? [{ label: 'Test type', values: runs.map((run) => run.testType || '') }] : []),
    ...fields.map((field) => {
      const content = field.content as { label?: string; value?: string };
      return { label: content.label || field.type, values: [content.value ?? ''] };
    }),
  ].map((item) => ({ ...item, merged: item.values.length === 1 || item.values.every((v) => v === item.values[0]) }));

  const stats = runs.map((run) => {
    const counts = { passed: 0, failed: 0, blocked: 0, skipped: 0, none: 0, total: 0 };
    for (const row of rows) {
      if (!row.check) continue;
      counts.total += 1;
      counts[row.results[run.index]!.status] += 1;
    }
    return counts;
  });

  return { runs, columns, rows, meta, stats, notes };
}

/** Consecutive rows sharing a section at `level` — used for merged (rowSpan) cells. */
export function levelSpans(rows: TableRow[], level: number) {
  const spans: { id: string | null; title: string; start: number; length: number }[] = [];
  rows.forEach((row, index) => {
    const node = row.path[level];
    const last = spans[spans.length - 1];
    if (node && last && last.id === node.id && last.start + last.length === index) last.length += 1;
    else spans.push({ id: node?.id ?? null, title: node?.title ?? '', start: index, length: 1 });
  });
  return spans;
}

export const percent = (count: number, total: number) => (total ? `${Math.round((count / total) * 100)}%` : '0%');
