import { BorderStyle, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType, AlignmentType } from 'docx';
import { levelSpans, percent } from './checklistTable.js';
import { COLORS, STATUS_FILLS } from './xlsx/styles.js';

const hex = (argb) => argb.slice(2);
const border = { style: BorderStyle.SINGLE, size: 4, color: hex(COLORS.border) };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, { fill, span = 1, rowSpan, align = AlignmentType.CENTER, bold = false } = {}) {
  return new TableCell({
    columnSpan: span > 1 ? span : undefined,
    rowSpan,
    borders,
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { type: ShadingType.CLEAR, fill: hex(fill), color: 'auto' } : undefined,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: String(text ?? '')
      .split('\n')
      .map((line) => new Paragraph({ alignment: align, children: [new TextRun({ text: line, font: 'Arial', size: 16, bold })] })),
  });
}

/**
 * Checklist table for DOCX: meta rows (Project, Date, Build, Tester,
 * Environment, statistics), header and data rows with vertically merged
 * Module / Submodule / Element cells.
 */
export function checklistTableDocx(table) {
  const { columns, rows, meta, runs, stats } = table;
  const leadCount = columns.findIndex((c) => c.kind === 'summary') + 1;
  const runRange = (run) => {
    const indexes = columns.map((c, i) => (c.run === run ? i : -1)).filter((i) => i >= 0);
    return [indexes[0], indexes[indexes.length - 1]];
  };
  const [firstRun] = runRange(runs[0]);
  const [, lastRun] = runRange(runs[runs.length - 1]);
  const trailing = columns.length - 1 - lastRun;

  const metaRow = (label, values, merged) => {
    const cells = [cell(label, { fill: COLORS.meta, span: leadCount })];
    if (merged) cells.push(cell(values[0], { fill: COLORS.meta, span: lastRun - firstRun + 1 }));
    else
      runs.forEach((run, i) => {
        const [from, to] = runRange(run);
        cells.push(cell(values[i], { fill: COLORS.meta, span: to - from + 1 }));
      });
    if (trailing) cells.push(cell('', { span: trailing }));
    return new TableRow({ children: cells });
  };

  const tableRows = [
    ...meta.map((item) => metaRow(item.label, item.values, item.merged)),
    ...[
      ['Passed, %', 'passed'],
      ['Failed, %', 'failed'],
      ['Blocked, %', 'blocked'],
      ['Not run, %', 'none'],
    ].map(([label, status]) => metaRow(label, stats.map((s) => percent(s[status], s.total)), false)),
    metaRow('Total', stats.map((s) => String(s.total)), false),
    new TableRow({ tableHeader: true, children: columns.map((column) => cell(column.header, { fill: COLORS.tableHeader, bold: true })) }),
  ];

  // Level cells are emitted only at the start of their span (rowSpan covers the rest).
  const spanStarts = new Map();
  for (const column of columns.filter((c) => c.kind === 'level')) {
    for (const span of levelSpans(rows, column.level)) {
      for (let i = 0; i < span.length; i += 1) spanStarts.set(`${column.level}:${span.start + i}`, i === 0 ? span : null);
    }
  }

  rows.forEach((row, index) => {
    const cells = [];
    for (const column of columns) {
      const result = column.run ? row.results[column.run.index] : null;
      if (column.kind === 'level') {
        const span = spanStarts.get(`${column.level}:${index}`);
        if (span === null) continue; // covered by a rowSpan above
        cells.push(span?.id ? cell(span.title, { fill: COLORS.levels[column.level % COLORS.levels.length], rowSpan: span.length > 1 ? span.length : undefined }) : cell(''));
      } else if (column.kind === 'summary') cells.push(cell(row.text, { align: AlignmentType.LEFT }));
      else if (column.kind === 'status') cells.push(cell(result && result.status !== 'none' ? result.status : '', { fill: STATUS_FILLS[result?.status] }));
      else if (column.kind === 'comment') cells.push(cell(result?.comment ?? '', { align: AlignmentType.LEFT }));
      else if (column.kind === 'type') cells.push(cell(row.testType));
      else if (column.kind === 'req') cells.push(cell(row.requirement));
      else if (column.kind === 'bug') cells.push(cell(row.bugId));
    }
    tableRows.push(new TableRow({ cantSplit: true, children: cells }));
  });

  // Twips: landscape A4 content width is ~14800, portrait ~9900.
  const available = columns.length > 6 ? 14800 : 9900;
  const fixed = { level: 1350, status: runs.length > 3 ? 850 : 1100, comment: 1800, type: 1000, req: 1100, bug: 1000 };
  const others = columns.filter((c) => c.kind !== 'summary').reduce((sum, c) => sum + fixed[c.kind], 0);
  const columnWidths = columns.map((c) => (c.kind === 'summary' ? Math.max(2400, available - others) : fixed[c.kind]));
  return [new Table({ width: { size: columnWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths, rows: tableRows })];
}
