import Image from 'next/image';
import type { ReactNode } from 'react';

export default function MediaCard({
  thumbnail,
  title,
  author,
  durationLabel,
  index,
  meta,
  actions,
  onRemove,
  thumbWidth = 96,
  thumbHeight = 72,
}: {
  thumbnail: string;
  title: string;
  author: string;
  durationLabel: string;
  index?: number;
  meta?: string;
  actions?: ReactNode;
  onRemove?: () => void;
  thumbWidth?: number;
  thumbHeight?: number;
}) {
  return (
    <div className="group relative flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="relative flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={thumbnail}
          alt={title}
          width={thumbWidth}
          height={thumbHeight}
          className="object-cover"
        />
        {index !== undefined && (
          <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {index}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate pr-6 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </h4>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {author} • {durationLabel}
        </p>
        {meta && <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">{meta}</p>}
        {actions && <div className="mt-2 flex items-center gap-2">{actions}</div>}
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Listeden çıkar"
          title="Listeden çıkar"
          className="absolute right-2 top-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-zinc-400 transition-opacity hover:bg-zinc-100 hover:text-red-600 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-red-400"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
