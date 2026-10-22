import type { RangeTuple } from 'fuse.js';
import type { ReactNode } from 'react';

/** Wraps matched character ranges in <mark>. */
export default function Highlight({ text, ranges }: { text: string; ranges: readonly RangeTuple[] }) {
  if (!ranges.length) return <>{text}</>;
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    if (start < cursor) continue;
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={start} className="rounded-sm bg-amber-200/70 px-px text-inherit dark:bg-amber-400/30">
        {text.slice(start, end + 1)}
      </mark>,
    );
    cursor = end + 1;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}
