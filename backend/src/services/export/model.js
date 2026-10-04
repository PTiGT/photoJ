import { buildTree } from '../../domain/blockTree.js';
import { DOCUMENT_TYPE_LABELS } from '../../domain/documentTypes.js';
import { buildChecklistTable, usesChecklistTable } from './checklistTable.js';

export const CHECK_STATUS_LABELS = {
  none: '',
  passed: 'Passed',
  failed: 'Failed',
  blocked: 'Blocked',
  skipped: 'Skipped',
};

export const EMPTY = '—';

/** Formats a byte count as a human readable size. */
export function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

/** 30.09.2026 — the date format used in QA spreadsheets. */
export const formatShortDate = (date) =>
  new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));

export function formatDate(date) {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(date));
}

/** Label of a field-like block with a sensible fallback per type. */
export function fieldLabel(block) {
  const fallback = {
    SEVERITY: 'Severity',
    PRIORITY: 'Priority',
    STATUS: 'Статус',
    ENVIRONMENT: 'Environment',
    ATTACHMENT: 'Вложения',
    TABLE: 'Таблица',
  };
  return block.content?.label?.trim() || fallback[block.type] || '';
}

export const valueOrEmpty = (value) => (value === undefined || value === null || String(value).trim() === '' ? EMPTY : String(value));

/**
 * Groups consecutive STEP siblings so every renderer numbers standalone steps
 * the same way the builder does. Returns render units: either a block or
 * `{ type: 'STEP_RUN', steps: [...] }`.
 */
export function groupStepRuns(children) {
  const units = [];
  for (const child of children) {
    const last = units[units.length - 1];
    if (child.type === 'STEP') {
      if (last?.type === 'STEP_RUN') last.steps.push(child);
      else units.push({ type: 'STEP_RUN', steps: [child] });
    } else {
      units.push(child);
    }
  }
  return units;
}

/** Everything a renderer needs about a document. */
export function buildExportModel(document, blocks, { baseUrl = '', ownerName = '' } = {}) {
  return {
    // Checklists and test lists are rendered as the Module › Submodule › Element › Summary › Status table
    checklist: usesChecklistTable(document.type)
      ? buildChecklistTable({ ...document, blocks }, { formatDate: formatShortDate, ownerName })
      : null,
    title: document.title,
    type: document.type,
    typeLabel: DOCUMENT_TYPE_LABELS[document.type],
    updatedAt: document.updatedAt,
    version: document.latestVersion ?? null,
    tree: buildTree(blocks),
    absoluteUrl: (url = '') => (url.startsWith('/') ? `${baseUrl}${url}` : url),
  };
}
