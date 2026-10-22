import { useEffect, useRef } from 'react';

type Handler = (event: KeyboardEvent) => void;

/** True when the user is typing somewhere, so single-key shortcuts should stay quiet. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Global keyboard shortcuts. Keys look like "mod+k" (Ctrl on Windows/Linux, ⌘ on Mac),
 * "n", "/", or "?". Single-key shortcuts are ignored while typing or when a dialog is open.
 */
export function useHotkeys(bindings: Record<string, Handler>) {
  const ref = useRef(bindings);
  ref.current = bindings;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      for (const [combo, handler] of Object.entries(ref.current)) {
        const wantsMod = combo.startsWith('mod+');
        const comboKey = wantsMod ? combo.slice(4) : combo;
        if (comboKey !== key || wantsMod !== mod || event.altKey) continue;
        if (!wantsMod && (isTypingTarget(event.target) || document.querySelector('[aria-modal="true"]'))) continue;
        event.preventDefault();
        handler(event);
        return;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
