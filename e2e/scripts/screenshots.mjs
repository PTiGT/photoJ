/**
 * Regenerates README screenshots from a running dev instance (npm run dev)
 * using the seeded demo account: node e2e/scripts/screenshots.mjs
 */
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = fileURLToPath(new URL('../../docs/screenshots/', import.meta.url));

const browser = await chromium.launch();

async function session({ width = 1440, height = 900, theme = 'light' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill('demo@qabuilder.local');
  await page.getByLabel('Пароль').fill('demo12345');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector('[data-testid=document-card]');
  return { page, context };
}

async function openDocument(page, title) {
  await page.goto(`${BASE}/`);
  await page.getByRole('link', { name: title }).first().click();
  await page.waitForSelector('[data-testid=block-card]');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
}

const shots = [
  ['dashboard.png', {}, async (page) => page.waitForTimeout(300)],
  ['builder-bug-report.png', {}, (page) => openDocument(page, 'Авторизация не работает после смены пароля')],
  ['builder-dark.png', { theme: 'dark' }, async (page) => {
    await openDocument(page, 'Вход с валидными данными');
  }],
  ['builder-test-list.png', {}, (page) => openDocument(page, 'Тест-лист: Авторизация')],
  ['builder-checklist-table.png', {}, async (page) => {
    await openDocument(page, 'Aliexpress — регистрация');
    await page.locator('[data-testid=canvas]').evaluate((el) => el.scrollTo(0, 680));
    await page.waitForTimeout(300);
  }],
  ['preview-table.png', {}, async (page) => {
    await openDocument(page, 'Aliexpress — регистрация');
    await page.getByRole('button', { name: 'Предпросмотр', exact: true }).click();
    await page.waitForTimeout(500);
  }],
  ['create-document.png', {}, async (page) => {
    await page.getByTestId('create-document').click();
    await page.getByTestId('type-TEST_CASE').click();
    await page.waitForTimeout(400);
  }],
  ['mobile-builder.png', { width: 390, height: 844 }, (page) => openDocument(page, 'Чек-лист: форма входа')],
];

for (const [file, options, action] of shots) {
  const { page, context } = await session(options);
  await action(page);
  await page.screenshot({ path: OUT + file });
  await context.close();
  console.log('✔', file);
}
await browser.close();
