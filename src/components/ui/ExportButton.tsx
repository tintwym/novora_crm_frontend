import { downloadCsv, type CsvColumn } from '../../utils/csv';
import { IconDownload } from '../icons/Icons';

export function ExportButton<T>({
  name,
  rows,
  columns,
}: {
  name: string;
  rows: T[];
  columns: CsvColumn<T>[];
}) {
  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={rows.length === 0}
      title={rows.length === 0 ? 'Nothing to export' : `Download ${rows.length} rows as CSV`}
      onClick={() => downloadCsv(name, rows, columns)}
    >
      <IconDownload size={16} />
      Export
    </button>
  );
}
