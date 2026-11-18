import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight, RefreshCw, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Contributions } from "@/components/charts";
import { formatDate } from "@/lib/presentation";
import { fields, formatMeasurement } from "@/lib/api";
import { Card, Score } from "./shared";
import { ReportButton } from "./ReportButton";
import { ScenarioComparison } from "./ScenarioComparison";
import { VisceralFatPanel } from "./VisceralFatPanel";

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
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    resultHeading.current?.focus();
  }, []);
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
                {fields.length} required inputs supplied
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
              modelVersion={result.model_version}
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
      <VisceralFatPanel result={result} />
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
      </Card>
      <ScenarioComparison original={result} synthetic={synthetic} />
    </>
  );
}
