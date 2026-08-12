import type { ReactNode } from 'react';

export default function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
        {icon}
      </div>
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-500">{description}</p>
      )}
    </div>
  );
}
