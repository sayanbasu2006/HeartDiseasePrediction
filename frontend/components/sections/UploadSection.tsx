import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Upload,
  Info,
  ArrowUpRight,
  ArrowRight,
  Check,
  Download,
  Search,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/provider";
import {
  api,
  post,
  download,
  csv,
  fields,
  assessmentInputCounts,
  order,
  fieldLabel,
  parseMeasurement,
  diseaseScore,
} from "@/lib/api";
import type { UploadDraft } from "@/lib/workspace-storage";
import { isSupportedMeasurement } from "@/lib/measurement-validation";
import { BrowserStorageControl } from "./BrowserStorageControl";
import { Card, ErrorBox } from "./shared";
import { VisceralFatSummary } from "./VisceralFatPanel";
import { formatFatDifference } from "@/lib/visceral-fat";

function invalidCell(key: string, value: unknown) {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  )
    return true;
  if (key === "timestamp") return !Number.isFinite(Date.parse(String(value)));
  const field = fields.find((f) => f.key === key);
  const n = Number(parseMeasurement(key, value));
  if (!Number.isFinite(n)) return true;
  return field ? !isSupportedMeasurement(field, n) : false;
}
const timelineColumns = {
  timestamp: "Date and time",
  heart_rate: "Resting heart rate",
  systolic: "Systolic blood pressure",
  diastolic: "Diastolic blood pressure",
  cholesterol: "Cholesterol",
  visceral_fat: "Visceral fat (device index)",
};

function uploadMapping(
  mapping: Record<string, string>,
  predictionMode: boolean,
) {
  return Object.fromEntries(
    Object.entries(mapping).map(([column, key]) => [
      column,
      predictionMode && key === "cholesterol"
        ? "chol"
        : !predictionMode && key === "chol"
          ? "cholesterol"
          : key,
    ]),
  );
}

export function UploadSection() {
  const {
    uploadDraft: file,
    setUploadDraft,
    recordUpload,
    setTemporary,
  } = useSession();
  const [selectedMode, setMode] = useState<UploadDraft["mode"]>("prediction");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const rows = file?.rows ?? [];
  const mapping = file?.mapping ?? {};
  const mode = file?.mode ?? selectedMode;
  const predictionMode = mode === "prediction";
  const targets = predictionMode ? order : Object.keys(timelineColumns);
  const columnLabel = (key: string) =>
    predictionMode
      ? fieldLabel(key)
      : (timelineColumns[key as keyof typeof timelineColumns] ?? key);
  useEffect(() => {
    reviewHeading.current?.focus();
  }, [file?.columns]);
  useEffect(() => {
    if (results) resultsHeading.current?.focus();
  }, [results]);
  async function onDrop(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setError("");
    setResults(null);
    const fd = new FormData();
    fd.append("file", files[0]);
    try {
      const data = await api("/upload/validate", { method: "POST", body: fd });
      recordUpload({
        name: files[0].name,
        columns: data.columns,
        rows: data.rows,
        mapping: uploadMapping(data.suggested_mapping, predictionMode),
        mode,
      });
      setConfirmed(false);
      setPage(0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: busy,
    onDropRejected: () => setError("Use one CSV or JSON file up to 2 MB."),
    accept: { "text/csv": [".csv"], "application/json": [".json"] },
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024,
  });
  const selected = Object.values(mapping).filter((key) =>
    targets.includes(key),
  );
  const duplicates = selected.length !== new Set(selected).size;
  const required = predictionMode ? order : ["timestamp"];
  const missing = required.filter((k) => !selected.includes(k));
  function selectMode(next: UploadDraft["mode"]) {
    if (next === mode) return;
    setMode(next);
    if (file) {
      setUploadDraft({
        ...file,
        mode: next,
        mapping: uploadMapping(mapping, next === "prediction"),
      });
    }
    setConfirmed(false);
    setResults(null);
  }
  function editCell(index: number, column: string, value: string) {
    if (!file) return;
    const edited = [...rows];
    edited[index] = { ...edited[index], [column]: value };
    setUploadDraft({ ...file, rows: edited });
    setResults(null);
    setConfirmed(false);
  }
  function mapped(row: UploadDraft["rows"][number]) {
    return Object.fromEntries(
      Object.entries(mapping)
        .filter(([, v]) => v)
        .map(([key, target]) => [target, row[key] ?? ""]),
    );
  }
  async function run() {
    setBusy(true);
    setError("");
    try {
      if (mode === "prediction") {
        const records = rows.map((r) =>
          Object.fromEntries(
            Object.entries(mapped(r)).filter(
              ([k, v]) => order.includes(k) && v !== "" && v !== null,
            ),
          ),
        );
        setResults(await post("/predict/batch", { records }));
      } else {
        const records = rows.map((r) =>
          Object.fromEntries(
            Object.entries(mapped(r)).filter(
              ([k, v]) =>
                [
                  "timestamp",
                  "heart_rate",
                  "systolic",
                  "diastolic",
                  "cholesterol",
                  "visceral_fat",
                ].includes(k) &&
                v !== "" &&
                v !== null,
            ),
          ),
        );
        const analysis = await post("/history/analyze", {
          measurements: records,
        });
        setTemporary({ analysis, records });
        setResults({ monitoring: true, count: records.length });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  let displayResults =
    results?.results?.filter((r: any) =>
      JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
    ) || [];
  if (sort)
    displayResults = [...displayResults].sort(
      (a: any, b: any) =>
        (b.result ? diseaseScore(b.result) : -1) -
        (a.result ? diseaseScore(a.result) : -1),
    );
  return (
    <>
      <ol className="workflow-rail" aria-label="Data analysis stages">
        {[
          "Choose purpose",
          "Upload & map",
          "Validate & assess",
          "Review results",
        ].map((label, index) => {
          const stage = results ? 3 : confirmed ? 2 : file ? 1 : 0;
          return (
            <li
              key={label}
              className={
                index === stage ? "current" : index < stage ? "done" : ""
              }
              aria-current={index === stage ? "step" : undefined}
            >
              <span>{index < stage ? <Check size={14} /> : index + 1}</span>
              {label}
            </li>
          );
        })}
      </ol>
      <Card className="upload-setup">
        <fieldset className="workflow-options" disabled={busy}>
          <legend>1. What do you want to do?</legend>
          <label>
            <input
              type="radio"
              name="upload-mode"
              checked={predictionMode}
              onChange={() => selectMode("prediction")}
            />
            <span>
              <strong>Assess several records</strong>
              <small>
                All {assessmentInputCounts.required} parameters are required,
                including visceral fat.
              </small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="upload-mode"
              checked={!predictionMode}
              onChange={() => selectMode("monitoring")}
            />
            <span>
              <strong>Track readings over time</strong>
              <small>
                Upload dated readings for one person, such as pulse or blood
                pressure.
              </small>
            </span>
          </label>
        </fieldset>
        <BrowserStorageControl />
      </Card>
      <div className="grid upload-grid">
        <Card>
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? "dragging" : ""}`}
          >
            <input {...getInputProps()} aria-label="Upload CSV or JSON" />
            <span className="upload-symbol">
              <Upload size={31} />
            </span>
            <h2>{isDragActive ? "Drop your file here" : "2. Upload a file"}</h2>
            <p>
              Drag a CSV or JSON file here, or choose one from your computer.
            </p>
            <span className="button secondary">
              Choose a file
              <ArrowUpRight size={15} />
            </span>
            <small>CSV / JSON · Up to 2 MB · 1,000 records maximum</small>
          </div>
          {busy && (
            <progress max={100} aria-label="Upload and analysis progress" />
          )}
        </Card>
        <Card>
          <h3>
            {predictionMode
              ? "What goes in an assessment file?"
              : "What goes in a timeline file?"}
          </h3>
          {predictionMode ? (
            <>
              <p>
                Use one row per record with all {assessmentInputCounts.required}{" "}
                required fields, including the visceral fat device index. The
                template lists all required columns.
              </p>
              <Button asChild variant="outline">
                <a href="/api/template" download>
                  <Download size={16} /> Download blank CSV template
                </a>
              </Button>
            </>
          ) : (
            <p>
              Include a date and time with its time zone on each row. Add any
              recorded pulse, blood pressure, or cholesterol readings for that
              time.
            </p>
          )}
        </Card>
      </div>
      <ErrorBox message={error} />
      {file && (
        <Card>
          <fieldset disabled={busy} className="upload-review">
            <div className="card-heading">
              <div>
                <h2 ref={reviewHeading} tabIndex={-1}>
                  3. Review and run
                </h2>
                <p>
                  {file.name} · {rows.length}{" "}
                  {rows.length === 1 ? "row" : "rows"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode(mode);
                  setUploadDraft(null);
                  setConfirmed(false);
                  setResults(null);
                  setPage(0);
                }}
              >
                Remove file
              </Button>
            </div>
            {!missing.length && !duplicates && (
              <p>
                Required columns matched. You can review the rows or run the
                analysis.
              </p>
            )}
            <details
              className="workflow-details"
              open={missing.length > 0 || duplicates ? true : undefined}
            >
              <summary>Match column names</summary>
              <div className="mapping-grid">
                {file.columns.map((c: string) => (
                  <label className="field" key={c}>
                    <span>{c}</span>
                    <select
                      value={targets.includes(mapping[c]) ? mapping[c] : ""}
                      onChange={(e) => {
                        setUploadDraft({
                          ...file,
                          mapping: { ...mapping, [c]: e.target.value },
                        });
                        setConfirmed(false);
                        setResults(null);
                      }}
                    >
                      <option value="">Ignore column</option>
                      {targets.map((k) => (
                        <option key={k} value={k}>
                          {columnLabel(k)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </details>
            {(missing.length > 0 || duplicates) && (
              <div className="note compact">
                <Info size={17} />
                <p>
                  {duplicates
                    ? "Multiple columns map to the same field. Resolve these mappings."
                    : `Match these required columns before running: ${missing.map(columnLabel).join(", ")}.`}
                </p>
              </div>
            )}
            <details className="workflow-details">
              <summary>Review or edit rows</summary>
              <div
                className="table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Scrollable data table"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      {file.columns.map((c: string) => (
                        <th key={c}>
                          {c}
                          <small>
                            {targets.includes(mapping[c])
                              ? columnLabel(mapping[c])
                              : "Ignored"}
                          </small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(page * 10, page * 10 + 10).map((r, i) => (
                      <tr key={page * 10 + i}>
                        <td>{page * 10 + i + 1}</td>
                        {file.columns.map((c: string) => (
                          <td key={c}>
                            {fields.find((f) => f.key === mapping[c])
                              ?.options ? (
                              <select
                                aria-label={`Row ${page * 10 + i + 1} ${fieldLabel(mapping[c])}`}
                                value={String(
                                  parseMeasurement(mapping[c], r[c]) ?? "",
                                )}
                                className={
                                  invalidCell(mapping[c], r[c]) ? "invalid" : ""
                                }
                                onChange={(e) =>
                                  editCell(page * 10 + i, c, e.target.value)
                                }
                              >
                                <option value="">Not provided</option>
                                {!fields
                                  .find((f) => f.key === mapping[c])
                                  ?.options?.some(
                                    (o) =>
                                      o.value ===
                                      Number(
                                        parseMeasurement(mapping[c], r[c]),
                                      ),
                                  ) &&
                                  r[c] !== "" &&
                                  r[c] != null && (
                                    <option value={String(r[c])}>
                                      Unrecognized value: {String(r[c])}
                                    </option>
                                  )}
                                {fields
                                  .find((f) => f.key === mapping[c])
                                  ?.options?.map((o) => (
                                    <option value={o.value} key={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <input
                                aria-label={`Row ${page * 10 + i + 1} ${fieldLabel(mapping[c] || c)}`}
                                className={
                                  mapping[c] && invalidCell(mapping[c], r[c])
                                    ? "invalid"
                                    : ""
                                }
                                value={String(r[c] ?? "")}
                                onChange={(e) =>
                                  editCell(page * 10 + i, c, e.target.value)
                                }
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <Button
                  variant="outline"
                  disabled={!page}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span>
                  Page {page + 1} of {Math.ceil(rows.length / 10)}
                </span>
                <Button
                  variant="outline"
                  disabled={(page + 1) * 10 >= rows.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </details>
            <div className="units-box">
              <p>
                {predictionMode
                  ? "Use years for age, mmHg for blood pressure, mg/dL for cholesterol, and bpm for maximum exercise heart rate."
                  : "Use bpm for resting pulse, mmHg for blood pressure, and mg/dL for cholesterol. Include a time zone with each date and time."}
              </p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                {predictionMode
                  ? "I checked the columns and units."
                  : "I checked the columns and units. These readings are for one person."}
              </label>
            </div>
            <Button
              onClick={run}
              disabled={!confirmed || duplicates || missing.length > 0 || busy}
            >
              {busy ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <Activity size={16} />
              )}
              {predictionMode ? "Run batch assessment" : "Analyze readings"}
            </Button>
          </fieldset>
        </Card>
      )}
      {results?.monitoring && (
        <Card>
          <h3 ref={resultsHeading} tabIndex={-1}>
            {results.count} readings analyzed
          </h3>
          <p>
            Open the timeline to review these observations or save them to
            measurement history with consent.
          </p>
          <Button asChild>
            <Link href="/history">
              Open health timeline
              <ArrowRight size={16} />
            </Link>
          </Button>
        </Card>
      )}
      {results?.results && (
        <Card>
          <div className="card-heading">
            <div>
              <h3 ref={resultsHeading} tabIndex={-1}>
                Batch results
              </h3>
              <p>
                {results.eligible} of {results.total} rows scored.{" "}
                {results.total - results.eligible > 0 &&
                  `${results.total - results.eligible} ${results.total - results.eligible === 1 ? "needs" : "need"} corrections.`}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                download(
                  csv(
                    results.results.map((r: any) => ({
                      row: r.row,
                      eligible: r.eligible,
                      disease_pattern_score: r.result
                        ? diseaseScore(r.result)
                        : undefined,
                      label: r.result?.label,
                      model_version: r.result?.model_version,
                      visceral_fat_index: r.result?.measurements.visceral_fat,
                      visceral_fat_reference_index:
                        r.result?.visceral_fat_effect?.reference_index,
                      visceral_fat_reference_score:
                        r.result?.visceral_fat_effect?.reference_score,
                      visceral_fat_score_difference_pp: r.result
                        ?.visceral_fat_effect
                        ? Number(
                            (
                              r.result.visceral_fat_effect.difference * 100
                            ).toFixed(2),
                          )
                        : undefined,
                      errors: r.errors
                        .map((e: any) => `${fieldLabel(e.field)}: ${e.message}`)
                        .join("; "),
                    })),
                  ),
                  "cardiolens-batch-results.csv",
                )
              }
            >
              <Download size={15} />
              Export CSV
            </Button>
          </div>
          <div className="row">
            <label className="search-input">
              <Search size={16} />
              <input
                aria-label="Search batch results"
                placeholder="Search batch results"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <Button variant="outline" onClick={() => setSort(!sort)}>
              Sort {sort ? "by row" : "by score"}
            </Button>
          </div>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Scrollable data table"
          >
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Disease-present score</th>
                  <th>Visceral fat index</th>
                  <th>Visceral fat effect</th>
                  <th>Dataset label / validation errors</th>
                </tr>
              </thead>
              <tbody>
                {displayResults.map((r: any) => {
                  const diseasePattern =
                    r.eligible &&
                    r.result?.synthetic !== true &&
                    r.result?.predicted_class === 0;
                  return (
                    <tr
                      key={r.row}
                      className={
                        diseasePattern ? "batch-pattern-row" : undefined
                      }
                    >
                      <td>{r.row}</td>
                      <td>
                        <span
                          className={`badge ${
                            diseasePattern
                              ? "batch-pattern-badge"
                              : r.eligible
                                ? ""
                                : "warning"
                          }`}
                        >
                          {diseasePattern && (
                            <TriangleAlert size={16} aria-hidden="true" />
                          )}
                          {diseasePattern
                            ? "Disease-present pattern"
                            : r.eligible
                              ? "Scored"
                              : "Needs review"}
                        </span>
                      </td>
                      <td
                        className={
                          diseasePattern ? "batch-pattern-score" : undefined
                        }
                      >
                        {r.result
                          ? `${(diseaseScore(r.result) * 10).toFixed(2)} / 10`
                          : "—"}
                      </td>
                      <td>{r.result?.measurements.visceral_fat ?? "—"}</td>
                      <td>
                        {r.result?.visceral_fat_effect ? (
                          <details className="vf-batch-detail">
                            <summary>
                              {formatFatDifference(
                                r.result.visceral_fat_effect.difference,
                              )}{" "}
                              pp
                            </summary>
                            <VisceralFatSummary result={r.result} />
                          </details>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {r.result?.label ||
                          r.errors
                            .map(
                              (e: any) =>
                                `${fieldLabel(e.field)}: ${e.message}`,
                            )
                            .join(" · ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="caption">
            Experimental label predictions. Scores do not represent clinically
            validated future event probabilities. Visceral fat effects compare
            the submitted index with a development reference while other inputs
            stay fixed. Values are percentage-point differences in model scores;
            training indices are generated.
          </p>
        </Card>
      )}
    </>
  );
}
