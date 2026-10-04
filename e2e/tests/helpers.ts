import { expect, type Locator, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export function newUser() {
  const id = randomUUID().slice(0, 8);
  return { name: `Тестировщик ${id}`, email: `e2e-${id}@test.dev`, password: 'password123' };
}

/** Registers through the API (fast path for tests that are not about registration). */
export async function registerViaApi(page: Page, user = newUser()) {
  const res = await page.request.post('/api/auth/register', { data: user });
  expect(res.ok()).toBeTruthy();
  return user;
}

export async function loginViaUi(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Пароль').fill(user.password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('heading', { name: 'Ваши QA-документы' })).toBeVisible();
}

export async function createDocument(page: Page, type: string, title: string, template?: string) {
  await page.getByTestId('create-document').click();
  await page.getByTestId(`type-${type}`).click();
  await page.getByLabel('Название').fill(title);
  if (template) await page.getByRole('radio', { name: new RegExp(template) }).click();
  await page.getByTestId('create-document-submit').click();
  await expect(page).toHaveURL(/\/documents\//);
  await expect(page.getByTestId('document-title')).toHaveValue(title);
}

/** Root-level block types in canvas order. */
export function rootBlockTypes(page: Page) {
  return page
    .locator('[data-testid=canvas] > div > div > [data-block-id]')
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.blockType));
}

/** Pointer-based drag that dnd-kit recognises (it needs intermediate moves). */
export async function dragTo(page: Page, source: Locator, target: Locator, position: 'before' | 'after' = 'before') {
  await source.scrollIntoViewIfNeeded();
  const from = (await source.boundingBox())!;
  const to = (await target.boundingBox())!;
  const targetY = position === 'before' ? to.y + 6 : to.y + to.height - 6;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 10, { steps: 3 });
  await page.mouse.move(to.x + to.width / 2, targetY, { steps: 12 });
  await page.mouse.up();
}

export async function waitSaved(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved', { timeout: 10_000 });
}
