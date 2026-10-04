import fs from 'node:fs';
import { createRequire } from 'node:module';
import { CHECK_STATUS_LABELS, EMPTY, fieldLabel, formatDate, formatSize, groupStepRuns, valueOrEmpty } from './model.js';
import { SEVERITY_TONES, PRIORITY_TONES, STATUS_TONE, THEME } from './theme.js';
import { checklistTablePdf } from './checklistPdf.js';

const require = createRequire(import.meta.url);
const PdfPrinter = require('pdfmake/src/printer');
const vfs = require('pdfmake/build/vfs_fonts.js');

const font = (name) => Buffer.from(vfs[name], 'base64');
const printer = new PdfPrinter({
  Roboto: {
    normal: font('Roboto-Regular.ttf'),
    bold: font('Roboto-Medium.ttf'),
    italics: font('Roboto-Italic.ttf'),
    bolditalics: font('Roboto-MediumItalic.ttf'),
  },
});

const HEADING_SIZES = { 1: 16, 2: 13.5, 3: 12 };

const label = (text) => ({ text: text.toUpperCase(), style: 'label' });

const pill = (text, tone) => ({
  table: { widths: ['auto'], body: [[{ text, color: tone.fg, bold: true, fontSize: 8.5, margin: [6, 1.5, 6, 1.5] }]] },
  layout: { fillColor: () => tone.bg, hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0 },
});

/** Table layout with a soft header row and hairline separators. */
const tableLayout = {
  fillColor: (row) => (row === 0 ? THEME.surface : null),
  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0.6 : 0.4),
  vLineWidth: () => 0,
  hLineColor: () => THEME.border,
  paddingTop: () => 5,
  paddingBottom: () => 5,
  paddingLeft: () => 6,
  paddingRight: () => 6,
};

function dataTable(columns, rows, widths) {
  return {
    table: {
      headerRows: 1,
      widths: widths ?? columns.map(() => '*'),
      body: [
        columns.map((c) => ({ text: c || ' ', style: 'th' })),
        ...(rows.length ? rows : [columns.map(() => '')]).map((row) =>
          columns.map((_, i) => ({ text: valueOrEmpty(row[i]), style: 'td' })),
        ),
      ],
    },
    layout: tableLayout,
    margin: [0, 2, 0, 10],
  };
}

const stepsTable = (steps) =>
  dataTable(
    ['#', 'Действие', 'Ожидаемый результат'],
    steps.map((s, i) => [String(i + 1), s.content.action, s.content.expected]),
    [18, '*', '*'],
  );

function field(block, body) {
  return { stack: [label(fieldLabel(block)), body], margin: [0, 0, 0, 10], unbreakable: true };
}

function toneFor(block) {
  const value = block.content.value;
  if (block.type === 'SEVERITY') return SEVERITY_TONES[value];
  if (block.type === 'PRIORITY') return PRIORITY_TONES[value];
  if (block.type === 'STATUS') return STATUS_TONE;
  return null;
}

function checkbox(block, indent) {
  const { label: text, checked, status = 'none', comment } = block.content;
  const done = checked || status === 'passed';
  const tone = THEME.check[status] ?? THEME.check.none;
  const row = {
    columns: [
      { width: 12, canvas: [{ type: 'rect', x: 0, y: 1.5, w: 8, h: 8, r: 1.5, lineColor: done ? THEME.accent : THEME.muted, color: done ? THEME.accent : '#FFFFFF', lineWidth: 0.8 }] },
      { width: '*', text: text || EMPTY, style: 'value', decoration: status === 'skipped' ? 'lineThrough' : undefined },
      status !== 'none' ? { width: 'auto', ...pill(CHECK_STATUS_LABELS[status], tone) } : { width: 0, text: '' },
    ],
    columnGap: 4,
    margin: [indent * 14, 2, 0, 2],
  };
  const parts = [row];
  if (comment?.trim()) parts.push({ text: comment.trim(), style: 'note', margin: [indent * 14 + 16, 0, 0, 3] });
  for (const child of block.children) parts.push(...checkbox(child, indent + 1));
  return parts;
}

function renderBlock(block, depth, ctx) {
  const c = block.content ?? {};
  switch (block.type) {
    case 'HEADING': {
      const level = Math.min(3, (c.level ?? 1) + depth - 1);
      return { text: c.text || EMPTY, fontSize: HEADING_SIZES[level], bold: true, color: THEME.ink, margin: [0, 8, 0, 6] };
    }
    case 'TEXT':
      return c.text?.trim() ? { text: c.text, style: 'value', margin: [0, 0, 0, 8] } : null;
    case 'INPUT':
    case 'SELECT':
    case 'RADIO':
      return field(block, { text: valueOrEmpty(c.value), style: 'value' });
    case 'SEVERITY':
    case 'PRIORITY':
    case 'STATUS': {
      const tone = toneFor(block);
      return field(block, c.value && tone ? pill(c.value, tone) : { text: EMPTY, style: 'value' });
    }
    case 'TEXTAREA':
      return field(block, { text: valueOrEmpty(c.value), style: 'value' });
    case 'CHECKBOX':
      return { stack: checkbox(block, 0), margin: [0, 0, 0, 2] };
    case 'STEP_GROUP':
      return { stack: [label(c.title || 'Шаги'), stepsTable(block.children)] };
    case 'SECTION':
      return section(block, depth, ctx);
    case 'TABLE':
      return { stack: [label(fieldLabel(block)), dataTable(c.columns ?? [], c.rows ?? [])] };
    case 'ENVIRONMENT':
      return {
        stack: [
          label(fieldLabel(block)),
          dataTable(['Параметр', 'Значение'], (c.items ?? []).map((i) => [i.key, i.value]), [140, '*']),
        ],
      };
    case 'IMAGE':
      return image(block, ctx);
    case 'ATTACHMENT': {
      const files = c.files ?? [];
      return field(block, {
        ul: files.length
          ? files.map((f) => ({ text: [{ text: f.name, link: ctx.absoluteUrl(f.url), color: THEME.accent }, { text: `  ${formatSize(f.size)}`, color: THEME.muted }] }))
          : [EMPTY],
        style: 'value',
      });
    }
    case 'RUN_INFO':
      return {
        stack: [
          label('Прогоны'),
          dataTable(['Окружение', 'Дата', 'Билд', 'Тип теста'], (c.runs ?? []).map((r) => [r.environment, r.date, r.build, r.testType])),
        ],
      };
    case 'COMMENT':
      if (!c.text?.trim()) return null;
      return {
        table: {
          widths: ['*'],
          body: [[{ stack: [c.author ? { text: c.author, bold: true, fontSize: 9, color: THEME.ink, margin: [0, 0, 0, 2] } : '', { text: c.text, style: 'value' }] }]],
        },
        layout: { fillColor: () => THEME.commentBg, hLineWidth: () => 0, vLineWidth: (i) => (i === 0 ? 2 : 0), vLineColor: () => THEME.accent, paddingLeft: () => 10, paddingTop: () => 7, paddingBottom: () => 7 },
        margin: [0, 2, 0, 10],
      };
    default:
      return null;
  }
}

function image(block, ctx) {
  const c = block.content;
  const file = c.src ? ctx.resolveLocalImage(c.src) : null;
  if (!file) return c.src ? field(block, { text: ctx.absoluteUrl(c.src), link: ctx.absoluteUrl(c.src), color: THEME.accent }) : null;
  return {
    stack: [
      c.label ? label(c.label) : '',
      { image: file, fit: [480, 320], margin: [0, 2, 0, 4] },
      c.caption ? { text: c.caption, style: 'note', alignment: 'center' } : '',
    ],
    margin: [0, 0, 0, 10],
  };
}

function section(block, depth, ctx) {
  const c = block.content;
  return {
    stack: [
      {
        text: c.title || 'Раздел',
        fontSize: depth === 1 ? 13 : 11.5,
        bold: true,
        color: THEME.ink,
        margin: [0, depth === 1 ? 10 : 6, 0, 2],
      },
      depth === 1
        ? { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: THEME.border }], margin: [0, 0, 0, 6] }
        : '',
      c.description?.trim() ? { text: c.description, style: 'note', margin: [0, 0, 0, 6] } : '',
      ...children(block.children, depth + 1, ctx),
    ],
    margin: [depth > 1 ? 10 : 0, 0, 0, 4],
  };
}

function children(list, depth, ctx) {
  return groupStepRuns(list)
    .map((unit) => (unit.type === 'STEP_RUN' ? stepsTable(unit.steps) : renderBlock(unit, depth, ctx)))
    .filter(Boolean);
}

function header(model, width) {
  const meta = [`Обновлён ${formatDate(model.updatedAt)}`];
  if (model.version) meta.push(`версия ${model.version}`);
  return [
    pill(model.typeLabel.toUpperCase(), { bg: THEME.accentSoft, fg: THEME.accent }),
    { text: model.title, fontSize: 21, bold: true, color: THEME.ink, margin: [0, 8, 0, 3] },
    { text: meta.join(' · '), fontSize: 9, color: THEME.muted },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: width, y2: 0, lineWidth: 1, lineColor: THEME.ink }], margin: [0, 12, 0, 14] },
  ];
}

/** Renders the export model into a PDF buffer. */
export function renderPdf(model, { resolveLocalImage = () => null } = {}) {
  const ctx = { absoluteUrl: model.absoluteUrl, resolveLocalImage };
  // Wide checklist tables (several runs) are printed in landscape.
  const landscape = Boolean(model.checklist && model.checklist.columns.length > 6);
  const contentWidth = landscape ? 762 : 515;
  const body = model.checklist
    ? [...checklistTablePdf(model.checklist), ...children(model.checklist.notes, 1, ctx)]
    : children(model.tree, 1, ctx);
  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: landscape ? 'landscape' : 'portrait',
    pageMargins: [40, 44, 40, 48],
    info: { title: model.title, creator: 'QA Builder' },
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.3, color: THEME.body },
    styles: {
      label: { fontSize: 7.5, bold: true, color: THEME.muted, characterSpacing: 0.6, margin: [0, 0, 0, 3] },
      value: { fontSize: 10, color: THEME.body },
      note: { fontSize: 9, italics: true, color: THEME.muted },
      th: { fontSize: 8.5, bold: true, color: THEME.muted },
      td: { fontSize: 9.5, color: THEME.body },
    },
    content: [...header(model, contentWidth), ...body],
    footer: (page, pages) => ({
      columns: [
        { text: 'QA Builder', color: THEME.muted },
        { text: `${page} / ${pages}`, alignment: 'right', color: THEME.muted },
      ],
      fontSize: 8,
      margin: [40, 16, 40, 0],
    }),
  };

  return new Promise((resolve, reject) => {
    const pdf = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    pdf.end();
  });
}

/** Reads a local upload as a data URL if it's an image pdfmake can embed. */
export function readImageForPdf(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const lower = filePath.toLowerCase();
  const mime = lower.endsWith('.png') ? 'image/png' : lower.match(/\.jpe?g$/) ? 'image/jpeg' : null;
  if (!mime) return null;
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
}
