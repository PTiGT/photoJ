import type { CheckStatus, Priority, Severity } from '@/types';

export const SEVERITIES: Severity[] = ['Blocker', 'Critical', 'Major', 'Minor', 'Trivial'];
export const PRIORITIES: Priority[] = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

/** Badge classes per value — shared by editor pickers and preview. */
export const SEVERITY_TONE: Record<Severity, string> = {
  Blocker: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  Critical: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  Major: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  Minor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300',
  Trivial: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
};

export const PRIORITY_TONE: Record<Priority, string> = {
  Highest: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  Medium: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  Low: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  Lowest: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
};

export const CHECK_STATUSES: { value: CheckStatus; label: string; tone: string; dot: string }[] = [
  { value: 'none', label: 'Не проверено', tone: 'bg-surface-3 text-muted', dot: 'bg-subtle' },
  { value: 'passed', label: 'Passed', tone: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300', dot: 'bg-green-500' },
  { value: 'failed', label: 'Failed', tone: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300', dot: 'bg-red-500' },
  { value: 'blocked', label: 'Blocked', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  { value: 'skipped', label: 'Skipped', tone: 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400', dot: 'bg-slate-400' },
];

export const CHECK_STATUS_META = Object.fromEntries(CHECK_STATUSES.map((s) => [s.value, s])) as Record<
  CheckStatus,
  (typeof CHECK_STATUSES)[number]
>;

export const DEFAULT_STATUS_OPTIONS = ['New', 'Open', 'In Progress', 'Fixed', 'Verified', 'Closed', 'Reopened'];
