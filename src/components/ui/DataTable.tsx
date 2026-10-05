import type { ComponentType, ReactNode } from 'react';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';

interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  emptyIcon?: ComponentType<{ size?: number; className?: string }>;
  emptyAction?: ReactNode;
  /** Rendered above the table inside the card, e.g. a count or filters. */
  toolbar?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage = 'Nothing here yet.',
  emptyTitle,
  emptyIcon,
  emptyAction,
  toolbar,
}: DataTableProps<T>) {
  return (
    <Card className="overflow-hidden">
      {toolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          {toolbar}
        </div>
      )}
      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState message={emptyMessage} title={emptyTitle} icon={emptyIcon} action={emptyAction} />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={col.className}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
