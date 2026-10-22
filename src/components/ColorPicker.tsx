import clsx from 'clsx';
import { Check } from 'lucide-react';
import { COLORS, DOT_CLASS, type ColorName } from '../lib/colors';

export default function ColorPicker({ value, onChange }: { value: ColorName; onChange: (color: ColorName) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Color">
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          title={color}
          onClick={() => onChange(color)}
          className={clsx(
            'flex size-7 items-center justify-center rounded-full text-white ring-offset-2 transition hover:scale-110 dark:ring-offset-zinc-900',
            DOT_CLASS[color],
            value === color && 'ring-2 ring-zinc-400',
          )}
        >
          {value === color && <Check className="size-3.5" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
