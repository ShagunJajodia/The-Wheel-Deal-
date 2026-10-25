import { useId } from "react";
import type { ReactNode } from "react";

export interface FieldControlProps {
  id: string;
  name: string;
  "aria-invalid"?: "true";
  "aria-describedby"?: string;
}

interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/** Label + control + inline error, wired together with aria-invalid / aria-describedby. */
export function FormField({ label, name, error, hint, children }: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-stone-700">
        {label}
      </label>
      <div className="mt-1.5">
        {children({
          id,
          name,
          "aria-invalid": error ? "true" : undefined,
          "aria-describedby": error ? errorId : undefined,
        })}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-stone-500">{hint}</p>
      )}
    </div>
  );
}
