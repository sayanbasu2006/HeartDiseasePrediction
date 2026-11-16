import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, RefreshCw, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Contributions } from "@/components/charts";
import { formatDate } from "@/lib/presentation";
import {
  post,
  fields,
  formatMeasurement,
  diseaseScore,
  scorePercent,
  assessmentScoreLabel,
  syntheticFatField,
} from "@/lib/api";
import { Card, ErrorBox, Score } from "./shared";
import { ReportButton } from "./ReportButton";

const scenarioFields = fields.filter(({ key }) =>
  ["age", "chol", "trestbps", "thalach"].includes(key),
);

export function AssessmentResult({
  result,
  example,
  onReset,
  onReview,
}: {
  result: any;
  example: boolean;
  onReset: () => void;
  onReview: () => void;
}) {
  const synthetic = result.synthetic === true;
  const scoreLabel = assessmentScoreLabel(synthetic);
  const sliders = synthetic
    ? [...scenarioFields, syntheticFatField]
    : scenarioFields;
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    resultHeading.current?.focus();
  }, []);
  const [scenario, setScenario] = useState<{
    values: Record<string, number>;
    prediction?: Parameters<typeof diseaseScore>[0] & {
      class_description: string;
      limitations: string[];
    };
    error?: string;
  }>(() => ({ values: result.measurements }));
  const { values, prediction, error = "" } = scenario;
  const changed = Object.keys(values).some(
    (key) => values[key] !== result.measurements[key],
  );
  const currentResult = changed ? prediction : result;
  const busy = changed && !prediction && !error;
  const originalPercent = scorePercent(diseaseScore(result));
  const hypotheticalPercent = currentResult
    ? scorePercent(diseaseScore(currentResult))
    : null;
  const difference = hypotheticalPercent
    ? Number.parseFloat(hypotheticalPercent) -
      Number.parseFloat(originalPercent)
    : null;
  useEffect(() => {
    if (!changed) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      post(synthetic ? "/synthetic/predict" : "/predict", values, {
        signal: controller.signal,
      })
        .then((prediction) => {
          if (controller.signal.aborted) return;
          setScenario((current) =>
            current.values === values ? { values, prediction } : current,
          );
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          const error =
            reason instanceof Error && reason.message
              ? reason.message
              : "Could not calculate the hypothetical score.";
          setScenario((current) =>
            current.values === values ? { values, error } : current,
          );
        });
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [changed, synthetic, values]);
  return (
    <>
      {example && (
        <div className="demo-banner">
          <FlaskConical size={18} /> Dataset demonstration — this result
          describes an example record, not your health.
        </div>
      )}
      <div className="grid prediction-grid">
        <Card>
          <span className="overline">
            ASSESSMENT COMPLETE · {formatDate(result.timestamp, true)}
          </span>
          <h2 ref={resultHeading} tabIndex={-1}>
            {synthetic
              ? "Model demonstration result"
              : "Your research assessment"}
          </h2>
          <div className="result-summary">
            <Score result={result} />
            <div>
              <span className="badge">
                {synthetic ? "14 / 14" : "13 / 13"} inputs supplied
              </span>
              <h3>Context matters.</h3>
              <p>
                {synthetic
                  ? `${(result.holdout_accuracy * 100).toFixed(2)}% accuracy on ${result.holdout_rows} generated evaluation records.`
                  : "This experimental result describes the model’s response to your supplied measurements. It cannot confirm or exclude heart disease."}
              </p>
              <p className="caption">
                {result.model_name}
                <br />
                Version {result.model_version}
              </p>
            </div>
          </div>
          <details className="workflow-details" open>
            <summary>
              {synthetic
                ? "Feature contributions to the simulated score"
                : "Feature contributions to the disease-present score"}
            </summary>
            <Contributions
              data={result.explanation.features}
              scoreName={synthetic ? "simulated-pattern score" : undefined}
            />
            <p className="caption">{result.explanation.method}</p>
          </details>
        </Card>
        <div className="stack">
          <Card>
            <h3>Keep a clear record</h3>
            <p>
              Download an assessment PDF with your inputs, explanation, and
              model limitations.
            </p>
            <ReportButton
              measurements={result.measurements}
              demonstration={example}
              synthetic={synthetic}
            />
            <Button variant="outline" onClick={onReset}>
              <RefreshCw size={16} />
              Begin New Assessment
            </Button>
            <Button variant="outline" onClick={onReview}>
              Review Inputs
            </Button>
            <Link href="/history" className="text-link">
              View Measurement Trends <ArrowUpRight size={16} />
            </Link>
          </Card>
          <Card>
            <h3>Interpret with care</h3>
            {result.limitations.map((s: string) => (
              <p key={s} className="caption">
                {s}
              </p>
            ))}
          </Card>
        </div>
      </div>
      <Card className="submitted-record">
        <div className="card-heading">
          <div>
            <span className="overline">THE RECORD BEHIND THE RESULT</span>
            <h3>Submitted measurements</h3>
          </div>
          <Button variant="outline" onClick={onReview}>
            Review Inputs
          </Button>
        </div>
        <div className="review-grid">
          {fields.map((f) => (
            <div key={f.key}>
              <span>{f.label}</span>
              <strong>
                {formatMeasurement(f.key, result.measurements[f.key])}{" "}
                <small>{f.unit || ""}</small>
              </strong>
            </div>
          ))}
        </div>
        {result.measurements.visceral_fat != null && (
          <div className="visceral-summary">
            <div>
              <h4>Visceral fat index</h4>
              <p>
                {synthetic
                  ? "Used in the model demo"
                  : "Included for reference"}
              </p>
            </div>
            <strong>{result.measurements.visceral_fat}</strong>
          </div>
        )}
      </Card>
      <Card>
        <details className="workflow-details scenario-details">
          <summary>Try different inputs</summary>
          <div className="card-heading">
            <div>
              <span className="overline">HYPOTHETICAL EXPLORER</span>
              <h3>What if an input were different?</h3>
            </div>
            <Button
              variant="outline"
              onClick={() => setScenario({ values: result.measurements })}
            >
              <RefreshCw size={15} />
              Reset
            </Button>
          </div>
          <p>
            {synthetic
              ? "Adjust the visceral fat index or another input to see how the simulated score changes."
              : "Both percentages show how strongly the model favors the disease-present class in the research dataset. Changing a slider shows how the model responds to a different input."}
          </p>
          <div className="grid two">
            <div>
              {sliders.map((f) => (
                <label className="slider-field" key={f.key}>
                  <span>
                    {f.label}
                    <strong>
                      {values[f.key]} {f.unit}
                    </strong>
                  </span>
                  <input
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={values[f.key]}
                    onChange={(e) => {
                      const value = e.currentTarget.valueAsNumber;
                      setScenario(({ values }) => ({
                        values: { ...values, [f.key]: value },
                      }));
                    }}
                  />
                </label>
              ))}
            </div>
            <div className="comparison" aria-busy={busy}>
              <div className="comparison-cell">
                <span>Original measurements</span>
                <strong>{originalPercent}</strong>
                <small>{scoreLabel}</small>
                <p>{result.class_description}</p>
              </div>
              <div className="comparison-cell" aria-live="polite">
                <span>Hypothetical measurements</span>
                <strong>
                  {hypotheticalPercent ?? (error ? "Unavailable" : "Updating…")}
                </strong>
                <small>{scoreLabel}</small>
                <p>
                  {currentResult
                    ? currentResult.class_description
                    : error
                      ? "No comparison was produced."
                      : "Calculating from the current slider values."}
                </p>
              </div>
              <div className="comparison-change" aria-live="polite">
                {difference !== null ? (
                  <>
                    <b>
                      {difference === 0
                        ? "No change at displayed precision"
                        : `${difference > 0 ? "+" : ""}${difference.toFixed(1)} percentage points`}
                    </b>
                    <span>
                      {changed
                        ? synthetic
                          ? "Change in the simulated score."
                          : "Difference in classifier output only. This is not a change in medical risk."
                        : "Move a slider to compare a hypothetical measurement set."}
                    </span>
                  </>
                ) : (
                  <span>
                    {error
                      ? "Adjust a value or retry the calculation."
                      : "The original assessment stays fixed while the new score is calculated."}
                  </span>
                )}
              </div>
              <p className="comparison-disclaimer">
                {synthetic
                  ? "The simulated score has no medical interpretation."
                  : "Experimental model output — not a diagnosis or your probability of having heart disease."}
              </p>
              {currentResult &&
                changed &&
                currentResult.limitations
                  .filter((text: string) =>
                    text.includes("outside the development-data range"),
                  )
                  .map((text: string) => (
                    <p className="scenario-warning" key={text}>
                      {text}
                    </p>
                  ))}
              {error && (
                <Button
                  variant="outline"
                  onClick={() => setScenario({ values: { ...values } })}
                >
                  Retry comparison
                </Button>
              )}
            </div>
          </div>
          <ErrorBox message={error} />
        </details>
      </Card>
    </>
  );
}
