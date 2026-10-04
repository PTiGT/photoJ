/** Palette and cell helpers mirroring the classic QA spreadsheet look (Google Sheets pastel fills, Arial). */
export const COLORS = {
  meta: 'FFFFF2CC', // yellow header block (Project / Date / Build …)
  tableHeader: 'FFD9EAD3', // green table header
  caseHeader: 'FFEAD1DC', // pink test-case header
  levels: ['FFF3F3F3', 'FFD0E0E3', 'FFD9D2E9', 'FFFCE5CD', 'FFD9EAD3'],
  border: 'FFBFBFBF',
  link: 'FF1155CC',
  muted: 'FF666666',
};

export const STATUS_FILLS = {
  passed: 'FFB6D7A8',
  failed: 'FFF4CCCC',
  blocked: 'FFFFE599',
  skipped: 'FFD9D9D9',
};

export const STATUS_VALUES = ['passed', 'failed', 'blocked', 'skipped'];

export const FONT = { name: 'Arial', size: 10, color: { argb: 'FF000000' } };

const thin = { style: 'thin', color: { argb: COLORS.border } };
export const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

export const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

export const CENTER = { horizontal: 'center', vertical: 'middle', wrapText: true };
export const TOP_LEFT = { horizontal: 'left', vertical: 'top', wrapText: true };

/** Writes a value with the standard font/border and optional fill/alignment. */
export function setCell(ws, row, col, value, { background, bold = false, align = CENTER, color, numFmt } = {}) {
  const cell = ws.getCell(row, col);
  cell.value = value === '' ? null : (value ?? null);
  cell.font = { ...FONT, bold, ...(color ? { color: { argb: color } } : {}) };
  cell.alignment = align;
  cell.border = BORDER;
  if (background) cell.fill = fill(background);
  if (numFmt) cell.numFmt = numFmt;
  return cell;
}

/** Styles every cell of a range (used before merging so borders survive). */
export function styleRange(ws, fromRow, fromCol, toRow, toCol, options) {
  for (let r = fromRow; r <= toRow; r += 1) {
    for (let c = fromCol; c <= toCol; c += 1) setCell(ws, r, c, ws.getCell(r, c).value, options);
  }
}

export function mergeWithValue(ws, fromRow, fromCol, toRow, toCol, value, options) {
  styleRange(ws, fromRow, fromCol, toRow, toCol, options);
  if (fromRow !== toRow || fromCol !== toCol) ws.mergeCells(fromRow, fromCol, toRow, toCol);
  setCell(ws, fromRow, fromCol, value, options);
}

/** Excel-safe unique sheet name (≤31 chars, no []:*?/\). */
export function sheetName(workbook, title) {
  const base = (title || 'Sheet').replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet';
  let name = base;
  for (let i = 2; workbook.getWorksheet(name); i += 1) name = `${base.slice(0, 31 - String(i).length - 1)} ${i}`;
  return name;
}

export const columnLetter = (col) => {
  let letters = '';
  for (let n = col; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  return letters;
};
