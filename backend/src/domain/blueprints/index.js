import { node, severity, priority, environment, steps, check, checkWith, section, textarea, runInfo } from './builder.js';
import { ALIEXPRESS_REGISTRATION } from './aliexpress.js';

/*
 * Blueprints are the initial block sets for every document type.
 * They are seeded as system templates; the one marked `isDefault`
 * is used when a document is created "by type" without choosing a template.
 */

const bugReport = ({ envItems, extra = [], stepsHint = '' }) => [
  node('INPUT', { label: 'Title', value: '', placeholder: 'Кратко: что, где, когда' }),
  node('STATUS', { label: 'Статус', options: ['New', 'Open', 'In Progress', 'Fixed', 'Verified', 'Closed', 'Reopened'], value: 'New' }),
  textarea('Description', 'Подробное описание дефекта'),
  environment(envItems),
  textarea('Preconditions', 'Что должно быть выполнено до воспроизведения'),
  steps(stepsHint || 'Steps to Reproduce'),
  textarea('Actual Result', 'Что происходит на самом деле'),
  textarea('Expected Result', 'Что должно происходить'),
  ...extra,
  severity(),
  priority(),
  node('ATTACHMENT', { label: 'Attachments', files: [] }),
  node('COMMENT', { author: '', text: '' }),
];

const testCase = ({ envItems, dataHint = '', extra = [] }) => [
  node('INPUT', { label: 'Title', value: '', placeholder: 'Что проверяет тест-кейс' }),
  textarea('Preconditions'),
  textarea('Test Data', dataHint),
  steps('Steps'),
  ...extra,
  textarea('Postconditions'),
  priority(),
  severity(),
  environment(envItems),
];

const checklist = (groups) => [
  runInfo(),
  ...groups.map(([name, items]) => section(name, items.map((label) => check(label)))),
];

const WEB_ENV = [['OS', 'macOS 15'], ['Browser', 'Chrome 140'], ['Build', ''], ['Stand', 'staging']];
const MOBILE_ENV = [['Device', 'iPhone 16'], ['OS', 'iOS 26'], ['App version', ''], ['Network', 'Wi‑Fi']];
const API_ENV = [['Base URL', 'https://api.staging.example.com'], ['API version', 'v1'], ['Client', 'Postman'], ['Stand', 'staging']];

export const BLUEPRINTS = [
  // ── Bug Report ────────────────────────────────────────────────
  {
    docType: 'BUG_REPORT',
    name: 'Bug Report',
    description: 'Стандартный шаблон баг-репорта',
    isDefault: true,
    blocks: bugReport({ envItems: [['OS', ''], ['Browser / Device', ''], ['Build', ''], ['Stand', '']] }),
  },
  {
    docType: 'BUG_REPORT',
    name: 'Web Bug',
    description: 'Дефект веб-приложения: браузер, стенд, консоль',
    blocks: bugReport({
      envItems: WEB_ENV,
      extra: [node('TEXTAREA', { label: 'Console / Network log', value: '', placeholder: 'Ошибки из DevTools' })],
    }),
  },
  {
    docType: 'BUG_REPORT',
    name: 'Mobile Bug',
    description: 'Дефект мобильного приложения: устройство, ОС, сеть',
    blocks: bugReport({
      envItems: MOBILE_ENV,
      extra: [node('SELECT', { label: 'Воспроизводимость', options: ['Всегда', 'Иногда', 'Редко', 'Один раз'], value: 'Всегда' })],
    }),
  },
  {
    docType: 'BUG_REPORT',
    name: 'API Bug',
    description: 'Дефект API: запрос, ответ, коды статусов',
    blocks: bugReport({
      envItems: API_ENV,
      stepsHint: 'Request sequence',
      extra: [
        node('TEXTAREA', { label: 'Request', value: '', placeholder: 'curl / метод, URL, headers, body' }),
        node('TEXTAREA', { label: 'Response', value: '', placeholder: 'Status code, body' }),
      ],
    }),
  },

  // ── Checklist ────────────────────────────────────────────────
  {
    docType: 'CHECKLIST',
    name: 'Чек-лист',
    description: 'Пустой чек-лист с двумя разделами',
    isDefault: true,
    blocks: checklist([
      ['Раздел', ['Проверка 1', 'Проверка 2', 'Проверка 3']],
      ['Раздел', ['Проверка 1', 'Проверка 2']],
    ]),
  },
  {
    docType: 'CHECKLIST',
    name: 'Авторизация',
    description: 'Типовые проверки формы входа',
    blocks: checklist([
      ['Позитивные сценарии', ['Вход с валидными email и паролем', 'Вход через «Запомнить меня»', 'Выход из аккаунта']],
      ['Негативные сценарии', ['Неверный пароль', 'Несуществующий email', 'Пустые поля', 'Блокировка после 5 неудачных попыток']],
      ['Безопасность', ['Пароль скрыт при вводе', 'Сессия истекает по таймауту', 'Нет раскрытия существования аккаунта']],
    ]),
  },
  {
    docType: 'CHECKLIST',
    name: 'Регистрация',
    description: 'Проверки формы регистрации',
    blocks: checklist([
      ['Валидация полей', ['Email в неверном формате', 'Пароль короче минимума', 'Пароли не совпадают', 'Обязательные поля пустые']],
      ['Основной сценарий', ['Регистрация с валидными данными', 'Письмо подтверждения отправлено', 'Повторная регистрация на тот же email']],
    ]),
  },
  {
    docType: 'CHECKLIST',
    name: 'UI',
    description: 'Визуальные и UX-проверки интерфейса',
    blocks: checklist([
      ['Вёрстка', ['Соответствие макету', 'Адаптивность: mobile / tablet / desktop', 'Нет горизонтального скролла']],
      ['Элементы', ['Состояния hover / focus / disabled', 'Тексты без опечаток', 'Иконки и изображения загружаются']],
      ['Доступность', ['Навигация с клавиатуры', 'Контраст текста', 'Alt-тексты у изображений']],
    ]),
  },
  {
    docType: 'CHECKLIST',
    name: 'API',
    description: 'Проверки REST API',
    blocks: checklist([
      ['Контракт', ['Коды ответов соответствуют документации', 'Схема ответа валидна', 'Content-Type корректен']],
      ['Авторизация', ['Запрос без токена → 401', 'Чужой ресурс → 403/404', 'Истёкший токен → 401']],
      ['Валидация', ['Обязательные поля', 'Граничные значения', 'Неверные типы данных → 400']],
    ]),
  },

  // ── Test Case ────────────────────────────────────────────────
  {
    docType: 'TEST_CASE',
    name: 'Test Case',
    description: 'Стандартный тест-кейс',
    isDefault: true,
    blocks: testCase({ envItems: [['OS', ''], ['Browser / Device', ''], ['Build', '']] }),
  },
  {
    docType: 'TEST_CASE',
    name: 'Web Test Case',
    description: 'Тест-кейс для веб-приложения',
    blocks: testCase({ envItems: WEB_ENV, dataHint: 'Логины, пароли, тестовые записи' }),
  },
  {
    docType: 'TEST_CASE',
    name: 'API Test Case',
    description: 'Тест-кейс для API с эндпоинтом и примером запроса',
    blocks: testCase({
      envItems: API_ENV,
      dataHint: 'Тело запроса, токены',
      extra: [
        node('INPUT', { label: 'Endpoint', value: '', placeholder: 'POST /api/v1/…' }),
        node('TEXTAREA', { label: 'Expected response', value: '', placeholder: '200 OK, { … }' }),
      ],
    }),
  },
  {
    docType: 'TEST_CASE',
    name: 'Mobile Test Case',
    description: 'Тест-кейс для мобильного приложения',
    blocks: testCase({ envItems: MOBILE_ENV, dataHint: 'Тестовый аккаунт, данные' }),
  },

  // ── Test List ────────────────────────────────────────────────
  {
    docType: 'TEST_LIST',
    name: 'Тест-лист',
    description: 'Иерархический список проверок',
    isDefault: true,
    blocks: [
      runInfo(),
      section('Авторизация', [
        section('Регистрация', [check('Валидные данные'), check('Невалидный email'), check('Пустые поля')]),
        section('Авторизация', [check('Валидный логин'), check('Неверный пароль'), check('Заблокированный пользователь')]),
        section('Восстановление пароля', []),
      ]),
    ],
  },

  {
    docType: 'CHECKLIST',
    name: 'Кросс-браузерный: Регистрация',
    description: 'Module › Submodule › Element, статусы для Chrome, Safari, Firefox, Opera, Edge',
    blocks: [
      runInfo(
        [
          { environment: 'Windows 11 · Google Chrome', build: '1.0' },
          { environment: 'Safari', build: '1.0' },
          { environment: 'Firefox', build: '1.0' },
          { environment: 'Opera', build: '1.0' },
          { environment: 'Edge', build: '1.0' },
        ],
        'Aliexpress',
      ),
      ...ALIEXPRESS_REGISTRATION,
    ],
  },
  {
    docType: 'TEST_LIST',
    name: 'Регрессионный прогон (Smoke / MAT)',
    description: 'Тип теста и требование у каждой проверки, два прогона на разных сборках',
    blocks: [
      runInfo([
        { environment: 'Desktop · Chrome', testType: 'Smoke' },
        { environment: 'Desktop · Firefox', testType: 'MAT' },
      ]),
      section('Авторизация', [
        section('Вход', [
          checkWith('Вход с валидными email и паролем', { testType: 'Smoke', requirement: 'AUTH-101' }),
          checkWith('Сообщение об ошибке при неверном пароле', { testType: 'MAT', requirement: 'AUTH-101' }),
          checkWith('Блокировка после 5 неудачных попыток', { testType: 'MAT', requirement: 'AUTH-104' }),
        ]),
        section('Восстановление пароля', [
          checkWith('Письмо со ссылкой приходит на email', { testType: 'Smoke', requirement: 'AUTH-110' }),
          checkWith('Ссылка восстановления одноразовая', { testType: 'MAT', requirement: 'AUTH-112' }),
        ]),
      ]),
      section('Профиль', [
        section('Данные пользователя', [
          checkWith('Изменение имени сохраняется', { testType: 'Smoke', requirement: 'PROF-201' }),
          checkWith('Валидация email при изменении', { testType: 'MAT', requirement: 'PROF-202' }),
        ]),
      ]),
    ],
  },

  // ── Test Plan ────────────────────────────────────────────────
  {
    docType: 'TEST_PLAN',
    name: 'Тест-план',
    description: 'Полный тест-план с предустановленными разделами',
    isDefault: true,
    blocks: [
      textarea('Цель тестирования', 'Зачем проводится тестирование и какой результат ожидается'),
      section('Область тестирования', [
        textarea('Объект тестирования', 'Продукт, версия, модули'),
        textarea('Функциональность', 'Что входит в тестирование'),
        textarea('Не входит в тестирование', 'Что осознанно исключено'),
      ]),
      textarea('Стратегия тестирования', 'Подход, уровни, приоритеты'),
      section('Виды тестирования', [
        check('Функциональное'),
        check('Регрессионное'),
        check('UI / UX'),
        check('API'),
        check('Производительность'),
        check('Безопасность'),
      ]),
      environment([['Стенд', ''], ['Браузеры / устройства', ''], ['Сборка', '']]),
      textarea('Тестовые данные'),
      node('TABLE', {
        label: 'Риски',
        columns: ['Риск', 'Вероятность', 'Меры'],
        rows: [['', '', '']],
      }),
      textarea('Критерии начала тестирования'),
      textarea('Критерии завершения тестирования'),
      node('TABLE', { label: 'Команда', columns: ['Роль', 'Участник', 'Зона ответственности'], rows: [['QA Lead', '', '']] }),
      node('TABLE', { label: 'Сроки', columns: ['Этап', 'Начало', 'Окончание'], rows: [['Подготовка', '', ''], ['Тестирование', '', '']] }),
      textarea('Дополнительная информация'),
    ],
  },
];

/** Documents created "from scratch" start with an empty canvas. */
export function blankBlueprint() {
  return [];
}
