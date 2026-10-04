import fs from 'node:fs';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  ImageRun,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { CHECK_STATUS_LABELS, EMPTY, fieldLabel, formatDate, formatSize, groupStepRuns, valueOrEmpty } from './model.js';
import { PRIORITY_TONES, SEVERITY_TONES, STATUS_TONE, THEME } from './theme.js';
import { checklistTableDocx } from './checklistDocx.js';

const hex = (color) => color.replace('#', '');
const FONT = 'Calibri';

const run = (text, options = {}) => new TextRun({ text, font: FONT, size: 20, color: hex(THEME.body), ...options });

/** Multi-line text → runs separated by breaks. */
const lines = (text, options) =>
  String(text)
    .split(/\r?\n/)
    .map((line, i) => run(line, { ...options, break: i > 0 ? 1 : 0 }));

const labelParagraph = (text) =>
  new Paragraph({
    spacing: { before: 160, after: 40 },
    children: [run(text.toUpperCase(), { size: 15, bold: true, color: hex(THEME.muted), characterSpacing: 12 })],
  });

const valueParagraph = (text, options = {}) =>
  new Paragraph({ spacing: { after: 80 }, children: lines(valueOrEmpty(text), options) });

const pillParagraph = (text, tone) =>
  new Paragraph({
    spacing: { after: 80 },
    children: [run(` ${text} `, { bold: true, size: 18, color: hex(tone.fg), shading: { type: ShadingType.CLEAR, fill: hex(tone.bg), color: 'auto' } })],
  });

const border = { style: BorderStyle.SINGLE, size: 4, color: hex(THEME.border) };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

function dataTable(columns, rows, widths) {
  const safeRows = rows.length ? rows : [columns.map(() => '')];
  const cell = (text, header) =>
    new TableCell({
      shading: header ? { type: ShadingType.CLEAR, fill: hex(THEME.surface), color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      borders: { top: border, bottom: border, left: noBorder, right: noBorder },
      children: [new Paragraph({ children: lines(header ? text || ' ' : valueOrEmpty(text), header ? { bold: true, size: 17, color: hex(THEME.muted) } : { size: 19 }) })],
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: columns.map((c) => cell(c, true)) }),
      ...safeRows.map((row) => new TableRow({ children: columns.map((_, i) => cell(row[i], false)) })),
    ],
  });
}

const spacer = () => new Paragraph({ spacing: { after: 80 }, children: [] });

const stepsTable = (steps) => [
  dataTable(['#', 'Действие', 'Ожидаемый результат'], steps.map((s, i) => [String(i + 1), s.content.action, s.content.expected]), [500, 4300, 4300]),
  spacer(),
];

function checkbox(block, indent) {
  const { label, checked, status = 'none', comment } = block.content;
  const done = checked || status === 'passed';
  const tone = THEME.check[status];
  const children = [run(done ? '☑ ' : '☐ ', { color: hex(done ? THEME.accent : THEME.muted) }), run(label || EMPTY, { strike: status === 'skipped' })];
  if (status !== 'none') {
    children.push(run('  '), run(` ${CHECK_STATUS_LABELS[status]} `, { size: 16, bold: true, color: hex(tone.fg), shading: { type: ShadingType.CLEAR, fill: hex(tone.bg), color: 'auto' } }));
  }
  const result = [new Paragraph({ indent: { left: indent * 360 }, spacing: { after: 40 }, children })];
  if (comment?.trim()) {
    result.push(new Paragraph({ indent: { left: indent * 360 + 300 }, spacing: { after: 60 }, children: lines(comment.trim(), { italics: true, size: 18, color: hex(THEME.muted) }) }));
  }
  for (const child of block.children) result.push(...checkbox(child, indent + 1));
  return result;
}

function toneFor(block) {
  const { value } = block.content;
  if (block.type === 'SEVERITY') return SEVERITY_TONES[value];
  if (block.type === 'PRIORITY') return PRIORITY_TONES[value];
  return STATUS_TONE;
}

function renderBlock(block, depth, ctx) {
  const c = block.content ?? {};
  switch (block.type) {
    case 'HEADING': {
      const level = Math.min(3, (c.level ?? 1) + depth - 1);
      return [new Paragraph({ spacing: { before: 240, after: 100 }, children: [run(c.text || EMPTY, { bold: true, size: { 1: 32, 2: 27, 3: 24 }[level], color: hex(THEME.ink) })] })];
    }
    case 'TEXT':
      return c.text?.trim() ? [valueParagraph(c.text)] : [];
    case 'INPUT':
    case 'SELECT':
    case 'RADIO':
    case 'TEXTAREA':
      return [labelParagraph(fieldLabel(block)), valueParagraph(c.value)];
    case 'SEVERITY':
    case 'PRIORITY':
    case 'STATUS': {
      const tone = toneFor(block);
      return [labelParagraph(fieldLabel(block)), c.value && tone ? pillParagraph(c.value, tone) : valueParagraph('')];
    }
    case 'CHECKBOX':
      return checkbox(block, 0);
    case 'STEP_GROUP':
      return [labelParagraph(c.title || 'Шаги'), ...stepsTable(block.children)];
    case 'SECTION':
      return [
        new Paragraph({
          spacing: { before: depth === 1 ? 320 : 200, after: 80 },
          indent: { left: (depth - 1) * 240 },
          border: depth === 1 ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: hex(THEME.border), space: 4 } } : undefined,
          children: [run(c.title || 'Раздел', { bold: true, size: depth === 1 ? 26 : 23, color: hex(THEME.ink) })],
        }),
        ...(c.description?.trim() ? [valueParagraph(c.description, { italics: true, color: hex(THEME.muted) })] : []),
        ...children(block.children, depth + 1, ctx),
      ];
    case 'TABLE':
      return [labelParagraph(fieldLabel(block)), dataTable(c.columns ?? [], c.rows ?? []), spacer()];
    case 'ENVIRONMENT':
      return [labelParagraph(fieldLabel(block)), dataTable(['Параметр', 'Значение'], (c.items ?? []).map((i) => [i.key, i.value]), [3000, 6100]), spacer()];
    case 'IMAGE':
      return image(block, ctx);
    case 'ATTACHMENT': {
      const files = c.files ?? [];
      return [
        labelParagraph(fieldLabel(block)),
        ...(files.length
          ? files.map(
              (f) =>
                new Paragraph({
                  bullet: { level: 0 },
                  children: [
                    new ExternalHyperlink({ link: ctx.absoluteUrl(f.url), children: [run(f.name, { color: hex(THEME.accent), underline: {} })] }),
                    run(`  ${formatSize(f.size)}`, { color: hex(THEME.muted) }),
                  ],
                }),
            )
          : [valueParagraph('')]),
      ];
    }
    case 'RUN_INFO':
      return [labelParagraph('Прогоны'), dataTable(['Окружение', 'Дата', 'Билд', 'Тип теста'], (c.runs ?? []).map((r) => [r.environment, r.date, r.build, r.testType])), spacer()];
    case 'COMMENT':
      if (!c.text?.trim()) return [];
      return [
        new Paragraph({
          spacing: { before: 120, after: 120 },
          shading: { type: ShadingType.CLEAR, fill: hex(THEME.commentBg), color: 'auto' },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: hex(THEME.accent), space: 8 } },
          children: [...(c.author ? [run(`${c.author}: `, { bold: true })] : []), ...lines(c.text)],
        }),
      ];
    default:
      return [];
  }
}

function image(block, ctx) {
  const c = block.content;
  if (!c.src) return [];
  const local = ctx.resolveLocalFile(c.src);
  if (!local || !/\.(png|jpe?g|gif)$/i.test(local) || !fs.existsSync(local)) {
    return [labelParagraph(c.label || 'Изображение'), valueParagraph(ctx.absoluteUrl(c.src))];
  }
  const type = /\.png$/i.test(local) ? 'png' : /\.gif$/i.test(local) ? 'gif' : 'jpg';
  return [
    ...(c.label ? [labelParagraph(c.label)] : []),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type, data: fs.readFileSync(local), transformation: { width: 480, height: 300 } })] }),
    ...(c.caption ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(c.caption, { italics: true, size: 18, color: hex(THEME.muted) })] })] : []),
  ];
}

function children(list, depth, ctx) {
  return groupStepRuns(list).flatMap((unit) => (unit.type === 'STEP_RUN' ? stepsTable(unit.steps) : renderBlock(unit, depth, ctx)));
}

export async function renderDocx(model, { resolveLocalFile = () => null } = {}) {
  const ctx = { absoluteUrl: model.absoluteUrl, resolveLocalFile };
  const landscape = Boolean(model.checklist && model.checklist.columns.length > 6);
  const body = model.checklist
    ? [...checklistTableDocx(model.checklist), spacer(), ...children(model.checklist.notes, 1, ctx)]
    : children(model.tree, 1, ctx);
  const meta = [`Обновлён ${formatDate(model.updatedAt)}`];
  if (model.version) meta.push(`версия ${model.version}`);

  const doc = new Document({
    creator: 'QA Builder',
    title: model.title,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
            // Wide checklist tables (several runs) are laid out in landscape.
            size: { orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
          },
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('QA Builder · ', { size: 16, color: hex(THEME.muted) }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: hex(THEME.muted), font: FONT })] })],
          }),
        },
        children: [
          pillParagraph(model.typeLabel.toUpperCase(), { bg: THEME.accentSoft, fg: THEME.accent }),
          new Paragraph({ spacing: { after: 60 }, children: [run(model.title, { bold: true, size: 40, color: hex(THEME.ink) })] }),
          new Paragraph({
            spacing: { after: 240 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: hex(THEME.ink), space: 8 } },
            children: [run(meta.join(' · '), { size: 17, color: hex(THEME.muted) })],
          }),
          ...body,
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
