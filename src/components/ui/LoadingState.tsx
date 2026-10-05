export function LoadingState({ message = 'Loading…', rows = 4 }: { message?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 p-5">
      <span className="sr-only">{message}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div
              className="h-3 animate-pulse rounded bg-slate-100 dark:bg-slate-800"
              style={{ width: `${70 - i * 8}%` }}
            />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
