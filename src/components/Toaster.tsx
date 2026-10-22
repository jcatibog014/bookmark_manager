import clsx from 'clsx';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useUI } from '../context/ui';

const ICON = { success: CircleCheck, error: CircleAlert, info: Info };
const ICON_CLASS = { success: 'text-emerald-400', error: 'text-red-400', info: 'text-sky-400' };

export default function Toaster() {
  const { toasts, dismissToast } = useUI();

  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => {
        const Icon = ICON[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-center gap-3 rounded-2xl bg-zinc-900 py-2.5 pr-2 pl-4 text-sm text-zinc-100 shadow-xl ring-1 ring-white/10 dark:bg-zinc-800"
          >
            <Icon className={clsx('size-4 shrink-0', ICON_CLASS[toast.tone])} />
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.action && (
              <button
                className="rounded-lg px-2.5 py-1 text-sm font-semibold text-indigo-300 hover:bg-white/10"
                onClick={() => {
                  toast.action!.onClick();
                  dismissToast(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
