import { forwardRef, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Textarea that grows with its content. */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }>(
  function AutoTextarea({ className, value, minRows = 1, ...props }, forwarded) {
    const inner = useRef<HTMLTextAreaElement | null>(null);

    useLayoutEffect(() => {
      const el = inner.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }, [value]);

    return (
      <textarea
        ref={(el) => {
          inner.current = el;
          if (typeof forwarded === 'function') forwarded(el);
          else if (forwarded) forwarded.current = el;
        }}
        rows={minRows}
        value={value}
        className={cn('resize-none overflow-hidden', className)}
        {...props}
      />
    );
  },
);
