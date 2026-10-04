import { levelSpans, percent } from './checklistTable.js';
import { THEME } from './theme.js';
import { COLORS, STATUS_FILLS } from './xlsx/styles.js';

/** ARGB (FFRRGGBB) → #RRGGBB */
const hex = (argb) => `#${argb.slice(2)}`;

const cell = (text, extra = {}) => ({ text: text ?? '', fontSize: 8, lineHeight: 1.15, alignment: 'center', margin: [2, 1, 2, 1], ...extra });
const placeholders = (n) => Array.from({ length: n }, () => ({}));

const layout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => hex(COLORS.border),
  vLineColor: () => hex(COLORS.border),
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

function widthsFor(columns, runs) {
  return columns.map((column) => {
    switch (column.kind) {
      case 'summary':
        return '*';
      case 'level':
        return 60;
      case 'comment':
        return 80;
      case 'status':
        return runs.length > 3 ? 40 : 52;
      default:
        return 46;
    }
  });
}

/**
 * Checklist table for PDF: a meta table (Project, Date, Build, Tester,
 * Environment, statistics) and the data table with merged section cells —
 * both share column widths so they line up like one spreadsheet.
 */
export function checklistTablePdf(table) {
  const { columns, rows, meta, runs, stats } = table;
  const widths = widthsFor(columns, runs);
  const leadCount = columns.findIndex((c) => c.kind === 'summary') + 1;
  const runRange = (run) => {
    const indexes = columns.map((c, i) => (c.run === run ? i : -1)).filter((i) => i >= 0);
    return [indexes[0], indexes[indexes.length - 1]];
  };
  const [firstRun] = runRange(runs[0]);
  const [, lastRun] = runRange(runs[runs.length - 1]);
  const trailing = columns.length - 1 - lastRun;
  const metaFill = hex(COLORS.meta);

  const metaRow = (label, values, merged) => {
    const row = [cell(label, { colSpan: leadCount, fillColor: metaFill }), ...placeholders(leadCount - 1)];
    if (merged) {
      row.push(cell(values[0], { colSpan: lastRun - firstRun + 1, fillColor: metaFill }), ...placeholders(lastRun - firstRun));
    } else {
      runs.forEach((run, i) => {
        const [from, to] = runRange(run);
        row.push(cell(values[i], { colSpan: to - from + 1, fillColor: metaFill }), ...placeholders(to - from));
      });
    }
    for (let i = 0; i < trailing; i += 1) row.push(cell('', { border: [false, false, false, false] }));
    return row;
  };

  const metaBody = [
    ...meta.map((item) => metaRow(item.label, item.values, item.merged)),
    ...[
      ['Passed, %', 'passed'],
      ['Failed, %', 'failed'],
      ['Blocked, %', 'blocked'],
      ['Not run, %', 'none'],
    ].map(([label, status]) => metaRow(label, stats.map((s) => percent(s[status], s.total)), false)),
    metaRow('Total', stats.map((s) => String(s.total)), false),
  ];

  const header = columns.map((column) => cell(column.header, { fillColor: hex(COLORS.tableHeader), bold: true }));
  const body = rows.map(() => columns.map(() => cell('')));
  columns.forEach((column, c) => {
    if (column.kind === 'level') {
      for (const span of levelSpans(rows, column.level)) {
        body[span.start][c] = span.id
          ? cell(span.title, { rowSpan: span.length, fillColor: hex(COLORS.levels[column.level % COLORS.levels.length]) })
          : cell('');
        for (let i = 1; i < span.length; i += 1) body[span.start + i][c] = {};
      }
      return;
    }
    rows.forEach((row, r) => {
      const result = column.run ? row.results[column.run.index] : null;
      if (column.kind === 'summary') body[r][c] = cell(row.text, { alignment: 'left' });
      else if (column.kind === 'status' && result && result.status !== 'none')
        body[r][c] = cell(result.status, { fillColor: hex(STATUS_FILLS[result.status]) });
      else if (column.kind === 'comment') body[r][c] = cell(result?.comment ?? '', { alignment: 'left' });
      else if (column.kind === 'type') body[r][c] = cell(row.testType);
      else if (column.kind === 'req') body[r][c] = cell(row.requirement);
      else if (column.kind === 'bug') body[r][c] = cell(row.bugId);
    });
  });

  return [
    { table: { widths, body: metaBody }, layout, margin: [0, 0, 0, 8] },
    rows.length
      ? { table: { widths, headerRows: 1, body: [header, ...body] }, layout }
      : { text: 'Нет проверок', color: THEME.muted, alignment: 'center', margin: [0, 12] },
  ];
}
