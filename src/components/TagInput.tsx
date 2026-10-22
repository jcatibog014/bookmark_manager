import clsx from 'clsx';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { normalizeTagName } from '../db/repo';
import { colorForName } from '../lib/colors';
import type { TagWithCount } from '../lib/library';
import TagChip from './TagChip';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: TagWithCount[];
  id?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

/** Chip-style tag editor: type and press Enter or comma; suggestions appear while typing (or press ↓). */
export default function TagInput({ value, onChange, suggestions, id, placeholder, autoFocus }: TagInputProps) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const colorOf = useMemo(() => {
    const map = new Map(suggestions.map((t) => [t.name, t.color]));
    return (name: string) => map.get(name) ?? colorForName(name);
  }, [suggestions]);

  const query = normalizeTagName(text);
  const matches = useMemo(() => {
    const taken = new Set(value);
    return suggestions
      .filter((t) => !taken.has(t.name) && (!query || t.name.includes(query)))
      .sort((a, b) => Number(b.name.startsWith(query)) - Number(a.name.startsWith(query)) || b.count - a.count)
      .slice(0, 6);
  }, [suggestions, value, query]);

  const add = (raw: string) => {
    const name = normalizeTagName(raw);
    if (name && !value.includes(name)) onChange([...value, name]);
    setText('');
    setHighlight(-1);
    setOpen(false); // reopens on typing or ↓, so it doesn't cover the form
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const showing = open && matches.length > 0;
    if (event.key === 'ArrowDown' && !showing && matches.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlight(0);
    } else if (event.key === 'ArrowDown' && showing) {
      event.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (event.key === 'ArrowUp' && showing) {
      event.preventDefault();
      setHighlight((h) => (h <= 0 ? matches.length - 1 : h - 1));
    } else if (event.key === 'Enter' || (event.key === 'Tab' && text.trim())) {
      // A highlighted suggestion wins; otherwise add exactly what was typed.
      const picked = showing && highlight >= 0 ? matches[highlight].name : text;
      if (!picked.trim()) return; // nothing to add: let Enter submit the form
      event.preventDefault();
      add(picked);
    } else if (event.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <div
        className="input flex min-h-10 flex-wrap items-center gap-1.5 py-1.5"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((name) => (
          <TagChip
            key={name}
            name={name}
            color={colorOf(name)}
            size="md"
            onRemove={() => onChange(value.filter((t) => t !== name))}
          />
        ))}
        <input
          ref={inputRef}
          id={id}
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => {
            if (e.target.value.endsWith(',')) return add(e.target.value.slice(0, -1));
            setText(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setOpen(false);
            if (text.trim()) add(text);
          }}
          placeholder={value.length ? '' : (placeholder ?? 'Add tags…')}
          className="min-w-24 flex-1 bg-transparent py-0.5 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-autocomplete="list"
        />
      </div>

      {open && matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1.5 w-full animate-fade-in overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          {matches.map((tag, i) => (
            <li key={tag.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus in the input
                  add(tag.name);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={clsx(
                  'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm',
                  i === highlight && 'bg-zinc-100 dark:bg-zinc-800',
                )}
              >
                <TagChip name={tag.name} color={tag.color} />
                <span className="text-xs text-zinc-400 tabular-nums">{tag.count}</span>
              </button>
            </li>
          ))}
          {query && !matches.some((m) => m.name === query) && (
            <li className="px-2.5 py-1.5 text-xs text-zinc-400">
              Press <kbd className="kbd">Enter</kbd> to create “{query}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
