import { buildTree } from '../../domain/blockTree.js';
import { documentRuns, findRunInfo, resultFor } from '../../domain/runs.js';

/*
 * Table model of a checklist / test list, shared by every exporter:
 *   [Test Type] [Requirements] Module | Submodule | Element/function | Summary | Status (per run) [Comment] [BUG ID]
 * plus the meta block above it (Project, Date, Build, Tester, Environment…).
 */

export const TABLE_DOCUMENT_TYPES = ['CHECKLIST', 'TEST_LIST'];
export const LEVEL_HEADERS = ['Module', 'Submodule', 'Element/function'];
const FIELD_TYPES = ['INPUT', 'TEXTAREA', 'SELECT', 'RADIO', 'STATUS', 'SEVERITY', 'PRIORITY'];

export const usesChecklistTable = (type) => TABLE_DOCUMENT_TYPES.includes(type);

/** Flattens sections → checks; each row keeps its chain of section ancestors. */
function collectRows(tree) {
  const rows = [];
  const fields = [];
  const notes = [];
  let environment = null;

  const addCheck = (node, path, indent) => {
    rows.push({ path, check: node, indent });
    for (const child of node.children) if (child.type === 'CHECKBOX') addCheck(child, path, indent + 1);
  };
  const walk = (nodes, path) => {
    for (const node of nodes) {
      if (node.type === 'SECTION') {
        const next = [...path, { id: node.id, title: node.content?.title || 'Раздел' }];
        const before = rows.length;
        walk(node.children, next);
        if (rows.length === before) rows.push({ path: next, check: null, indent: 0 });
      } else if (node.type === 'CHECKBOX') {
        addCheck(node, path, 0);
      } else if (node.type === 'RUN_INFO') {
        // consumed by the meta block
      } else if (node.type === 'ENVIRONMENT' && !environment) {
        environment = node;
      } else if (path.length === 0 && FIELD_TYPES.includes(node.type)) {
        fields.push(node);
      } else if (path.length === 0) {
        notes.push(node);
      }
    }
  };
  walk(tree, []);
  return { rows, fields, notes, environment };
}

export function buildChecklistTable(doc, { formatDate, ownerName }) {
  const { rows: rawRows, fields, notes, environment } = collectRows(buildTree(doc.blocks));
  const runInfo = findRunInfo(doc.blocks)?.content ?? {};
  const runs = documentRuns(doc.blocks).map((run, index) => ({ ...run, index }));
  const checks = rawRows.filter((row) => row.check);
  const levels = Math.max(0, ...rawRows.map((row) => row.path.length));

  const rows = rawRows.map((row) => {
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

  const columns = [];
  if (rows.some((r) => r.testType)) columns.push({ kind: 'type', header: 'Test Type' });
  if (rows.some((r) => r.requirement)) columns.push({ kind: 'req', header: 'Requirements' });
  for (let level = 0; level < levels; level += 1) columns.push({ kind: 'level', level, header: LEVEL_HEADERS[level] ?? `Level ${level + 1}` });
  columns.push({ kind: 'summary', header: 'Summary' });
  for (const run of runs) {
    columns.push({ kind: 'status', run, header: 'Status' });
    if (rows.some((r) => r.results[run.index]?.comment)) columns.push({ kind: 'comment', run, header: 'Comment' });
  }
  if (rows.some((r) => r.bugId)) columns.push({ kind: 'bug', header: 'BUG ID' });

  const environmentText = (environment?.content?.items ?? [])
    .filter((item) => item.value)
    .map((item) => `${item.key} ${item.value}`.trim())
    .join('\n');
  const perRun = (read) => runs.map(read);
  const meta = [
    { label: 'Project', values: [runInfo.project || doc.title] },
    { label: 'Date', values: perRun((run) => run.date || formatDate(doc.updatedAt)) },
    { label: 'Build', values: perRun((run) => run.build || '') },
    { label: 'Tester', values: [runInfo.tester || ownerName || ''] },
    { label: 'Environment', values: perRun((run) => run.environment || environmentText) },
    ...(runs.some((run) => run.testType) ? [{ label: 'Test type', values: perRun((run) => run.testType || '') }] : []),
    ...fields.map((field) => ({ label: field.content?.label || field.type, values: [field.content?.value ?? ''] })),
  ].map((item) => ({
    ...item,
    // one value spanning all runs when every run has the same value
    merged: item.values.length === 1 || item.values.every((v) => v === item.values[0]),
  }));

  const stats = runs.map((run) => {
    const counts = { passed: 0, failed: 0, blocked: 0, skipped: 0, none: 0, total: checks.length };
    for (const row of rows) if (row.check) counts[row.results[run.index].status] += 1;
    return counts;
  });

  return { runs, levels, columns, meta, stats, rows, notes, checksCount: checks.length };
}

/** Consecutive rows sharing the same section at `level` → [{ start, length, title }]. */
export function levelSpans(rows, level) {
  const spans = [];
  rows.forEach((row, index) => {
    const node = row.path[level];
    const last = spans[spans.length - 1];
    if (node && last && last.id === node.id && last.start + last.length === index) last.length += 1;
    else spans.push({ id: node?.id ?? null, title: node?.title ?? '', start: index, length: 1 });
  });
  return spans;
}

export const percent = (count, total) => (total ? `${Math.round((count / total) * 100)}%` : '0%');
