import { expect, test, type Download } from '@playwright/test';
import ExcelJS from 'exceljs';
import { createDocument, loginViaUi, registerViaApi, waitSaved } from './helpers';

async function readWorkbook(download: Download) {
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.concat(chunks));
  return workbook;
}

test.describe('Прогоны и Excel', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, await registerViaApi(page));
  });

  test('статусы по окружениям и экспорт чек-листа в Excel', async ({ page }) => {
    await createDocument(page, 'CHECKLIST', 'Кросс-браузер', 'Кросс-браузерный');

    // 5 environments from the template → 5 status pills per check
    await expect(page.getByTestId('run-row')).toHaveCount(5);
    const firstCheck = page.locator('[data-block-type=CHECKBOX]').first();
    await expect(firstCheck.getByTestId('run-status')).toHaveCount(5);

    // Safari (2nd run) → failed with a comment, via the pill popover
    await firstCheck.getByTestId('run-status').nth(1).click();
    await page.getByTestId('run-status-failed').click();
    await page.getByLabel('Комментарий для окружения').fill('Не открывается список');
    await page.keyboard.press('Escape');

    // Chrome (1st run) → passed straight from the table preview
    const table = page.getByTestId('checklist-table');
    await expect(table).toBeVisible();
    const cell = table.getByTestId('table-status-cell').first();
    await cell.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await cell.click();
    await page.getByRole('menuitem', { name: 'Passed' }).click();
    await expect(table.getByTestId('table-status-cell').first()).toHaveText('passed');
    await expect(table.getByTestId('table-status-cell').nth(1)).toHaveText('failed');
    await waitSaved(page);

    await page.getByTestId('export-button').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /^Excel/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Кросс-браузер.xlsx');

    const ws = (await readWorkbook(download)).getWorksheet('Кросс-браузер')!;
    const headerRowNumber = ws.getColumn(1).values.findIndex((v) => v === 'Module');
    const header = ws.getRow(headerRowNumber).values as unknown[];
    expect(header.slice(1, 6)).toEqual(['Module', 'Submodule', 'Element/function', 'Summary', 'Status']);
    const first = ws.getRow(headerRowNumber + 1).values as unknown[];
    expect(first.slice(1, 7)).toEqual(['Registration', 'Choose a location', 'Dropdown', 'All countries are loaded', 'passed', 'failed']);
    expect(first).toContain('Не открывается список');
  });

  test('массовый экспорт документов с Dashboard в одну книгу', async ({ page }) => {
    await createDocument(page, 'TEST_CASE', 'Кейс А');
    await page.getByLabel('Title', { exact: true }).fill('Вход по email');
    await waitSaved(page);
    await page.getByRole('link', { name: 'Назад' }).click();
    await createDocument(page, 'CHECKLIST', 'Чек-лист Б');
    await page.getByRole('link', { name: 'Назад' }).click();

    const list = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Мои документы' }) });
    await list.getByTestId('document-card').filter({ hasText: 'Кейс А' }).getByTestId('select-document').click();
    await list.getByTestId('document-card').filter({ hasText: 'Чек-лист Б' }).getByTestId('select-document').click();
    await expect(page.getByText('Выбрано: 2')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-selected').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('QA Builder — экспорт (2).xlsx');

    const workbook = await readWorkbook(download);
    expect(workbook.worksheets.map((w) => w.name).sort()).toEqual(['Кейс А', 'Чек-лист Б'].sort());
    const testCases = workbook.getWorksheet('Кейс А')!;
    expect((testCases.getRow(1).values as unknown[]).slice(1, 7)).toEqual(['ID', 'Summary', 'Pre-conditions', 'Test data', 'Steps', 'Expected results']);
    expect(testCases.getCell('B2').value).toBe('Вход по email');
    await expect(page.getByText('Выбрано: 2')).toBeHidden();
  });
});
