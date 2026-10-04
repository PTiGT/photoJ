import { expect, test } from '@playwright/test';
import { createDocument, dragTo, loginViaUi, newUser, registerViaApi, rootBlockTypes, waitSaved } from './helpers';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('Аутентификация', () => {
  test('регистрация нового пользователя', async ({ page }) => {
    const user = newUser();
    await page.goto('/register');
    await page.getByLabel('Имя').fill(user.name);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Пароль').fill(user.password);
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText(`${user.name.split(' ')[0]}`, { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Здесь появятся ваши документы')).toBeVisible();
  });

  test('валидация формы регистрации', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
    await expect(page.getByText('Минимум 2 символа')).toBeVisible();
    await expect(page.getByText('Введите корректный email')).toBeVisible();
    await expect(page.getByText('Минимум 8 символов')).toBeVisible();
  });

  test('вход и выход', async ({ page }) => {
    const user = await registerViaApi(page);
    await loginViaUi(page, user);
    await page.getByRole('button', { name: 'Меню пользователя' }).click();
    await page.getByRole('menuitem', { name: 'Выйти' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('неверный пароль показывает ошибку', async ({ page }) => {
    const user = await registerViaApi(page);
    await page.goto('/login');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Пароль').fill('wrong-password');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByText('Неверный email или пароль')).toBeVisible();
  });
});

test.describe('Конструктор Bug Report', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, await registerViaApi(page));
  });

  test('создание, редактирование, порядок блоков, сохранение и повторное открытие', async ({ page }) => {
    await createDocument(page, 'BUG_REPORT', 'Не работает вход');

    // Default Bug Report structure is generated from blocks
    const types = await rootBlockTypes(page);
    expect(types).toEqual(expect.arrayContaining(['INPUT', 'STEP_GROUP', 'SEVERITY', 'PRIORITY', 'ATTACHMENT']));
    await expect(page.getByTestId('document-preview')).toContainText('Не работает вход');

    // Fill fields — preview updates live
    await page.getByLabel('Title', { exact: true }).fill('Ошибка 401 при входе');
    await page.getByLabel('Шаг 1: действие').fill('Открыть страницу входа');
    await page.getByTestId('severity-Critical').click();
    await expect(page.getByTestId('document-preview')).toContainText('Ошибка 401 при входе');
    await expect(page.getByTestId('document-preview')).toContainText('Critical');

    // Add a step dynamically
    await page.getByTestId('add-step').click();
    await expect(page.getByTestId('step-number')).toHaveCount(4);

    // Add a block from the palette (click adds after the selected block)
    // The new comment goes right after the selected step group, i.e. above the template's comment
    await page.getByTestId('palette-COMMENT').click();
    await page.getByLabel('Текст комментария').first().fill('Воспроизводится стабильно');

    // Reorder: drag PRIORITY above SEVERITY
    const before = await rootBlockTypes(page);
    expect(before.indexOf('SEVERITY')).toBeLessThan(before.indexOf('PRIORITY'));
    const priority = page.locator('[data-block-type=PRIORITY]').first();
    await priority.hover();
    await dragTo(page, priority.getByTestId('drag-handle'), page.locator('[data-block-type=SEVERITY]').first(), 'before');
    await expect.poll(async () => {
      const order = await rootBlockTypes(page);
      return order.indexOf('PRIORITY') < order.indexOf('SEVERITY');
    }).toBe(true);

    // Manual save creates a version
    await page.keyboard.press(`${mod}+s`);
    await expect(page.getByText(/Сохранено · версия 2/)).toBeVisible();
    await waitSaved(page);

    // Re-open the document: everything persisted
    const url = page.url();
    await page.getByRole('link', { name: 'Назад' }).click();
    await expect(page.getByRole('link', { name: 'Не работает вход' }).first()).toBeVisible();
    await page.goto(url);
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Ошибка 401 при входе');
    await expect(page.getByLabel('Текст комментария').first()).toHaveValue('Воспроизводится стабильно');
    await expect(page.getByTestId('step-number')).toHaveCount(4);
    const reopened = await rootBlockTypes(page);
    expect(reopened.indexOf('PRIORITY')).toBeLessThan(reopened.indexOf('SEVERITY'));
  });

  test('перетаскивание компонента из палитры в документ', async ({ page }) => {
    await createDocument(page, 'BUG_REPORT', 'DnD из палитры');
    const firstBlock = page.locator('[data-testid=canvas] [data-block-type=INPUT]').first();
    await dragTo(page, page.getByTestId('palette-HEADING'), firstBlock, 'before');
    await expect.poll(async () => (await rootBlockTypes(page))[0]).toBe('HEADING');
    await waitSaved(page);
  });

  test('удаление блока и отмена через Ctrl+Z', async ({ page }) => {
    await createDocument(page, 'BUG_REPORT', 'Undo');
    const count = (await rootBlockTypes(page)).length;
    const comment = page.locator('[data-block-type=COMMENT]').first();
    await comment.hover();
    await comment.getByRole('button', { name: 'Удалить блок' }).click();
    await expect.poll(async () => (await rootBlockTypes(page)).length).toBe(count - 1);

    await page.locator('body').click({ position: { x: 5, y: 500 } });
    await page.keyboard.press(`${mod}+z`);
    await expect.poll(async () => (await rootBlockTypes(page)).length).toBe(count);
  });

  test('история версий', async ({ page }) => {
    await createDocument(page, 'TEST_CASE', 'Версии');
    await page.getByLabel('Title', { exact: true }).fill('Проверка логина');
    await page.keyboard.press(`${mod}+s`);
    await expect(page.getByText(/Сохранено · версия 2/)).toBeVisible();

    await page.getByTestId('open-history').click();
    await expect(page.getByTestId('version-item')).toHaveCount(2);
    await page.getByTestId('version-item').last().click();
    await expect(page.getByRole('dialog', { name: 'Версия 1' })).toBeVisible();
  });
});

test.describe('Экспорт', () => {
  test('экспорт в PDF и Markdown', async ({ page }) => {
    await loginViaUi(page, await registerViaApi(page));
    await createDocument(page, 'CHECKLIST', 'Чек-лист экспорта', 'Авторизация');

    for (const [format, extension] of [
      ['PDF', '.pdf'],
      ['Markdown', '.md'],
    ] as const) {
      await page.getByTestId('export-button').click();
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: new RegExp(`^${format}`) }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(`Чек-лист экспорта${extension}`);
      const stream = await download.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      const content = Buffer.concat(chunks);
      if (extension === '.pdf') expect(content.subarray(0, 5).toString()).toBe('%PDF-');
      else expect(content.toString('utf8')).toContain('Вход с валидными email и паролем');
    }
  });
});

test.describe('Dashboard', () => {
  test('поиск, избранное, дублирование и удаление', async ({ page }) => {
    await loginViaUi(page, await registerViaApi(page));
    await createDocument(page, 'TEST_PLAN', 'План релиза 3.0');
    await page.getByRole('link', { name: 'Назад' }).click();

    const card = page.getByTestId('document-card').filter({ hasText: 'План релиза 3.0' }).last();
    await card.getByRole('button', { name: 'В избранное' }).click();
    await page.getByRole('radio', { name: 'Избранное' }).click();
    await expect(page.getByTestId('document-card').filter({ hasText: 'План релиза 3.0' })).toHaveCount(2); // recent + list
    await page.getByRole('radio', { name: 'Все' }).click();

    await card.getByRole('button', { name: 'Действия' }).click();
    await page.getByRole('menuitem', { name: 'Дублировать' }).click();
    await page.getByLabel('Поиск документов').fill('копия');
    await expect(page.getByText('План релиза 3.0 (копия)').last()).toBeVisible();

    const copy = page.getByTestId('document-card').filter({ hasText: '(копия)' }).last();
    await copy.getByRole('button', { name: 'Действия' }).click();
    await page.getByRole('menuitem', { name: 'Удалить' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить' }).click();
    await expect(page.getByText('Ничего не найдено')).toBeVisible();
  });
});
