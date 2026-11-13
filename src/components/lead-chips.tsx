"use client";
/** Pick-one chips shared by the public lead forms (radio inputs underneath). */
import type { InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { useT } from "@/i18n/client";

export function LeadChips({
  legend,
  options,
  input,
  required,
  error,
  errorId,
}: {
  legend: string;
  /** A value (shown translated) or [value, label]. Values are stored on the lead. */
  options: readonly (string | readonly [value: string, label: string])[];
  /** Props for each radio: `register("intent")` or `name` + `defaultChecked`. */
  input: (value: string) => InputHTMLAttributes<HTMLInputElement>;
  required?: boolean;
  error?: string;
  errorId?: string;
}) {
  const t = useT();
  return (
    <fieldset
      className="lead-chips"
      aria-describedby={error ? errorId : undefined}
    >
      <legend>
        {t(legend)}
        {required && <span aria-hidden="true"> *</span>}
      </legend>
      <div className="lead-chips-list">
        {options.map((option) => {
          const [value, label] =
            typeof option === "string" ? [option, option] : option;
          return (
            <label key={value} className="lead-chip">
              <input type="radio" value={value} {...input(value)} />
              <span>
                <Check size={15} aria-hidden="true" />
                {t(label)}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <span id={errorId} className="field-error">
          {t(error)}
        </span>
      )}
    </fieldset>
  );
}
