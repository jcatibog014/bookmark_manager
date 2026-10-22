import clsx from 'clsx';
import { useState } from 'react';
import { faviconUrl } from '../lib/url';

interface FaviconProps {
  domain: string;
  className?: string;
}

/** Site icon with a letter avatar fallback when the icon can't load. */
export default function Favicon({ domain, className }: FaviconProps) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={clsx(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200/70 dark:bg-zinc-800 dark:ring-zinc-700/60',
        className ?? 'size-8',
      )}
    >
      {failed ? (
        <span className="text-xs font-semibold text-zinc-500 uppercase">{domain.charAt(0) || '?'}</span>
      ) : (
        <img
          src={faviconUrl(domain)}
          alt=""
          loading="lazy"
          className="size-1/2 min-h-4 min-w-4 object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
