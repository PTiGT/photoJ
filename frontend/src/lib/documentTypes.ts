import { Bug, ClipboardList, FlaskConical, ListChecks, ListTree, type LucideIcon } from 'lucide-react';
import type { DocumentType } from '@/types';

export interface DocumentTypeMeta {
  type: DocumentType;
  label: string;
  emoji: string;
  icon: LucideIcon;
  description: string;
  /** Tailwind classes for the colored icon tile */
  tone: string;
}

export const DOCUMENT_TYPES: DocumentTypeMeta[] = [
  {
    type: 'BUG_REPORT',
    label: 'Bug Report',
    emoji: '🐞',
    icon: Bug,
    description: 'Описание дефекта: шаги, ожидаемый и фактический результат',
    tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  },
  {
    type: 'CHECKLIST',
    label: 'Чек-лист',
    emoji: '☑️',
    icon: ListChecks,
    description: 'Список проверок по разделам со статусами',
    tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  {
    type: 'TEST_CASE',
    label: 'Тест-кейс',
    emoji: '🧪',
    icon: FlaskConical,
    description: 'Шаги, ожидаемые результаты, пред- и постусловия',
    tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  },
  {
    type: 'TEST_LIST',
    label: 'Тест-лист',
    emoji: '📋',
    icon: ListTree,
    description: 'Иерархия разделов, подразделов и проверок',
    tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  },
  {
    type: 'TEST_PLAN',
    label: 'Тест-план',
    emoji: '📝',
    icon: ClipboardList,
    description: 'Цели, область, стратегия, риски и сроки тестирования',
    tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  },
];

export const DOCUMENT_TYPE_META = Object.fromEntries(DOCUMENT_TYPES.map((m) => [m.type, m])) as Record<
  DocumentType,
  DocumentTypeMeta
>;
