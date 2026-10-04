/**
 * Approximates row height for wrapped text: Excel does not auto-fit rows of
 * generated files, so long summaries or steps would otherwise be clipped.
 */
const LINE_HEIGHT = 13;
const MIN_HEIGHT = 18;

function textOf(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    if (value.richText) return value.richText.map((part) => part.text).join('');
    if ('result' in value) return String(value.result ?? '');
    return String(value.text ?? '');
  }
  return String(value);
}

function lineCount(text, widthChars) {
  const perLine = Math.max(4, Math.floor(widthChars * 1.35));
  return text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / perLine)), 0);
}

export function fitRowHeight(ws, rowNumber, maxHeight = 400) {
  const row = ws.getRow(rowNumber);
  let lines = 1;
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    if (cell.isMerged && cell.master !== cell) return;
    // Cells merged downwards share their height with following rows — skip them.
    if (ws.getCell(rowNumber + 1, col).master === cell) return;
    let width = ws.getColumn(col).width ?? 10;
    for (let c = col + 1; ws.getCell(rowNumber, c).master === cell && ws.getCell(rowNumber, c).isMerged; c += 1) width += ws.getColumn(c).width ?? 10;
    lines = Math.max(lines, lineCount(textOf(cell.value), width));
  });
  row.height = Math.min(maxHeight, Math.max(MIN_HEIGHT, lines * LINE_HEIGHT + 5));
}
