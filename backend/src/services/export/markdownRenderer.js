import { CHECK_STATUS_LABELS, EMPTY, fieldLabel, formatDate, formatSize, groupStepRuns, valueOrEmpty } from './model.js';
import { levelSpans, percent } from './checklistTable.js';

const STATUS_ICONS = { passed: '✅', failed: '❌', blocked: '⛔', skipped: '⏭️' };

const escapeCell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
const cell = (value) => escapeCell(valueOrEmpty(value));

/** GFM table; `keepEmpty` leaves blank cells blank (spreadsheet-like tables). */
function table(columns, rows, { keepEmpty = false } = {}) {
  const format = keepEmpty ? escapeCell : cell;
  const header = `| ${columns.map(format).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((_, i) => format(row[i])).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

const heading = (depth, text) => `${'#'.repeat(Math.min(depth, 6))} ${text}`;

function renderCheckbox(block, indent) {
  const { label, checked, status = 'none', comment } = block.content;
  const pad = '  '.repeat(indent);
  const badge = status !== 'none' ? ` — ${STATUS_ICONS[status]} ${CHECK_STATUS_LABELS[status]}` : '';
  const lines = [`${pad}- [${checked || status === 'passed' ? 'x' : ' '}] ${label || EMPTY}${badge}`];
  if (comment?.trim()) lines.push(`${pad}  > ${comment.trim().replace(/\n/g, `\n${pad}  > `)}`);
  for (const child of block.children) lines.push(renderCheckbox(child, indent + 1));
  return lines.join('\n');
}

function renderStepsTable(steps) {
  return table(
    ['#', 'Действие', 'Ожидаемый результат'],
    steps.map((step, i) => [String(i + 1), step.content.action, step.content.expected]),
  );
}

/** Renders one block (and its subtree). `depth` is the heading level for titles. */
function renderBlock(block, depth, model) {
  const c = block.content ?? {};
  switch (block.type) {
    case 'HEADING':
      return heading(depth + (c.level ?? 1), c.text || EMPTY);
    case 'TEXT':
      return c.text?.trim() || '';
    case 'INPUT':
    case 'SELECT':
    case 'RADIO':
    case 'STATUS':
    case 'SEVERITY':
    case 'PRIORITY':
      return `**${fieldLabel(block)}:** ${valueOrEmpty(c.value)}`;
    case 'TEXTAREA':
      return `${heading(depth + 1, fieldLabel(block) || 'Описание')}\n\n${valueOrEmpty(c.value)}`;
    case 'CHECKBOX':
      return renderCheckbox(block, 0);
    case 'STEP_GROUP':
      return `${heading(depth + 1, c.title || 'Шаги')}\n\n${renderStepsTable(block.children)}`;
    case 'SECTION': {
      const parts = [heading(depth + 1, c.title || 'Раздел')];
      if (c.description?.trim()) parts.push(c.description.trim());
      parts.push(renderChildren(block.children, depth + 1, model));
      return parts.filter(Boolean).join('\n\n');
    }
    case 'TABLE':
      return `${heading(depth + 1, fieldLabel(block))}\n\n${table(c.columns ?? [], c.rows ?? [])}`;
    case 'ENVIRONMENT':
      return `${heading(depth + 1, fieldLabel(block))}\n\n${table(
        ['Параметр', 'Значение'],
        (c.items ?? []).map((item) => [item.key, item.value]),
      )}`;
    case 'IMAGE': {
      if (!c.src) return '';
      const caption = c.caption || c.label || 'Изображение';
      return `![${caption}](${model.absoluteUrl(c.src)})${c.caption ? `\n\n*${c.caption}*` : ''}`;
    }
    case 'ATTACHMENT': {
      const files = c.files ?? [];
      const list = files.length
        ? files.map((f) => `- [${f.name}](${model.absoluteUrl(f.url)}) · ${formatSize(f.size)}`).join('\n')
        : EMPTY;
      return `${heading(depth + 1, fieldLabel(block))}\n\n${list}`;
    }
    case 'RUN_INFO':
      return `${heading(depth + 1, 'Прогоны')}\n\n${table(
        ['Окружение', 'Дата', 'Билд', 'Тип теста'],
        (c.runs ?? []).map((run) => [run.environment, run.date, run.build, run.testType]),
      )}`;
    case 'COMMENT':
      if (!c.text?.trim()) return '';
      return `> 💬 ${c.author ? `**${c.author}:** ` : ''}${c.text.trim().replace(/\n/g, '\n> ')}`;
    default:
      return '';
  }
}

function renderChildren(children, depth, model) {
  return groupStepRuns(children)
    .map((unit) => (unit.type === 'STEP_RUN' ? renderStepsTable(unit.steps) : renderBlock(unit, depth, model)))
    .filter((part) => part && part.trim())
    .join('\n\n');
}

const statusText = (status) => (status && status !== 'none' ? `${STATUS_ICONS[status]} ${status}` : '');

/** Checklists / test lists: meta table + Module › Submodule › Element › Summary › Status table. */
function renderChecklistTable(model) {
  const { columns, rows, meta, runs, stats } = model.checklist;
  const runHeader = (run) => run.environment || `Прогон ${run.index + 1}`;
  const metaRows = [
    ...meta.map((item) => [item.label, ...runs.map((_, i) => (item.merged ? (i === 0 ? item.values[0] : '') : item.values[i]))]),
    ['Passed', ...stats.map((s) => `${s.passed} (${percent(s.passed, s.total)})`)],
    ['Failed', ...stats.map((s) => `${s.failed} (${percent(s.failed, s.total)})`)],
    ['Blocked', ...stats.map((s) => `${s.blocked} (${percent(s.blocked, s.total)})`)],
    ['Not run', ...stats.map((s) => `${s.none} (${percent(s.none, s.total)})`)],
    ['Total', ...stats.map((s) => String(s.total))],
  ];
  const metaTable = table(['', ...runs.map(runHeader)], metaRows, { keepEmpty: true });

  // Section names are printed once per group, like merged spreadsheet cells.
  const firstOfSpan = new Map();
  for (const column of columns.filter((c) => c.kind === 'level')) {
    for (const span of levelSpans(rows, column.level)) firstOfSpan.set(`${column.level}:${span.start}`, span.title);
  }
  const headers = columns.map((column) => (column.run && runs.length > 1 ? `${column.header} (${runHeader(column.run)})` : column.header));
  const body = rows.map((row, index) =>
    columns.map((column) => {
      const result = column.run ? row.results[column.run.index] : null;
      switch (column.kind) {
        case 'level':
          return firstOfSpan.get(`${column.level}:${index}`) ?? '';
        case 'summary':
          return row.text;
        case 'status':
          return statusText(result?.status);
        case 'comment':
          return result?.comment ?? '';
        case 'type':
          return row.testType;
        case 'req':
          return row.requirement;
        case 'bug':
          return row.bugId;
        default:
          return '';
      }
    }),
  );
  return [metaTable, rows.length ? table(headers, body, { keepEmpty: true }) : '_Нет проверок_'].join('\n\n');
}

export function renderMarkdown(model) {
  const meta = [`**Тип:** ${model.typeLabel}`, `**Обновлён:** ${formatDate(model.updatedAt)}`];
  if (model.version) meta.push(`**Версия:** ${model.version}`);

  const body = model.checklist
    ? [renderChecklistTable(model), renderChildren(model.checklist.notes, 1, model)].filter(Boolean).join('\n\n')
    : renderChildren(model.tree, 1, model);

  return `# ${model.title}\n\n${meta.join(' · ')}\n\n---\n\n${body}\n`;
}
