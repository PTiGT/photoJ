import { COLORS, TOP_LEFT, setCell } from './styles.js';
import { fitRowHeight } from './layout.js';
import { attachmentsOf, commentsOf, environmentOf, stepsOf, summaryOf, textOf, typedValue } from './fields.js';

/*
 * Row-per-document sheets: every test case (or bug report) becomes one row,
 * so several documents exported together form one familiar table.
 */

const TEST_CASE_COLUMNS = [
  ['ID', 6, (_doc, _blocks, index) => index + 1],
  ['Summary', 34.6, (doc, blocks) => summaryOf(blocks, doc.title)],
  ['Pre-conditions', 23.75, (_doc, blocks) => textOf(blocks, /pre-?condition|предуслов/i)],
  ['Test data', 23.75, (_doc, blocks) => textOf(blocks, /test ?data|тестов\S* данн/i)],
  ['Steps', 43.5, (_doc, blocks) => stepsOf(blocks).steps],
  ['Expected results', 34.9, (_doc, blocks) => stepsOf(blocks).expected],
  ['Post-conditions', 23.75, (_doc, blocks) => textOf(blocks, /post-?condition|постуслов/i)],
  ['Priority', 11, (_doc, blocks) => typedValue(blocks, 'PRIORITY')],
  ['Severity', 11, (_doc, blocks) => typedValue(blocks, 'SEVERITY')],
  ['Environment', 24, (_doc, blocks) => environmentOf(blocks)],
];

const BUG_REPORT_COLUMNS = [
  ['ID', 6, (_doc, _blocks, index) => index + 1],
  ['Summary', 34.6, (doc, blocks) => summaryOf(blocks, doc.title)],
  ['Status', 12, (_doc, blocks) => typedValue(blocks, 'STATUS')],
  ['Severity', 11, (_doc, blocks) => typedValue(blocks, 'SEVERITY')],
  ['Priority', 11, (_doc, blocks) => typedValue(blocks, 'PRIORITY')],
  ['Description', 30, (_doc, blocks) => textOf(blocks, /description|описан/i)],
  ['Environment', 24, (_doc, blocks) => environmentOf(blocks)],
  ['Pre-conditions', 23.75, (_doc, blocks) => textOf(blocks, /pre-?condition|предуслов/i)],
  ['Steps to reproduce', 43.5, (_doc, blocks) => stepsOf(blocks).steps],
  ['Actual result', 30, (_doc, blocks) => textOf(blocks, /actual|фактическ/i)],
  ['Expected result', 30, (_doc, blocks) => textOf(blocks, /^expected|ожидаем/i)],
  ['Attachments', 30, (_doc, blocks, _index, ctx) => attachmentsOf(blocks, ctx.absoluteUrl)],
  ['Comments', 30, (_doc, blocks) => commentsOf(blocks)],
];

function addRowSheet(ws, docs, columns, ctx) {
  columns.forEach(([header, width], i) => {
    ws.getColumn(i + 1).width = width;
    setCell(ws, 1, i + 1, header, { background: COLORS.caseHeader, align: { ...TOP_LEFT, vertical: 'middle' } });
  });
  ws.getRow(1).height = 20;

  docs.forEach((doc, index) => {
    const row = index + 2;
    columns.forEach(([, , read], i) => {
      const value = read(doc, doc.blocks, index, ctx);
      setCell(ws, row, i + 1, value === '' ? null : value, { align: TOP_LEFT });
    });
    fitRowHeight(ws, row);
  });

  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

export const addTestCasesSheet = (ws, docs, ctx) => addRowSheet(ws, docs, TEST_CASE_COLUMNS, ctx);
export const addBugReportsSheet = (ws, docs, ctx) => addRowSheet(ws, docs, BUG_REPORT_COLUMNS, ctx);
