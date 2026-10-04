import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export type MenuEntry = MenuItem | 'separator';

interface MenuProps {
  items: MenuEntry[];
  /** Anchor point in viewport coordinates */
  position: { x: number; y: number } | null;
  onClose: () => void;
  align?: 'start' | 'end';
}

/** Floating menu used both for dropdowns and right-click context menus. */
export function Menu({ items, position, onClose, align = 'start' }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState(position);

  useLayoutEffect(() => {
    if (!position || !ref.current) return setCoords(position);
    const rect = ref.current.getBoundingClientRect();
    let x = align === 'end' ? position.x - rect.width : position.x;
    let y = position.y;
    x = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    if (y + rect.height > window.innerHeight - 8) y = Math.max(8, position.y - rect.height);
    setCoords({ x, y });
  }, [position, align]);

  useEffect(() => {
    if (!position) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
        buttons[(next + buttons.length) % buttons.length]?.focus();
      }
    };
    const close = () => onClose();
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [position, onClose]);

  if (!position) return null;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ left: coords?.x ?? position.x, top: coords?.y ?? position.y }}
      className="fixed z-[60] min-w-52 animate-slide-up rounded-xl border border-line bg-surface p-1 shadow-pop"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, index) =>
        item === 'separator' ? (
          <div key={`sep-${index}`} className="my-1 h-px bg-line" />
        ) : (
          <button
            key={item.label}
            role="menuitem"
            type="button"
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] outline-none transition-colors disabled:opacity-40 [&_svg]:size-4',
              item.danger
                ? 'text-danger hover:bg-danger-soft focus:bg-danger-soft'
                : 'text-fg-soft hover:bg-surface-3 hover:text-fg focus:bg-surface-3 focus:text-fg',
            )}
          >
            <span className="flex w-4 justify-center text-muted">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <kbd className="font-sans text-[11px] text-subtle">{item.shortcut}</kbd>}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}

/** Helper hook: open a menu anchored under a trigger element or at the cursor. */
export function useMenu() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  return {
    position,
    close: () => setPosition(null),
    openAt: (x: number, y: number) => setPosition({ x, y }),
    openBelow: (element: HTMLElement, align: 'start' | 'end' = 'end') => {
      const rect = element.getBoundingClientRect();
      setPosition({ x: align === 'end' ? rect.right : rect.left, y: rect.bottom + 6 });
    },
  };
}
