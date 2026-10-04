import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface PopoverProps {
  anchor: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label?: string;
}

/** Small floating panel anchored under an element; closes on outside click / Escape. */
export function Popover({ anchor, onClose, children, className, label }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const a = anchor.getBoundingClientRect();
    const p = ref.current.getBoundingClientRect();
    const x = Math.max(8, Math.min(a.left, window.innerWidth - p.width - 8));
    const below = a.bottom + 6;
    const y = below + p.height > window.innerHeight - 8 ? Math.max(8, a.top - p.height - 6) : below;
    setPosition({ x, y });
  }, [anchor]);

  useEffect(() => {
    if (!anchor) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !anchor.contains(target)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [anchor, onClose]);

  if (!anchor) return null;
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      style={{ left: position?.x ?? -9999, top: position?.y ?? -9999 }}
      className={cn('fixed z-[60] animate-slide-up rounded-xl border border-line bg-surface p-3 shadow-pop', className)}
    >
      {children}
    </div>,
    document.body,
  );
}
