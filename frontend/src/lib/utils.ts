import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge about the custom shadow tokens from index.css.
const twMerge = extendTailwindMerge({ extend: { classGroups: { shadow: [{ shadow: ['soft', 'lift', 'pop'] }] } } });

/** Joins class names and resolves Tailwind conflicts (later classes win). */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const uid = () => crypto.randomUUID();

const dateTime = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const relative = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });

/** 30.09.2026 — date format used in QA spreadsheets. */
export const todayShort = () => new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());

export const formatShortDate = (value: string | Date) =>
  new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));

export const formatDateTime = (value: string | Date) => dateTime.format(new Date(value)).replace(',', '');

/** "только что", "5 минут назад", "вчера", or a short date for older values. */
export function formatRelative(value: string | Date, now = Date.now()) {
  const diff = (new Date(value).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return 'только что';
  if (abs < 3600) return relative.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 7) return relative.format(Math.round(diff / 86400), 'day');
  return shortDate.format(new Date(value));
}

export function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export function pluralize(count: number, [one, few, many]: [string, string, string]) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} ${few}`;
  return `${count} ${many}`;
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const modKey = isMac ? '⌘' : 'Ctrl';
