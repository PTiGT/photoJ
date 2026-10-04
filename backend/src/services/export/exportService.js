import { documentService } from '../documentService.js';
import { attachmentService } from '../attachmentService.js';
import { buildExportModel } from './model.js';
import { renderMarkdown } from './markdownRenderer.js';
import { renderPdf, readImageForPdf } from './pdfRenderer.js';
import { renderDocx } from './docxRenderer.js';
import { renderWorkbook } from './xlsx/workbook.js';
import { HttpError } from '../../utils/httpError.js';

/** Maps `/uploads/<key>` URLs to files on disk; external URLs are not fetched. */
function resolveLocalFile(src) {
  const match = /^\/uploads\/([\w.-]+)$/.exec(src ?? '');
  return match ? attachmentService.resolvePath(match[1]) : null;
}

/** Safe ASCII-ish filename + RFC 5987 UTF-8 variant for Content-Disposition. */
export function contentDisposition(title, extension) {
  const base = (title || 'document').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 120) || 'document';
  const ascii = base.replace(/[^\x20-\x7E]/g, '_');
  return `attachment; filename="${ascii}.${extension}"; filename*=UTF-8''${encodeURIComponent(`${base}.${extension}`)}`;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const FORMATS = {
  xlsx: {
    extension: 'xlsx',
    mime: XLSX_MIME,
    render: (model, document, ctx) => renderWorkbook([document], { absoluteUrl: model.absoluteUrl, ownerName: ctx.ownerName }),
  },
  markdown: {
    extension: 'md',
    mime: 'text/markdown; charset=utf-8',
    render: (model) => Buffer.from(renderMarkdown(model), 'utf8'),
  },
  pdf: {
    extension: 'pdf',
    mime: 'application/pdf',
    render: (model) =>
      renderPdf(model, {
        resolveLocalImage: (src) => {
          const file = resolveLocalFile(src);
          return file ? readImageForPdf(file) : null;
        },
      }),
  },
  docx: {
    extension: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    render: (model) => renderDocx(model, { resolveLocalFile }),
  },
  json: {
    extension: 'json',
    mime: 'application/json; charset=utf-8',
    render: (model, document) =>
      Buffer.from(
        JSON.stringify(
          {
            format: 'qa-builder/v1',
            title: document.title,
            type: document.type,
            updatedAt: document.updatedAt,
            version: document.latestVersion,
            blocks: document.blocks,
          },
          null,
          2,
        ),
        'utf8',
      ),
  },
};

export const EXPORT_FORMATS = Object.keys(FORMATS);

/** Formats that can combine several documents into one file. */
export const BULK_EXPORT_FORMATS = ['xlsx'];

export const exportService = {
  /** Several documents in one Excel workbook (keeps the requested order, ignores duplicates). */
  async exportMany(user, ids, format, { baseUrl }) {
    if (!BULK_EXPORT_FORMATS.includes(format)) throw HttpError.badRequest('Массовый экспорт доступен только в Excel');
    const documents = [];
    for (const id of [...new Set(ids)]) documents.push(await documentService.get(user, id));
    const absoluteUrl = buildExportModel(documents[0], [], { baseUrl }).absoluteUrl;
    const buffer = await renderWorkbook(documents, { absoluteUrl, ownerName: user.name });
    const title = documents.length === 1 ? documents[0].title : `QA Builder — экспорт (${documents.length})`;
    return { buffer, mime: XLSX_MIME, disposition: contentDisposition(title, 'xlsx') };
  },

  async export(user, documentId, format, { baseUrl }) {
    const exporter = FORMATS[format];
    const document = await documentService.get(user, documentId);
    const model = buildExportModel(document, document.blocks, { baseUrl, ownerName: user.name });
    const buffer = await exporter.render(model, document, { ownerName: user.name });
    return {
      buffer,
      mime: exporter.mime,
      disposition: contentDisposition(document.title, exporter.extension),
    };
  },
};
