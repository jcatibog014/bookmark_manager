import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Only the top-most open modal reacts to Escape.
const openStack: symbol[] = [];

interface ModalProps {
  title?: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Pin the panel near the top (used by the command palette). */
  position?: 'center' | 'top';
  hideClose?: boolean;
}

const WIDTH = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

export default function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  position = 'center',
  hideClose,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const me = Symbol('modal');
    openStack.push(me);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openStack[openStack.length - 1] === me) {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openStack.splice(openStack.indexOf(me), 1);
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 z-50 flex justify-center overflow-y-auto p-4',
        position === 'top' ? 'items-start pt-[12vh]' : 'items-end sm:items-center',
      )}
    >
      <div className="fixed inset-0 animate-fade-in bg-zinc-950/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={clsx(
          'relative w-full animate-pop-in rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/10 outline-none dark:border-zinc-800 dark:bg-zinc-900',
          WIDTH[size],
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-5">
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
              {description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
            </div>
            {!hideClose && (
              <button className="icon-btn -mt-1.5 -mr-2 shrink-0" onClick={onClose} aria-label="Close">
                <X className="size-4" />
              </button>
            )}
          </div>
        )}
        {children}
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
