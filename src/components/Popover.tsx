import clsx from 'clsx';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface PopoverProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: 'left' | 'right';
  /** Open upward, e.g. from a bar pinned to the bottom of the screen. */
  side?: 'bottom' | 'top';
  className?: string;
}

/** A small dropdown panel that closes on outside click or Escape. */
export default function Popover({ trigger, children, align = 'left', side = 'bottom', className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={clsx(
            'absolute z-20 animate-pop-in rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-900',
            align === 'right' ? 'right-0' : 'left-0',
            side === 'top' ? 'bottom-full mb-2' : 'mt-2',
            className,
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}
