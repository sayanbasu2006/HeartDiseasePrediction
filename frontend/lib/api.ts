import catalogue from "./fields.generated.json";
export async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  if (!response.ok) {
    let message = "The backend is unavailable. Start FastAPI and try again.";
    try {
      const body = await response.json();
      message =
        typeof body.detail === "string"
          ? body.detail
          : JSON.stringify(body.detail);
    } catch {}
    throw new Error(message);
  }
  return response.json();
}
export const post = (path: string, data: unknown, options: RequestInit = {}) =>
  api(path, { ...options, method: "POST", body: JSON.stringify(data) });
export function diseaseScore(result: {
  disease_class_score?: number;
  model_score: number;
}): number {
  return result.disease_class_score ?? 1 - result.model_score;
}
export const scorePercent = (score: number) => `${(score * 100).toFixed(1)}%`;
export function download(content: BlobPart, name: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Array.from(new Set(rows.flatMap(Object.keys)));
  const safe = (v: unknown) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return [
    keys.map(safe).join(","),
    ...rows.map((r) => keys.map((k) => safe(r[k])).join(",")),
  ].join("\n");
}
export interface ClinicalOption {
  value: number;
  label: string;
  supported: boolean;
  aliases: string[];
}
export interface ClinicalField {
  key: string;
  label: string;
  group: number;
  help: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  codes?: number[];
  options?: ClinicalOption[];
  validationMessage?: string;
}
export const fields: ClinicalField[] = catalogue.fields;
export function fieldLabel(key: string) {
  return fields.find((f) => f.key === key)?.label || key;
}
export function formatMeasurement(key: string, value: unknown): string {
  const f = fields.find((f) => f.key === key);
  if (value === undefined || value === null || value === "")
    return "Not provided";
  const choice = f?.options?.find((o) => o.value === Number(value));
  return choice?.label ?? String(value);
}
export function parseMeasurement(key: string, value: unknown): unknown {
  const f = fields.find((f) => f.key === key);
  if (typeof value === "string" && f?.options) {
    const text = value.trim().toLowerCase();
    const choice = f.options.find((o) =>
      [o.label, ...o.aliases].some((label) => label.toLowerCase() === text),
    );
    if (choice) return choice.value;
  }
  return value;
}
export const order = [
  "age",
  "sex",
  "cp",
  "trestbps",
  "chol",
  "fbs",
  "restecg",
  "thalach",
  "exang",
  "oldpeak",
  "slope",
  "ca",
  "thal",
];
