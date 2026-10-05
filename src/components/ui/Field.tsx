import {
  cloneElement,
  isValidElement,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

function withInvalid(child: ReactNode, invalid: boolean): ReactNode {
  if (!isValidElement(child)) return child;
  const el = child as ReactElement<{ className?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
  return cloneElement(el, {
    'aria-invalid': invalid || undefined,
    className: [el.props.className, invalid ? 'field-input-invalid' : null].filter(Boolean).join(' '),
  });
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium leading-5 text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>
      {withInvalid(children, Boolean(error))}
      <div className="min-h-4">
        {error ? (
          <p id={errorId} className="text-xs leading-4 text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs leading-4 text-slate-500">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

type InvalidProp = { invalid?: boolean };

function inputClass(invalid: boolean | undefined, className?: string) {
  return ['field-input', invalid ? 'field-input-invalid' : null, className].filter(Boolean).join(' ');
}

export function TextInput({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & InvalidProp) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={inputClass(invalid, className)}
    />
  );
}

export function TextSelect({ invalid, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & InvalidProp) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={inputClass(invalid, className)}
    />
  );
}

export function TextTextarea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & InvalidProp) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={inputClass(invalid, className)}
    />
  );
}

Field.Input = TextInput;
Field.Select = TextSelect;
Field.Textarea = TextTextarea;
