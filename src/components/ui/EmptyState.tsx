import type { ComponentType, ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  title?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  action?: ReactNode;
}

export function EmptyState({ message, title, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
          <Icon size={22} />
        </div>
      )}
      {title && (
        <p className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</p>
      )}
      <p className={`max-w-sm text-sm text-slate-500 ${title ? 'mt-1' : ''}`}>{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
