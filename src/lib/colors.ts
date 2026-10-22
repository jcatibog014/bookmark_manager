// Color palette for tags and collections. Class names are written out in full
// so Tailwind can find them at build time.

export const COLORS = ['slate', 'red', 'orange', 'amber', 'emerald', 'teal', 'sky', 'indigo', 'violet', 'pink'] as const;
export type ColorName = (typeof COLORS)[number];

export const CHIP_CLASS: Record<ColorName, string> = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  amber: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  teal: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  pink: 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
};

export const DOT_CLASS: Record<ColorName, string> = {
  slate: 'bg-slate-400',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  sky: 'bg-sky-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
};

export const TEXT_CLASS: Record<ColorName, string> = {
  slate: 'text-slate-500',
  red: 'text-red-500',
  orange: 'text-orange-500',
  amber: 'text-amber-500',
  emerald: 'text-emerald-500',
  teal: 'text-teal-500',
  sky: 'text-sky-500',
  indigo: 'text-indigo-500',
  violet: 'text-violet-500',
  pink: 'text-pink-500',
};

/** Hex values (Tailwind 500 shades) for inline styles such as gradients. */
export const HEX: Record<ColorName, string> = {
  slate: '#64748b',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  emerald: '#10b981',
  teal: '#14b8a6',
  sky: '#0ea5e9',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  pink: '#ec4899',
};

const GRADIENT_FALLBACK: ColorName[] = ['indigo', 'violet', 'pink', 'amber'];

/** Three distinct colors for a gradient: the given ones first, topped up from a default palette. */
export function gradientColors(colors: ColorName[]): [string, string, string] {
  const picked = [...new Set([...colors, ...GRADIENT_FALLBACK])].slice(0, 3);
  return [HEX[picked[0]], HEX[picked[1]], HEX[picked[2]]];
}

/** Stable color for a name, so a new tag always gets the same color. */
export function colorForName(name: string): ColorName {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function isColorName(value: unknown): value is ColorName {
  return typeof value === 'string' && (COLORS as readonly string[]).includes(value);
}
