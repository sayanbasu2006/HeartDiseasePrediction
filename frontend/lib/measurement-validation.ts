import type { ClinicalField } from "./api";

export function isSupportedMeasurement(field: ClinicalField, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (field.codes) {
    return (
      field.codes.includes(value) &&
      !!field.options?.some(
        (option) => option.value === value && option.supported,
      )
    );
  }
  return (
    value >= (field.min ?? 0) &&
    value <= (field.max ?? Infinity) &&
    (field.key !== "age" || Number.isInteger(value))
  );
}

export function countSupportedInputs(
  fields: ClinicalField[],
  measurements: Record<string, unknown>,
) {
  return fields.filter((field) =>
    isSupportedMeasurement(field, measurements[field.key]),
  ).length;
}
