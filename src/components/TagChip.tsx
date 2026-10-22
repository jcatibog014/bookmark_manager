import clsx from 'clsx';
import { X } from 'lucide-react';
import { CHIP_CLASS, type ColorName } from '../lib/colors';

interface TagChipProps {
  name: string;
  color: ColorName;
  onClick?: () => void;
  onRemove?: () => void;
  active?: boolean;
  size?: 'sm' | 'md';
}

export default function TagChip({ name, color, onClick, onRemove, active, size = 'sm' }: TagChipProps) {
  const classes = clsx(
    'inline-flex max-w-full items-center gap-1 rounded-full font-medium whitespace-nowrap transition',
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
    CHIP_CLASS[color],
    active && 'ring-2 ring-current/40',
    onClick && 'hover:brightness-95 dark:hover:brightness-125',
  );
  const label = <span className="truncate">#{name}</span>;

  if (onRemove) {
    return (
      <span className={classes}>
        {label}
        <button
          type="button"
          onClick={onRemove}
          className="-mr-1 rounded-full p-0.5 opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          aria-label={`Remove tag ${name}`}
        >
          <X className="size-3" />
        </button>
      </span>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        title={`Filter by #${name}`}
      >
        {label}
      </button>
    );
  }
  return <span className={classes}>{label}</span>;
}
