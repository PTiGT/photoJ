import { Link } from 'react-router';
import { cn } from '@/lib/utils';

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5 font-semibold tracking-tight', className)} aria-label="QA Builder — на главную">
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-accent" />
        <path d="M9 10h9M9 16h14M9 22h7" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="22" cy="22" r="3" fill="#A5B4FC" />
      </svg>
      {!compact && (
        <span className="text-[15px]">
          QA <span className="text-muted">Builder</span>
        </span>
      )}
    </Link>
  );
}
