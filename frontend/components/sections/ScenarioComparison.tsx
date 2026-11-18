import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  assessmentScoreLabel,
  diseaseScore,
  fields,
  post,
  syntheticFatField,
} from "@/lib/api";
import { Card, ErrorBox } from "./shared";

const scenarioFields = fields
  .filter(({ key }) =>
    ["age", "chol", "trestbps", "thalach", "visceral_fat"].includes(key),
  )
  .sort(
    (a, b) =>
      Number(b.key === "visceral_fat") - Number(a.key === "visceral_fat"),
  );
const demoFields = scenarioFields.map((field) =>
  field.key === "visceral_fat" ? { ...field, ...syntheticFatField } : field,
);

type Score = Parameters<typeof diseaseScore>[0] & {
  model_version: string;
  class_description: string;
  limitations: string[];
};

type Measurements = Record<string, number | null>;

type Scenario = {
  values: Measurements;
  prediction?: Score;
  error?: string;
};

function scoreUnits(result: Score) {
  return Math.round(diseaseScore(result) * 10_000);
}

export function ScenarioComparison({
  original,
  synthetic,
}: {
  original: Score & { measurements: Measurements };
  synthetic: boolean;
}) {
  const sliders = synthetic
    ? demoFields
    : scenarioFields.map((field) =>
        field.key === "visceral_fat"
          ? {
              ...field,
              max: Math.max(31, original.measurements.visceral_fat ?? 0),
            }
          : field,
      );
  const scoreLabel = assessmentScoreLabel(synthetic);
  const [scenario, setScenario] = useState<Scenario>({
    values: original.measurements,
  });
  const { values, prediction, error } = scenario;
  const changes = sliders.filter(
    ({ key }) => values[key] !== original.measurements[key],
  );
  const changed = changes.length > 0;
  const busy = changed && !prediction && !error;
  const originalUnits = scoreUnits(original);
  const predictionUnits = prediction ? scoreUnits(prediction) : null;
  const difference =
    predictionUnits === null ? null : (predictionUnits - originalUnits) / 100;
  const olderRecordScoresLower =
    !synthetic &&
    changes.length === 1 &&
    changes[0].key === "age" &&
    values.age !== null &&
    original.measurements.age !== null &&
    values.age > original.measurements.age &&
    difference !== null &&
    difference < 0;

  useEffect(() => {
    if (!changed) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const path = synthetic ? "/synthetic/predict" : "/predict";
      post(`${path}?explain=false`, values, { signal: controller.signal })
        .then((prediction: Score) => {
          if (controller.signal.aborted) return;
          if (prediction.model_version !== original.model_version) {
            throw new Error(
              "The model has changed since this assessment. Run a new assessment before comparing inputs.",
            );
          }
          setScenario((current) =>
            current.values === values ? { values, prediction } : current,
          );
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          const error =
            reason instanceof Error && reason.message
              ? reason.message
              : "Could not calculate the comparison.";
          setScenario((current) =>
            current.values === values ? { values, error } : current,
          );
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [changed, synthetic, values, original.model_version]);

  return (
    <Card>
      <details className="workflow-details scenario-details">
        <summary>Try different inputs</summary>
        <div className="card-heading">
          <div>
            <h3>Compare a hypothetical record</h3>
            <p>Change an input to see how the model responds.</p>
          </div>
          <Button
            variant="outline"
            disabled={!changed}
            onClick={() => setScenario({ values: original.measurements })}
          >
            <RefreshCw size={15} /> Reset
          </Button>
        </div>
        {!synthetic && (
          <p className="scenario-context">
            <strong>How to read age comparisons</strong>
            This model learns associations between different dataset records.
            Its score can rise or fall as age increases while other inputs stay
            fixed. This does not estimate what happens to the same person as
            they get older, or how their medical risk changes.
          </p>
        )}
        <div className="grid two">
          <div>
            {sliders.map((field) => {
              const value = values[field.key];
              const originalValue = original.measurements[field.key];
              return (
                <label
                  className={`slider-field ${field.key === "visceral_fat" ? "vf-scenario-slider" : ""}`}
                  key={field.key}
                >
                  <span>
                    {field.label}
                    <strong>
                      {value} {field.unit}
                    </strong>
                  </span>
                  <input
                    type="range"
                    aria-label={field.label}
                    aria-valuetext={`${value} ${field.unit ?? ""}`.trim()}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={value ?? undefined}
                    onChange={(event) => {
                      const value = event.currentTarget.valueAsNumber;
                      setScenario(({ values }) => ({
                        values: { ...values, [field.key]: value },
                      }));
                    }}
                  />
                  {value !== originalValue && (
                    <small className="caption">
                      Original {originalValue} {field.unit}
                    </small>
                  )}
                  {field.key === "visceral_fat" && (
                    <small className="caption">
                      Change this index to explore the model response. Device
                      indices are not percentages.
                    </small>
                  )}
                </label>
              );
            })}
          </div>
          <div className="comparison">
            <div className="comparison-cell">
              <span>Original measurements</span>
              <strong>{(originalUnits / 100).toFixed(2)}%</strong>
              <small>{scoreLabel}</small>
              <p>{original.class_description}</p>
              {original.limitations
                .filter((text) =>
                  text.includes("outside the development-data range"),
                )
                .map((text) => (
                  <p className="scenario-warning" key={text}>
                    {text}
                  </p>
                ))}
            </div>
            <div
              className="comparison-cell"
              aria-busy={busy}
              aria-live="polite"
            >
              <span>Hypothetical measurements</span>
              {prediction && predictionUnits !== null ? (
                <>
                  <strong>{(predictionUnits / 100).toFixed(2)}%</strong>
                  <small>{scoreLabel}</small>
                  <p>{prediction.class_description}</p>
                  {prediction.limitations
                    .filter((text) =>
                      text.includes("outside the development-data range"),
                    )
                    .map((text) => (
                      <p className="scenario-warning" key={text}>
                        {text}
                      </p>
                    ))}
                </>
              ) : (
                <p>
                  {busy
                    ? "Calculating…"
                    : error
                      ? "Score unavailable"
                      : "Awaiting an input change"}
                </p>
              )}
            </div>
            {difference !== null && (
              <div className="comparison-change" aria-live="polite">
                <b>
                  {difference === 0
                    ? "Same score to two decimal places"
                    : `${difference > 0 ? "+" : ""}${difference.toFixed(2)} percentage points`}
                </b>
                <span>
                  {changes.length === 1
                    ? "1 input changed"
                    : `${changes.length} inputs changed`}
                </span>
                {olderRecordScoresLower && (
                  <p className="scenario-interpretation">
                    <strong>Age increased; model score decreased.</strong>
                    This is the model’s learned dataset association, not
                    evidence that getting older lowers heart-disease risk.
                  </p>
                )}
              </div>
            )}
            {error && (
              <div className="comparison-change">
                <ErrorBox message={error} />
                <Button
                  variant="outline"
                  onClick={() => setScenario({ values: { ...values } })}
                >
                  Retry comparison
                </Button>
              </div>
            )}
            <p className="comparison-disclaimer">
              {synthetic
                ? "This score describes the simulated label."
                : "These scores compare research dataset patterns. A clinician can assess individual risk."}
            </p>
          </div>
        </div>
      </details>
    </Card>
  );
}
