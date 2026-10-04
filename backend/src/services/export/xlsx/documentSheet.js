import { buildTree } from '../../../domain/blockTree.js';
import { groupStepRuns } from '../model.js';
import { COLORS, TOP_LEFT, mergeWithValue, setCell } from './styles.js';
import { fitRowHeight } from './layout.js';

const WIDTH = 6; // columns B..G hold values / tables
const LABEL_WIDTH = 30;

/**
 * Generic "label → value" sheet used for test plans (and any free-form
 * document): sections become shaded header rows, tables keep their grid.
 */
export function addDocumentSheet(ws, doc, ctx) {
  ws.getColumn(1).width = LABEL_WIDTH;
  for (let c = 2; c <= WIDTH + 1; c += 1) ws.getColumn(c).width = 20;
  const last = WIDTH + 1;
  let row = 1;

  mergeWithValue(ws, row, 1, row, last, doc.title, { background: COLORS.meta, bold: true });
  ws.getRow(row).height = 24;
  row += 1;
  mergeWithValue(ws, row, 1, row, last, `${ctx.typeLabel(doc.type)} · обновлён ${ctx.formatDate(doc.updatedAt)}`, { background: COLORS.meta });
  row += 2;

  const field = (label, value) => {
    setCell(ws, row, 1, label, { background: COLORS.tableHeader, align: { ...TOP_LEFT, vertical: 'middle' } });
    mergeWithValue(ws, row, 2, row, last, value === '' ? null : value, { align: TOP_LEFT });
    fitRowHeight(ws, row);
    row += 1;
  };

  const grid = (label, columns, rows) => {
    if (label) {
      mergeWithValue(ws, row, 1, row, last, label, { background: COLORS.tableHeader, bold: true, align: { ...TOP_LEFT, vertical: 'middle' } });
      row += 1;
    }
    const span = Math.max(1, Math.floor(last / Math.max(columns.length, 1)));
    const place = (r, values, options) =>
      values.forEach((value, i) => {
        const from = 1 + i * span;
        const to = i === values.length - 1 ? last : from + span - 1;
        mergeWithValue(ws, r, from, r, to, value === '' ? null : value, options);
      });
    place(row, columns, { background: COLORS.levels[0], bold: true });
    row += 1;
    for (const values of rows) {
      place(row, columns.map((_, i) => values[i] ?? ''), { align: TOP_LEFT });
      fitRowHeight(ws, row);
      row += 1;
    }
  };

  const render = (nodes, depth) => {
    for (const unit of groupStepRuns(nodes)) {
      if (unit.type === 'STEP_RUN') {
        grid('Steps', ['#', 'Действие', 'Ожидаемый результат'], unit.steps.map((s, i) => [i + 1, s.content.action ?? '', s.content.expected ?? '']));
        continue;
      }
      const c = unit.content ?? {};
      switch (unit.type) {
        case 'SECTION':
          mergeWithValue(ws, row, 1, row, last, c.title || 'Раздел', { background: COLORS.levels[Math.min(depth, 2) + 1], bold: true, align: { ...TOP_LEFT, vertical: 'middle' } });
          row += 1;
          if (c.description) field('Описание', c.description);
          render(unit.children, depth + 1);
          break;
        case 'HEADING':
          mergeWithValue(ws, row, 1, row, last, c.text ?? '', { bold: true, align: { ...TOP_LEFT, vertical: 'middle' } });
          row += 1;
          break;
        case 'TEXT':
          if (c.text) field('', c.text);
          break;
        case 'INPUT':
        case 'TEXTAREA':
        case 'SELECT':
        case 'RADIO':
        case 'STATUS':
        case 'SEVERITY':
        case 'PRIORITY':
          field(c.label || unit.type, c.value ?? '');
          break;
        case 'CHECKBOX':
          field(`${c.checked || c.status === 'passed' ? '☑' : '☐'} ${c.label ?? ''}`, [c.status && c.status !== 'none' ? c.status : '', c.comment].filter(Boolean).join(' — '));
          render(unit.children, depth);
          break;
        case 'STEP_GROUP':
          grid(c.title || 'Steps', ['#', 'Действие', 'Ожидаемый результат'], unit.children.map((s, i) => [i + 1, s.content.action ?? '', s.content.expected ?? '']));
          break;
        case 'TABLE':
          grid(c.label, c.columns ?? [], c.rows ?? []);
          break;
        case 'ENVIRONMENT':
          grid(c.label || 'Environment', ['Параметр', 'Значение'], (c.items ?? []).map((item) => [item.key, item.value]));
          break;
        case 'RUN_INFO':
          grid('Прогоны', ['Окружение', 'Дата', 'Билд', 'Тип теста'], (c.runs ?? []).map((r) => [r.environment, r.date, r.build, r.testType]));
          break;
        case 'ATTACHMENT':
          field(c.label || 'Вложения', (c.files ?? []).map((f) => `${f.name} — ${ctx.absoluteUrl(f.url)}`).join('\n'));
          break;
        case 'IMAGE':
          if (c.src) field(c.label || c.caption || 'Изображение', ctx.absoluteUrl(c.src));
          break;
        case 'COMMENT':
          if (c.text) field(c.author ? `Комментарий (${c.author})` : 'Комментарий', c.text);
          break;
        default:
          break;
      }
    }
  };
  render(buildTree(doc.blocks), 0);
  ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}
