/* Idempotent seed: admin + demo user, system templates, demo documents. */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';
import { BLUEPRINTS } from '../src/domain/blueprints/index.js';
import { flattenBlueprint } from '../src/domain/blueprints/builder.js';
import { normalizeBlocks } from '../src/domain/blockTree.js';

const prisma = new PrismaClient();
// `--refresh-templates` overwrites blocks of existing system templates with the current blueprints.
const REFRESH_TEMPLATES = process.argv.includes('--refresh-templates');

async function upsertUser({ email, name, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data: { email, name, role, passwordHash: await hashPassword(password) } });
}

async function seedTemplates() {
  for (const blueprint of BLUEPRINTS) {
    const blocks = normalizeBlocks(flattenBlueprint(blueprint.blocks));
    const existing = await prisma.template.findFirst({
      where: { isSystem: true, docType: blueprint.docType, name: blueprint.name },
    });
    await prisma.$transaction(async (tx) => {
      const template = existing
        ? await tx.template.update({
            where: { id: existing.id },
            data: { description: blueprint.description, isDefault: Boolean(blueprint.isDefault) },
          })
        : await tx.template.create({
            data: {
              name: blueprint.name,
              description: blueprint.description,
              docType: blueprint.docType,
              isSystem: true,
              isDefault: Boolean(blueprint.isDefault),
            },
          });
      // Keep admin edits to existing system templates unless a refresh is requested.
      if (!existing || REFRESH_TEMPLATES) {
        await tx.templateBlock.deleteMany({ where: { templateId: template.id } });
        await tx.templateBlock.createMany({ data: blocks.map((b) => ({ ...b, templateId: template.id })) });
      }
    });
  }
  console.log(`✔ System templates: ${BLUEPRINTS.length}${REFRESH_TEMPLATES ? ' (blocks refreshed)' : ''}`);
}

async function createDocument(ownerId, { title, type, blocks }) {
  const normalized = normalizeBlocks(flattenBlueprint(blocks));
  const doc = await prisma.document.create({ data: { title, type, ownerId } });
  await prisma.documentBlock.createMany({ data: normalized.map((b) => ({ ...b, documentId: doc.id })) });
  await prisma.documentVersion.create({
    data: { documentId: doc.id, number: 1, title, snapshot: normalized, authorId: ownerId },
  });
  return doc;
}

async function seedDemoDocuments(user) {
  if (await prisma.document.count({ where: { ownerId: user.id } })) return;
  const { node } = await import('../src/domain/blueprints/builder.js');

  const bug = await createDocument(user.id, {
    title: 'Авторизация не работает после смены пароля',
    type: 'BUG_REPORT',
    blocks: [
      node('INPUT', { label: 'Title', value: 'Авторизация не работает после смены пароля' }),
      node('STATUS', { label: 'Статус', options: ['New', 'Open', 'In Progress', 'Fixed', 'Verified', 'Closed'], value: 'Open' }),
      node('TEXTAREA', { label: 'Description', value: 'После смены пароля в профиле вход с новым паролем возвращает ошибку 401.' }),
      node('ENVIRONMENT', { label: 'Environment', items: [{ key: 'OS', value: 'macOS 15' }, { key: 'Browser', value: 'Chrome 140' }, { key: 'Stand', value: 'staging' }] }),
      node('TEXTAREA', { label: 'Preconditions', value: 'Пользователь зарегистрирован и подтвердил email.' }),
      node('STEP_GROUP', { title: 'Steps to Reproduce' }, [
        node('STEP', { action: 'Открыть Профиль › Безопасность', expected: 'Открыта форма смены пароля' }),
        node('STEP', { action: 'Сменить пароль на новый', expected: 'Показано уведомление «Пароль изменён»' }),
        node('STEP', { action: 'Выйти и войти с новым паролем', expected: 'Пользователь авторизован' }),
      ]),
      node('TEXTAREA', { label: 'Actual Result', value: 'Ошибка «Неверный email или пароль», ответ API 401.' }),
      node('TEXTAREA', { label: 'Expected Result', value: 'Вход выполняется с новым паролем.' }),
      node('SEVERITY', { label: 'Severity', value: 'Critical' }),
      node('PRIORITY', { label: 'Priority', value: 'High' }),
      node('COMMENT', { author: 'QA', text: 'Воспроизводится стабильно, старый пароль тоже не подходит.' }),
    ],
  });

  const checklist = await createDocument(user.id, {
    title: 'Чек-лист: форма входа',
    type: 'CHECKLIST',
    blocks: [
      node('SECTION', { title: 'Позитивные сценарии' }, [
        node('CHECKBOX', { label: 'Вход с валидными данными', checked: true, status: 'passed' }),
        node('CHECKBOX', { label: 'Запомнить меня', status: 'passed', checked: true }),
      ]),
      node('SECTION', { title: 'Негативные сценарии' }, [
        node('CHECKBOX', { label: 'Неверный пароль', status: 'failed', comment: 'Текст ошибки не соответствует макету' }),
        node('CHECKBOX', { label: 'Пустые поля', status: 'none' }, [
          node('CHECKBOX', { label: 'Пустой email', status: 'none' }),
          node('CHECKBOX', { label: 'Пустой пароль', status: 'none' }),
        ]),
      ]),
    ],
  });

  // Cross-browser checklist with a few results — shows the spreadsheet layout and Excel export.
  const crossBrowser = BLUEPRINTS.find((bp) => bp.name === 'Кросс-браузерный: Регистрация');
  const sample = [
    ['passed', { 'run-2': { status: 'passed' }, 'run-3': { status: 'passed' } }],
    ['failed', { 'run-2': { status: 'passed' }, 'run-3': { status: 'failed', comment: 'Поиск не находит «USA»' } }, 'BUG-17'],
    ['passed', { 'run-2': { status: 'passed' }, 'run-3': { status: 'passed' } }],
    ['blocked'],
    ['passed'],
    ['skipped'],
  ];
  let index = 0;
  const withResults = (nodes) =>
    nodes.map((item) => {
      if (item.type !== 'CHECKBOX') return { ...item, children: withResults(item.children ?? []) };
      const [status, results, bugId] = sample[index++] ?? [];
      return status ? { ...item, content: { ...item.content, status, checked: status === 'passed', results: results ?? {}, ...(bugId ? { bugId } : {}) } } : item;
    });
  await createDocument(user.id, { title: 'Aliexpress — регистрация', type: 'CHECKLIST', blocks: withResults(crossBrowser.blocks) });

  await prisma.documentFavorite.create({ data: { userId: user.id, documentId: bug.id } });
  console.log(`✔ Demo documents: ${bug.title}, ${checklist.title}`);
}

async function main() {
  await upsertUser({
    email: process.env.ADMIN_EMAIL ?? 'admin@qabuilder.local',
    name: 'Администратор',
    password: process.env.ADMIN_PASSWORD ?? 'admin12345',
    role: 'ADMIN',
  });
  const demo = await upsertUser({ email: 'demo@qabuilder.local', name: 'Демо Тестировщик', password: 'demo12345', role: 'USER' });
  console.log('✔ Users: admin, demo');
  await seedTemplates();
  await seedDemoDocuments(demo);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
