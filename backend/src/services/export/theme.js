/** Colour system shared by PDF and DOCX exports (kept in sync with the web preview). */
export const THEME = {
  ink: '#0F172A',
  body: '#1E293B',
  muted: '#64748B',
  border: '#E2E8F0',
  surface: '#F8FAFC',
  accent: '#4F46E5',
  accentSoft: '#EEF2FF',
  commentBg: '#F5F7FF',
  check: {
    none: { bg: '#F1F5F9', fg: '#475569' },
    passed: { bg: '#DCFCE7', fg: '#15803D' },
    failed: { bg: '#FEE2E2', fg: '#B91C1C' },
    blocked: { bg: '#FEF3C7', fg: '#B45309' },
    skipped: { bg: '#F1F5F9', fg: '#64748B' },
  },
};

export const SEVERITY_TONES = {
  Blocker: { bg: '#FEE2E2', fg: '#991B1B' },
  Critical: { bg: '#FFE4E6', fg: '#BE123C' },
  Major: { bg: '#FFEDD5', fg: '#C2410C' },
  Minor: { bg: '#FEF9C3', fg: '#A16207' },
  Trivial: { bg: '#F1F5F9', fg: '#475569' },
};

export const PRIORITY_TONES = {
  Highest: { bg: '#FEE2E2', fg: '#991B1B' },
  High: { bg: '#FFEDD5', fg: '#C2410C' },
  Medium: { bg: '#E0E7FF', fg: '#4338CA' },
  Low: { bg: '#DBEAFE', fg: '#1D4ED8' },
  Lowest: { bg: '#F1F5F9', fg: '#475569' },
};

export const STATUS_TONE = { bg: '#EEF2FF', fg: '#4338CA' };
