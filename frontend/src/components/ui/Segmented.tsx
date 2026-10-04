import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  size?: 'sm' | 'md';
  className?: string;
}

export function Segmented<T extends string>({ value, onChange, options, size = 'md', className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" className={cn('inline-flex rounded-lg bg-surface-3 p-0.5', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all [&_svg]:size-4',
            size === 'sm' ? 'h-6 px-2 text-xs' : 'h-8 px-3 text-[13px]',
            value === option.value ? 'bg-surface text-fg shadow-soft' : 'text-muted hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
