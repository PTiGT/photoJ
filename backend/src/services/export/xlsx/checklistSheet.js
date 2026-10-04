import { buildChecklistTable, levelSpans } from '../checklistTable.js';
import { BORDER, CENTER, COLORS, STATUS_FILLS, STATUS_VALUES, columnLetter, mergeWithValue, setCell } from './styles.js';
import { fitRowHeight } from './layout.js';

const WIDTHS = { type: 11, req: 14, summary: 40, comment: 28, bug: 14 };
const LEVEL_WIDTHS = [18.5, 19.4, 16.6];
const STATS = [
  ['Passed, %', 'passed'],
  ['Failed, %', 'failed'],
  ['Blocked, %', 'blocked'],
  ['Skipped, %', 'skipped'],
  ['Not run, %', 'none'],
];

/** Checklist / test list sheet: meta block, run statistics, Module › Submodule › Element › Summary › Status per run. */
export function addChecklistSheet(ws, doc, ctx) {
  const table = buildChecklistTable(doc, ctx);
  const { runs, columns, rows, meta, stats } = table;

  columns.forEach((column, i) => {
    column.col = i + 1;
    const width =
      column.kind === 'level'
        ? (LEVEL_WIDTHS[column.level] ?? 16)
        : column.kind === 'status'
          ? runs.length > 1 ? 14 : 22
          : WIDTHS[column.kind];
    ws.getColumn(column.col).width = width;
  });
  const summaryCol = columns.find((c) => c.kind === 'summary').col;
  const runSpan = (run) => {
    const own = columns.filter((c) => c.run === run);
    return [own[0].col, own[own.length - 1].col];
  };
  const firstRunCol = runSpan(runs[0])[0];
  const lastRunCol = runSpan(runs[runs.length - 1])[1];
  const metaStyle = { background: COLORS.meta };

  // ── Meta block ───────────────────────────────────────────────
  let row = 1;
  const label = (text) => mergeWithValue(ws, row, 1, row, summaryCol, text, metaStyle);
  for (const item of meta) {
    label(item.label);
    if (item.merged) mergeWithValue(ws, row, firstRunCol, row, lastRunCol, item.values[0], metaStyle);
    else
      runs.forEach((run, i) => {
        const [from, to] = runSpan(run);
        mergeWithValue(ws, row, from, row, to, item.values[i], metaStyle);
      });
    fitRowHeight(ws, row);
    row += 1;
  }

  // Statistics are live formulas, so they follow statuses edited in Excel.
  const firstDataRow = row + STATS.length + 2;
  const lastDataRow = firstDataRow + Math.max(rows.length, 1) - 1;
  const summaryRange = `${columnLetter(summaryCol)}${firstDataRow}:${columnLetter(summaryCol)}${lastDataRow}`;
  const totalRow = row + STATS.length;
  for (const [text, status] of STATS) {
    label(text);
    runs.forEach((run, i) => {
      const [from, to] = runSpan(run);
      const letter = columnLetter(from);
      const range = `${letter}${firstDataRow}:${letter}${lastDataRow}`;
      const total = `${letter}${totalRow}`;
      const formula =
        status === 'none'
          ? `IFERROR(1-(${STATUS_VALUES.map((s) => `COUNTIF(${range},"${s}")`).join('+')})/${total},0)`
          : `IFERROR(COUNTIF(${range},"${status}")/${total},0)`;
      const result = stats[i].total ? stats[i][status] / stats[i].total : 0;
      mergeWithValue(ws, row, from, row, to, { formula, result }, { ...metaStyle, numFmt: '0%' });
    });
    row += 1;
  }
  label('Total');
  runs.forEach((run, i) => {
    const [from, to] = runSpan(run);
    mergeWithValue(ws, row, from, row, to, { formula: `COUNTA(${summaryRange})`, result: stats[i].total }, metaStyle);
  });
  row += 1;

  // ── Table ────────────────────────────────────────────────────
  const headerRow = row;
  for (const column of columns) setCell(ws, headerRow, column.col, column.header, { background: COLORS.tableHeader });
  ws.getRow(headerRow).height = 30;

  rows.forEach((item, i) => {
    const r = firstDataRow + i;
    for (const column of columns) {
      const result = column.run ? item.results[column.run.index] : null;
      switch (column.kind) {
        case 'type':
          setCell(ws, r, column.col, item.testType);
          break;
        case 'req':
          setCell(ws, r, column.col, item.requirement);
          break;
        case 'bug':
          setCell(ws, r, column.col, item.bugId);
          break;
        case 'summary':
          setCell(ws, r, column.col, item.text);
          break;
        case 'level': {
          const node = item.path[column.level];
          setCell(ws, r, column.col, node?.title ?? null, node ? { background: COLORS.levels[column.level % COLORS.levels.length] } : {});
          break;
        }
        case 'status': {
          const value = result && result.status !== 'none' ? result.status : null;
          // Static fill for viewers without conditional formatting (Quick Look, Numbers);
          // the conditional rules below keep colours right after edits in Excel / Sheets.
          setCell(ws, r, column.col, value, { background: STATUS_FILLS[value] });
          break;
        }
        case 'comment':
          setCell(ws, r, column.col, result?.comment || null, { align: { ...CENTER, horizontal: 'left' } });
          break;
        default:
          break;
      }
    }
  });

  // Merge equal section cells vertically, like a hand-made checklist.
  for (const column of columns.filter((c) => c.kind === 'level')) {
    for (const span of levelSpans(rows, column.level)) {
      if (span.id && span.length > 1) ws.mergeCells(firstDataRow + span.start, column.col, firstDataRow + span.start + span.length - 1, column.col);
    }
  }

  // Status cells: dropdown + colour that follows the value.
  for (const column of columns.filter((c) => c.kind === 'status')) {
    const letter = columnLetter(column.col);
    rows.forEach((item, i) => {
      if (item.check) ws.getCell(firstDataRow + i, column.col).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${STATUS_VALUES.join(',')}"`] };
    });
    ws.addConditionalFormatting({
      ref: `${letter}${firstDataRow}:${letter}${lastDataRow}`,
      rules: [
        ...STATUS_VALUES.map((status, priority) => ({
          type: 'cellIs',
          operator: 'equal',
          formulae: [`"${status}"`],
          priority: priority + 1,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: STATUS_FILLS[status] } } },
        })),
        // A cleared status must not keep the static fill written above.
        {
          type: 'expression',
          formulae: [`LEN(TRIM(${letter}${firstDataRow}))=0`],
          priority: STATUS_VALUES.length + 1,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFFFFF' } } },
        },
      ],
    });
  }

  // Heights are estimated after merging so merged section cells don't inflate rows.
  for (let r = firstDataRow; r <= lastDataRow; r += 1) fitRowHeight(ws, r);

  if (!rows.length) {
    ws.mergeCells(firstDataRow, 1, firstDataRow, columns.length);
    setCell(ws, firstDataRow, 1, 'Нет проверок', { color: COLORS.muted });
  }

  ws.views = [{ state: 'frozen', ySplit: headerRow, xSplit: 0 }];
  ws.getCell(headerRow, 1).border = BORDER;
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return ws;
}
