import type { FormEvent } from 'react';
import { IconSearch } from '../icons/Icons';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

/** Search box that runs on Enter and resets the results when cleared. */
export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search…',
  label,
  className = '',
}: SearchInputProps) {
  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(value.trim());
  }

  return (
    <form role="search" onSubmit={submit} className={`relative w-full max-w-md ${className}`}>
      <IconSearch
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        value={value}
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value === '') onSubmit('');
        }}
        className="field-input pl-10"
      />
    </form>
  );
}
