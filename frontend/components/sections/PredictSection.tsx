import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  HeartPulse,
  Activity,
  FileText,
  Info,
  ArrowUpRight,
  ArrowRight,
  Check,
  FlaskConical,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/provider";
import { ClinicalEntry } from "@/components/clinical-entry";
import {
  api,
  post,
  fields,
  formatMeasurement,
  syntheticFatField,
} from "@/lib/api";
import { Card, ErrorBox } from "./shared";
import { AssessmentResult } from "./AssessmentResult";
import { VisceralFatGuide } from "./VisceralFatPanel";
import { BrowserStorageControl } from "./BrowserStorageControl";
import { isSupportedMeasurement } from "@/lib/measurement-validation";

const patientShape: Record<string, z.ZodType> = Object.fromEntries(
  fields.map((f) => [
    f.key,
    z
      .number({
        error:
          f.validationMessage || `Enter a supported ${f.label.toLowerCase()}.`,
      })
      .refine(
        (v) => isSupportedMeasurement(f, v),
        f.validationMessage || `Choose a recorded ${f.label.toLowerCase()}.`,
      ),
  ]),
);
const patientSchema = z.object(patientShape);
const syntheticFatSchema = z
  .number()
  .min(syntheticFatField.min)
  .max(syntheticFatField.max);
const syntheticPatientSchema = patientSchema.extend({
  visceral_fat: syntheticFatSchema,
});
const emptyValues = Object.fromEntries(
  fields.map(({ key }) => [key, undefined]),
);
export function PredictSection() {
  const { storage } = useSession();
  return storage.ready ? (
    <PredictForm />
  ) : (
    <p role="status">Loading assessment…</p>
  );
}

function PredictForm() {
  const { assessmentDraft, setAssessmentDraft, setLatest } = useSession();
  const [step, setStep] = useState(assessmentDraft?.step ?? 0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [example, setExample] = useState(assessmentDraft?.example ?? false);
  const [synthetic, setSynthetic] = useState(
    assessmentDraft?.synthetic ?? false,
  );
  const form = useForm<Record<string, number>>({
    resolver: zodResolver(
      synthetic ? syntheticPatientSchema : patientSchema,
    ) as any,
    defaultValues: assessmentDraft?.values ?? {},
  });
  const selectedValues = useWatch({ control: form.control });
  useEffect(() => {
    if (result) return;
    const values = Object.fromEntries(
      Object.entries(selectedValues).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && Number.isFinite(entry[1]),
      ),
    );
    setAssessmentDraft(
      Object.keys(values).length ? { values, step, example, synthetic } : null,
    );
  }, [selectedValues, step, example, synthetic, result, setAssessmentDraft]);
  const requiredFields = fields;
  const completedFields = requiredFields.filter(
    ({ key }) =>
      (synthetic && key === "visceral_fat"
        ? syntheticFatSchema
        : patientShape[key]
      ).safeParse(selectedValues[key]).success,
  );
  const assessmentGroups = [
    "Patient details",
    "Measurements",
    "Clinical records",
  ];
  const stepGuidance = [
    {
      title: "Use the recorded patient details",
      text: "Enter details from the same examination as the measurements. These inputs describe the source record; they are not a diagnosis.",
    },
    {
      title: "Check values and units",
      text: "Copy the values exactly as recorded. Check each unit before continuing, and distinguish resting measurements from exercise-test results.",
    },
    {
      title: "Refer to the clinical test report",
      text: "Use the documented ECG, exercise, and other test findings. If a required test is unavailable, do not substitute a normal result.",
    },
    {
      title: "Confirm the complete record",
      text: "Review all values and categories. Use Back to correct an entry before running the model. This assessment describes a research dataset pattern.",
    },
  ][step];

  const formHeading = useRef<HTMLHeadingElement>(null);
  function resetDraft() {
    setResult(null);
    setStep(0);
    form.reset(emptyValues);
    setError("");
    setExample(false);
    setSynthetic(false);
    setAssessmentDraft(null);
  }
  async function next() {
    const group = fields.filter((f) => f.group === step).map((f) => f.key);
    if (await form.trigger(group)) {
      setStep(step + 1);
      setError("");
    }
  }
  async function submit(values: Record<string, number>) {
    setBusy(true);
    setError("");
    try {
      const r = await post(
        synthetic ? "/synthetic/predict" : "/predict",
        values,
      );
      setLatest({ ...r, demonstration: example });
      setResult(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function exampleLoad(simulate: boolean) {
    setBusy(true);
    setError("");
    try {
      const r = await api(simulate ? "/synthetic/example" : "/example");
      form.reset(r.measurements);
      setExample(!simulate);
      setSynthetic(simulate);
      setStep(3);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (step > 0) formHeading.current?.focus();
  }, [step]);
  if (result)
    return (
      <AssessmentResult
        key={result.timestamp}
        result={result}
        example={example}
        onReview={() => {
          setResult(null);
          setStep(3);
        }}
        onReset={resetDraft}
      />
    );
  return (
    <>
      {step === 0 && !synthetic && (
        <div className="assessment-launcher">
          <div className="assessment-launcher-copy">
            <span className="tile-icon">
              <FileText size={20} />
            </span>
            <div>
              <h2>Start from an example record</h2>
              <p>Review the measurements before running your assessment.</p>
            </div>
          </div>
          <div className="assessment-example-actions">
            <Button
              variant="outline"
              onClick={() => exampleLoad(false)}
              disabled={busy}
            >
              Load Cleveland example <ArrowRight size={15} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => exampleLoad(true)}
              disabled={busy}
            >
              <FlaskConical size={16} /> Explore the model demo
            </Button>
          </div>
        </div>
      )}
      {(synthetic || example) && (
        <div className="assessment-launcher assessment-mode-notice">
          <div className="assessment-launcher-copy">
            <span className="tile-icon">
              <FlaskConical size={20} />
            </span>
            <div>
              <h2>{synthetic ? "Model demonstration" : "Cleveland example"}</h2>
              <p>
                {synthetic
                  ? "Explore how visceral fat affects a score from generated records."
                  : "The visceral fat index starts with a generated example value."}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={resetDraft} disabled={busy}>
            {synthetic ? "Exit demo" : "Clear example"}
          </Button>
        </div>
      )}
      <div className="grid prediction-grid assessment-layout">
        <Card className="clinical-form-card">
          <div className="stepper">
            {[
              "Patient details",
              "Measurements",
              "Clinical records",
              "Review",
            ].map((s, i) => (
              <div
                key={s}
                className={i === step ? "current" : i < step ? "done" : ""}
                aria-current={i === step ? "step" : undefined}
              >
                <span>{i < step ? <Check size={14} /> : i + 1}</span>
                <small>{s}</small>
              </div>
            ))}
          </div>
          <form
            noValidate
            aria-busy={busy}
            onSubmit={(e) => {
              if (step < 3) {
                e.preventDefault();
                void next();
              } else {
                void form.handleSubmit(submit, (errors) => {
                  const missing = fields.find(({ key }) => errors[key]);
                  if (missing) setStep(missing.group);
                })(e);
              }
            }}
          >
            <div className="mobile-form-progress">
              <span>
                {completedFields.length} of {requiredFields.length} inputs
                complete
              </span>
              <progress
                value={completedFields.length}
                max={requiredFields.length}
                aria-label="Assessment inputs completed"
              />
            </div>
            <div className="form-title">
              <span className="overline">STEP {step + 1} OF 4</span>
              <h2 ref={formHeading} tabIndex={-1}>
                {
                  [
                    "Start with patient details",
                    "Add your measurements",
                    "Complete the clinical picture",
                    "Review your inputs",
                  ][step]
                }
              </h2>
              <p>
                {synthetic
                  ? "Adjust the simulated inputs to explore how the model responds."
                  : step === 3
                    ? "Check the supplied measurements before requesting a prediction."
                    : "Choose the options and enter the values in your medical report. If a result is unknown, do not guess."}
              </p>
            </div>
            {step < 3 ? (
              <div className="form-grid">
                {fields
                  .filter((f) => f.group === step)
                  .map((f) => (
                    <ClinicalEntry
                      key={f.key}
                      field={
                        synthetic && f.key === "visceral_fat"
                          ? { ...f, ...syntheticFatField }
                          : f
                      }
                      form={form}
                      value={selectedValues[f.key]}
                    />
                  ))}
              </div>
            ) : (
              <>
                <div className="review-grid">
                  {fields.map((f) => (
                    <div key={f.key}>
                      <span>{f.label}</span>
                      <strong>
                        {formatMeasurement(f.key, form.getValues(f.key))}{" "}
                        <small>{f.unit || ""}</small>
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="note compact">
                  <Info size={19} />
                  <p>
                    {synthetic
                      ? "The simulation assigns each record an artificial label. The score describes that label."
                      : "This model predicts a dataset label. It cannot confirm or exclude heart disease. All selections are converted internally to the model’s verified input format."}
                  </p>
                </div>
              </>
            )}
            {step === 1 && <VisceralFatGuide />}
            <ErrorBox message={error} />
            <div className="form-actions">
              <Button
                variant="outline"
                type="button"
                disabled={!step || busy}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
              <span>
                {step === 3
                  ? `${requiredFields.length} required inputs`
                  : "All fields in this step are required"}
              </span>
              {step < 3 ? (
                <Button key="next" type="button" onClick={next}>
                  Continue
                  <ArrowRight size={16} />
                </Button>
              ) : (
                <Button key="submit" type="submit" disabled={busy}>
                  {busy ? (
                    <Loader2 className="spin" size={17} />
                  ) : (
                    <HeartPulse size={17} />
                  )}
                  {synthetic ? "Run model demo" : "Run assessment"}
                </Button>
              )}
            </div>
          </form>
        </Card>
        <aside
          className="stack assessment-sidebar"
          aria-label="Assessment progress and record guidance"
        >
          <Card className="assessment-progress">
            <div className="row between">
              <span className="overline">RECORD COMPLETENESS</span>
              <span className="badge">
                {completedFields.length} / {requiredFields.length}
              </span>
            </div>
            <div className="completion-value" role="status" aria-live="polite">
              <strong>
                {Math.round(
                  (completedFields.length / requiredFields.length) * 100,
                )}
                <small>%</small>
              </strong>
              <span>
                Step {step + 1} of 4<br />
                {completedFields.length} of {requiredFields.length} supported
                inputs
              </span>
            </div>
            <progress
              value={completedFields.length}
              max={requiredFields.length}
              aria-label="Supported inputs completed"
            />
            <p>
              Inputs with supported values. Confirm their accuracy against your
              records.
            </p>
            <div className="assessment-checklist">
              {assessmentGroups.map((label, index) => {
                const groupFields = requiredFields.filter(
                  (f) => f.group === index,
                );
                const count = completedFields.filter(
                  (f) => f.group === index,
                ).length;
                return (
                  <div
                    key={label}
                    className={index === step ? "is-current" : ""}
                  >
                    <span className="assessment-check-icon">
                      {count === groupFields.length ? (
                        <Check size={16} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span>{label}</span>
                    <small>
                      {count} / {groupFields.length}
                    </small>
                  </div>
                );
              })}
            </div>
            <details className="missing-records">
              <summary>
                {requiredFields.length - completedFields.length
                  ? `${requiredFields.length - completedFields.length} ${requiredFields.length - completedFields.length === 1 ? "input" : "inputs"} still needed`
                  : "All required inputs supplied"}
              </summary>
              <ul>
                {requiredFields
                  .filter(
                    (f) => !completedFields.some((done) => done.key === f.key),
                  )
                  .map((f) => (
                    <li key={f.key}>{f.label}</li>
                  ))}
              </ul>
              {completedFields.length === requiredFields.length && (
                <p>Review the complete record before running the assessment.</p>
              )}
            </details>
          </Card>
          <Card className="guidance assessment-guide">
            <div className="row">
              <FileText size={20} />
              <span className="overline">Record guidance</span>
            </div>
            <h3>
              {synthetic ? "Use hypothetical measurements" : stepGuidance.title}
            </h3>
            <p>
              {synthetic
                ? `Visceral fat is one of ${requiredFields.length} required inputs in this demo.`
                : stepGuidance.text}
            </p>
            <details>
              <summary>What you need for this assessment</summary>
              <ul>
                {assessmentGroups.map((label, index) => (
                  <li key={label}>
                    <strong>{label}</strong>
                    <span>
                      {requiredFields
                        .filter((f) => f.group === index)
                        .map((f) => f.label)
                        .join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
            <Link className="text-link" href="/insights">
              Measurement definitions <ArrowUpRight size={14} />
            </Link>
          </Card>
          <Card className="assessment-expectations">
            <h3>What the result includes</h3>
            <div>
              <Activity size={18} />
              <p>
                <strong>Model output</strong>
                <span>A score and predicted source-dataset class.</span>
              </p>
            </div>
            <div>
              <SlidersHorizontal size={18} />
              <p>
                <strong>Feature explanation</strong>
                <span>How the supplied inputs contribute to the result.</span>
              </p>
            </div>
            <div>
              <FileText size={18} />
              <p>
                <strong>Report and exploration</strong>
                <span>Export a summary and explore hypothetical inputs.</span>
              </p>
            </div>
            <p className="assessment-footnote">
              For education and research. Results cannot confirm or exclude
              heart disease.
            </p>
            <details>
              <summary>How your inputs are handled</summary>
              <p>
                Drafts are kept while you move around the workspace. Timeline
                readings require separate consent before they enter the history
                database.
              </p>
              <BrowserStorageControl />
            </details>
            {assessmentDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={resetDraft}
                disabled={busy}
              >
                Discard draft
              </Button>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
