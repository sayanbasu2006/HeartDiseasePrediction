"use client";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Info } from "lucide-react";
import type { ClinicalField } from "@/lib/api";
import { ChoiceGroup } from "./ui/choice-group";

export function ClinicalEntry({
  field: f,
  form,
  value,
}: {
  field: ClinicalField;
  form: UseFormReturn<Record<string, number>>;
  value: number | undefined;
}) {
  const unsupported = f.options?.some(
    (option) => option.value === value && !option.supported,
  );
  const invalid = !!form.formState.errors[f.key] || !!unsupported;
  const message = String(
    form.formState.errors[f.key]?.message ||
      f.validationMessage ||
      "A recorded, supported result is required. Do not guess an unavailable test result.",
  );
  const helpId = `${f.key}-help`;
  const errorId = `${f.key}-error`;
  const description = `${helpId}${invalid ? ` ${errorId}` : ""}`;
  const guidance = (
    <>
      <p className="field-help" id={helpId}>
        {f.help}
      </p>
      {invalid && (
        <p className="field-error" id={errorId} role="alert">
          {message}
        </p>
      )}
    </>
  );
  const assistance = (
    <details className="field-assistance">
      <summary aria-label={`Help for ${f.label}`}>
        <Info size={15} />
        <span>Entry guidance</span>
      </summary>
      <p>
        {f.options
          ? "Select the finding as recorded in your clinical report. An unknown or unsupported choice cannot be assessed."
          : `Accepted input: ${f.min}–${f.max} ${f.unit || ""}${f.key === "age" ? "; whole years only" : ""}. These are input constraints, not clinical reference ranges.`}
      </p>
    </details>
  );
  if (f.key === "sex")
    return (
      <fieldset
        className={`field choice-field clinical-entry ${invalid ? "has-error" : ""}`}
      >
        <legend>
          {f.label} <span className="field-required">Required</span>
        </legend>
        <Controller
          name={f.key}
          control={form.control}
          render={({ field }) => (
            <ChoiceGroup
              name={field.name}
              label={f.label}
              value={field.value}
              options={f.options || []}
              describedBy={description}
              invalid={invalid}
              inputRef={field.ref}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        {guidance}
        {assistance}
      </fieldset>
    );
  return (
    <div className={`field clinical-entry ${invalid ? "has-error" : ""}`}>
      <label htmlFor={f.key}>
        {f.label}
        <span className="field-required">
          Required{f.unit ? ` · ${f.unit}` : ""}
        </span>
      </label>
      {f.codes ? (
        <select
          id={f.key}
          defaultValue=""
          aria-required="true"
          aria-invalid={invalid}
          aria-describedby={description}
          {...form.register(f.key, {
            setValueAs: (v) => (v === "" ? undefined : Number(v)),
          })}
        >
          <option value="">Select recorded finding</option>
          {f.options?.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={f.key}
          type="number"
          inputMode={f.step && f.step < 1 ? "decimal" : "numeric"}
          min={f.min}
          max={f.max}
          step={f.step}
          placeholder="Enter recorded value"
          aria-required="true"
          aria-invalid={invalid}
          aria-describedby={description}
          {...form.register(f.key, { valueAsNumber: true })}
        />
      )}
      {guidance}
      {assistance}
    </div>
  );
}
