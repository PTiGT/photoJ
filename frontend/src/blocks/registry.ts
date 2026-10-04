import {
  AlignLeft,
  CircleDot,
  Gauge,
  Heading,
  Image,
  Layers,
  ListOrdered,
  MessageSquare,
  Monitor,
  Paperclip,
  SignalHigh,
  SquareCheck,
  SquareChevronDown,
  Table2,
  TextCursorInput,
  Type,
  Footprints,
  Tag,
  MonitorCheck,
  type LucideIcon,
} from 'lucide-react';
import type { Block, BlockContentMap, BlockType } from '@/types';
import { DEFAULT_STATUS_OPTIONS } from '@/lib/qaValues';
import { todayShort, uid } from '@/lib/utils';

export type BlockCategory = 'Текст' | 'Поля' | 'Структура' | 'QA' | 'Медиа';

export interface BlockDefinition<T extends BlockType = BlockType> {
  type: T;
  label: string;
  hint: string;
  icon: LucideIcon;
  category: BlockCategory;
  createContent: () => BlockContentMap[T];
  /** Rendered as a slim row inside containers instead of a full card */
  compact?: boolean;
  /** Has a settings panel (labels, options, columns…) */
  configurable?: boolean;
  /** Content key edited inline in the card header (field label / group title) */
  labelKey?: 'label' | 'title';
}

type Registry = { [K in BlockType]: BlockDefinition<K> };

export const BLOCKS: Registry = {
  HEADING: { type: 'HEADING', label: 'Заголовок', hint: 'Заголовок раздела H1–H3', icon: Heading, category: 'Текст', createContent: () => ({ text: '', level: 2 }) },
  TEXT: { type: 'TEXT', label: 'Текст', hint: 'Абзац произвольного текста', icon: Type, category: 'Текст', createContent: () => ({ text: '' }) },
  INPUT: { type: 'INPUT', labelKey: 'label', label: 'Поле', hint: 'Однострочное поле с подписью', icon: TextCursorInput, category: 'Поля', configurable: true, createContent: () => ({ label: 'Новое поле', value: '', placeholder: '' }) },
  TEXTAREA: { type: 'TEXTAREA', labelKey: 'label', label: 'Многострочное поле', hint: 'Описание, результат, условия', icon: AlignLeft, category: 'Поля', configurable: true, createContent: () => ({ label: 'Описание', value: '', placeholder: '' }) },
  SELECT: { type: 'SELECT', labelKey: 'label', label: 'Select', hint: 'Выбор одного значения из списка', icon: SquareChevronDown, category: 'Поля', configurable: true, createContent: () => ({ label: 'Выбор', options: ['Вариант 1', 'Вариант 2'], value: '' }) },
  CHECKBOX: { type: 'CHECKBOX', label: 'Checkbox', hint: 'Пункт проверки со статусом', icon: SquareCheck, category: 'Поля', compact: true, createContent: () => ({ label: '', checked: false, status: 'none', comment: '' }) },
  RADIO: { type: 'RADIO', labelKey: 'label', label: 'Radio', hint: 'Один вариант из нескольких', icon: CircleDot, category: 'Поля', configurable: true, createContent: () => ({ label: 'Вариант', options: ['Да', 'Нет'], value: '' }) },
  STEP: { type: 'STEP', label: 'Шаг', hint: 'Действие и ожидаемый результат', icon: Footprints, category: 'Структура', compact: true, createContent: () => ({ action: '', expected: '' }) },
  STEP_GROUP: { type: 'STEP_GROUP', labelKey: 'title', label: 'Группа шагов', hint: 'Таблица пронумерованных шагов', icon: ListOrdered, category: 'Структура', createContent: () => ({ title: 'Шаги' }) },
  SECTION: { type: 'SECTION', label: 'Раздел', hint: 'Группа блоков, можно вкладывать', icon: Layers, category: 'Структура', createContent: () => ({ title: '', description: '' }) },
  TABLE: { type: 'TABLE', labelKey: 'label', label: 'Таблица', hint: 'Произвольная таблица', icon: Table2, category: 'Структура', configurable: true, createContent: () => ({ label: 'Таблица', columns: ['Колонка 1', 'Колонка 2'], rows: [['', '']] }) },
  SEVERITY: { type: 'SEVERITY', labelKey: 'label', label: 'Severity', hint: 'Серьёзность дефекта', icon: Gauge, category: 'QA', createContent: () => ({ label: 'Severity', value: '' }) },
  PRIORITY: { type: 'PRIORITY', labelKey: 'label', label: 'Priority', hint: 'Приоритет исправления', icon: SignalHigh, category: 'QA', createContent: () => ({ label: 'Priority', value: '' }) },
  ENVIRONMENT: { type: 'ENVIRONMENT', labelKey: 'label', label: 'Environment', hint: 'ОС, браузер, сборка, стенд', icon: Monitor, category: 'QA', configurable: true, createContent: () => ({ label: 'Environment', items: [{ key: 'OS', value: '' }, { key: 'Browser', value: '' }, { key: 'Build', value: '' }] }) },
  STATUS: { type: 'STATUS', labelKey: 'label', label: 'Статус', hint: 'Статус документа или дефекта', icon: Tag, category: 'QA', configurable: true, createContent: () => ({ label: 'Статус', options: [...DEFAULT_STATUS_OPTIONS], value: 'New' }) },
  RUN_INFO: {
    type: 'RUN_INFO',
    label: 'Прогоны и окружения',
    hint: 'Project, Build, Tester и колонки статусов',
    icon: MonitorCheck,
    category: 'QA',
    createContent: () => ({ project: '', tester: '', runs: [{ id: uid(), environment: '', date: todayShort(), build: '', testType: '' }] }),
  },
  COMMENT: { type: 'COMMENT', label: 'Комментарий', hint: 'Заметка или комментарий', icon: MessageSquare, category: 'QA', createContent: () => ({ author: '', text: '' }) },
  IMAGE: { type: 'IMAGE', labelKey: 'label', label: 'Изображение', hint: 'Скриншот с подписью', icon: Image, category: 'Медиа', createContent: () => ({ label: '', src: '', caption: '' }) },
  ATTACHMENT: { type: 'ATTACHMENT', labelKey: 'label', label: 'Вложение', hint: 'Файлы: логи, видео, дампы', icon: Paperclip, category: 'Медиа', createContent: () => ({ label: 'Вложения', files: [] }) },
};

export const BLOCK_CATEGORIES: BlockCategory[] = ['Текст', 'Поля', 'Структура', 'QA', 'Медиа'];

/** Palette order follows the spec's component list. */
export const PALETTE_ORDER: BlockType[] = [
  'HEADING', 'TEXT', 'INPUT', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'RADIO',
  'STEP', 'STEP_GROUP', 'SECTION', 'TABLE', 'IMAGE', 'ATTACHMENT',
  'RUN_INFO', 'SEVERITY', 'PRIORITY', 'ENVIRONMENT', 'STATUS', 'COMMENT',
];

export function blockDefinition<T extends BlockType>(type: T): BlockDefinition<T> {
  return BLOCKS[type] as unknown as BlockDefinition<T>;
}

/** Creates a fresh block of the given type (parent/order are set by insert). */
export function createBlock<T extends BlockType>(type: T, content?: Partial<BlockContentMap[T]>): Block {
  return {
    id: uid(),
    type,
    parentId: null,
    order: 0,
    content: { ...blockDefinition(type).createContent(), ...content },
    settings: {},
  } as Block;
}

/** Short human summary of a block for menus, collapsed views and aria labels. */
export function blockSummary(block: Block): string {
  switch (block.type) {
    case 'HEADING':
    case 'TEXT':
      return block.content.text ?? '';
    case 'SECTION':
    case 'STEP_GROUP':
      return block.content.title ?? '';
    case 'STEP':
      return block.content.action ?? '';
    case 'COMMENT':
      return block.content.text ?? '';
    case 'RUN_INFO':
      return block.content.project ?? '';
    default:
      return block.content.label ?? '';
  }
}
