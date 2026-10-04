import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'wide';
  className?: string;
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-5xl h-[92vh]', wide: 'max-w-[min(1400px,96vw)]' };

/** Accessible dialog rendered in a portal; closes on Escape and backdrop click. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', className }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const focusable = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, button:not([data-close])');
      (focusable ?? panel.current)?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-2xl border border-line bg-surface shadow-pop outline-none sm:rounded-2xl',
          SIZES[size],
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id={titleId} className="text-[17px] font-semibold tracking-tight">
                  {title}
                </h2>
              )}
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <IconButton label="Закрыть" size="sm" onClick={onClose} data-close>
              <X />
            </IconButton>
          </div>
        )}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
