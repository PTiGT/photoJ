import ExcelJS from 'exceljs';
import { DOCUMENT_TYPE_LABELS } from '../../../domain/documentTypes.js';
import { formatDate, formatShortDate } from '../model.js';
import { sheetName } from './styles.js';
import { addChecklistSheet } from './checklistSheet.js';
import { addBugReportsSheet, addTestCasesSheet } from './rowSheets.js';
import { addDocumentSheet } from './documentSheet.js';

/**
 * Builds one workbook from one or many documents:
 * - each checklist / test list → its own sheet (Module › Submodule › Element › Summary › Status per run);
 * - all test cases → one "Test Cases" sheet, one row per case;
 * - all bug reports → one "Bug Reports" sheet;
 * - test plans → a label/value sheet each.
 */
export async function renderWorkbook(documents, { absoluteUrl, ownerName }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QA Builder';
  workbook.created = new Date();
  const ctx = { absoluteUrl, ownerName, formatDate: formatShortDate, formatDateTime: formatDate, typeLabel: (type) => DOCUMENT_TYPE_LABELS[type] };

  const testCases = documents.filter((doc) => doc.type === 'TEST_CASE');
  const bugReports = documents.filter((doc) => doc.type === 'BUG_REPORT');
  const singleRowSheet = (docs, fallback) => (docs.length === 1 ? docs[0].title : fallback);

  let testCasesAdded = false;
  let bugsAdded = false;
  for (const doc of documents) {
    if (doc.type === 'CHECKLIST' || doc.type === 'TEST_LIST') {
      addChecklistSheet(workbook.addWorksheet(sheetName(workbook, doc.title)), doc, ctx);
    } else if (doc.type === 'TEST_CASE' && !testCasesAdded) {
      addTestCasesSheet(workbook.addWorksheet(sheetName(workbook, singleRowSheet(testCases, 'Test Cases'))), testCases, ctx);
      testCasesAdded = true;
    } else if (doc.type === 'BUG_REPORT' && !bugsAdded) {
      addBugReportsSheet(workbook.addWorksheet(sheetName(workbook, singleRowSheet(bugReports, 'Bug Reports'))), bugReports, ctx);
      bugsAdded = true;
    } else if (doc.type === 'TEST_PLAN') {
      addDocumentSheet(workbook.addWorksheet(sheetName(workbook, doc.title)), doc, ctx);
    }
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
