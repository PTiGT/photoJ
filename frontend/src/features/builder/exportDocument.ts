import { toast } from 'sonner';
import { documentsApi } from '@/api';
import type { ExportFormat } from '@/types';

export const EXPORT_FORMATS: { format: ExportFormat; label: string; hint: string }[] = [
  { format: 'xlsx', label: 'Excel (XLSX)', hint: 'Таблица для Excel / Google Sheets' },
  { format: 'pdf', label: 'PDF', hint: 'Для отправки и печати' },
  { format: 'docx', label: 'Word (DOCX)', hint: 'Для редактирования в Word' },
  { format: 'markdown', label: 'Markdown', hint: 'Для Git, Confluence, Jira' },
  { format: 'json', label: 'JSON', hint: 'Структура блоков' },
];

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Saves pending changes first so the export always matches what the user sees. */
export async function exportDocument(id: string, format: ExportFormat, flush: () => Promise<boolean>) {
  const label = EXPORT_FORMATS.find((f) => f.format === format)?.label ?? format;
  const toastId = toast.loading(`Готовим ${label}…`);
  try {
    if (!(await flush())) throw new Error('Не удалось сохранить изменения перед экспортом');
    const { blob, filename } = await documentsApi.export(id, format);
    downloadBlob(blob, filename);
    toast.success(`${label} готов`, { id: toastId, description: filename });
  } catch (error) {
    toast.error((error as Error).message, { id: toastId });
  }
}

/** Several documents in one Excel workbook (checklists → own sheets, test cases → one table). */
export async function exportDocumentsToExcel(ids: string[]) {
  const toastId = toast.loading(`Готовим Excel (${ids.length})…`);
  try {
    const { blob, filename } = await documentsApi.exportMany(ids);
    downloadBlob(blob, filename);
    toast.success('Excel готов', { id: toastId, description: filename });
    return true;
  } catch (error) {
    toast.error((error as Error).message, { id: toastId });
    return false;
  }
}
