type Props = {
  onFile: (file: File) => void | Promise<void>;
  disabled?: boolean;
  label?: string;
};

/** Hidden file input styled like a secondary button — used on Contacts, Companies and Deals. */
export function ImportCsvButton({ onFile, disabled, label = 'Import CSV' }: Props) {
  return (
    <label className={`btn-secondary cursor-pointer ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      {label}
      <input
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}
