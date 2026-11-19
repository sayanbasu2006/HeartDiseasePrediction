import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  Layers,
  Info,
  ArrowUpRight,
  ShieldCheck,
  Database,
  FlaskConical,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Trend } from "@/components/charts";
import { Card, ErrorBox, Loading, Stat } from "./shared";
import { useResource } from "./useResource";

export function ModelsSection() {
  const resource = useResource("/metrics");
  const info = useResource("/model-info");
  const [name, setName] = useState("");
  const [curve, setCurve] = useState("roc");
  const m = resource.data;
  const comparison =
    m?.comparisons.find((c: any) => c.name === name) ||
    m?.comparisons.find((c: any) => c.name === m.holdout.name);
  if (resource.error)
    return (
      <Card>
        <ErrorBox message={resource.error} />
        <Button variant="outline" onClick={resource.reload}>
          Retry connection
        </Button>
      </Card>
    );
  if (!m) return <Loading />;
  return (
    <>
      <div className="research-scope">
        <Info size={20} />
        <div>
          <strong>Research evidence, with clear boundaries</strong>
          <p>
            These source-dataset results do not establish clinical accuracy for
            the Indian population. No independent clinical validation,
            regulatory approval, or hospital endorsement.
          </p>
        </div>
        <Link href="/about" className="text-link">
          Methods & limitations <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="note selected-model">
        <FlaskConical size={22} />
        <div>
          <strong>Selected: {m.holdout.name}</strong>
          <p>{info.data?.selection_rationale}</p>
        </div>
        <span className="badge">Real training results</span>
      </div>
      <div className="section-label">
        <span>
          UNTOUCHED HOLDOUT · {m.holdout.n} RECORDS · SELECTED MODEL ONLY
        </span>
      </div>
      <div className="grid four">
        <Stat
          title="Accuracy"
          value={`${(m.holdout.accuracy * 100).toFixed(1)}%`}
          sub="Fraction of correct dataset labels"
          icon={CheckCircle2}
        />
        <Stat
          title="Disease-class recall"
          value={`${(m.holdout.specificity * 100).toFixed(1)}%`}
          sub={`${m.holdout.confusion_matrix[0][1]} disease rows predicted as no disease`}
          icon={Activity}
        />
        <Stat
          title="ROC-AUC"
          value={m.holdout.roc_auc.toFixed(3)}
          sub="Discrimination on reserved data"
          icon={Layers}
        />
        <Stat
          title="Brier score"
          value={m.holdout.brier.toFixed(3)}
          sub="Mean squared probability error"
          icon={SlidersHorizontal}
        />
      </div>
      <Card>
        <div className="card-heading">
          <div>
            <span className="overline">DEVELOPMENT CROSS-VALIDATION</span>
            <h3>Compare the candidates</h3>
          </div>
          <span className="badge">4 outer folds · Nested selection</span>
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
                <th>Model</th>
                <th>ROC-AUC ± SD</th>
                <th>Accuracy</th>
                <th>Precision · no-disease class</th>
                <th>Recall · no-disease class</th>
                <th>Recall · disease class</th>
                <th>F1</th>
                <th>Brier</th>
              </tr>
            </thead>
            <tbody>
              {m.comparisons.map((c: any) => (
                <tr
                  key={c.name}
                  className={c.name === m.holdout.name ? "selected-row" : ""}
                >
                  <td>
                    <button
                      className="table-button"
                      onClick={() => setName(c.name)}
                    >
                      {c.name}
                      {c.name === m.holdout.name && (
                        <span className="badge">Selected</span>
                      )}
                    </button>
                  </td>
                  <td>
                    {c.roc_auc.toFixed(3)} ± {c.auc_sd.toFixed(3)}
                  </td>
                  {[
                    "accuracy",
                    "precision",
                    "recall",
                    "specificity",
                    "f1",
                    "brier",
                  ].map((k) => (
                    <td key={k}>{c[k].toFixed(3)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="caption">
          All comparison values use development out-of-fold predictions. Model
          choice and hyperparameters never use holdout labels. Fold SD describes
          variability, not a confidence interval. The source positive class
          means no recorded disease; precision, recall, F1 and score curves use
          that class. Disease-class recall is the metric saved as specificity.
        </p>
      </Card>
      <div className="grid two">
        <Card>
          <div className="card-heading">
            <h3>Validation curves</h3>
            <select
              aria-label="Select model"
              value={comparison?.name || ""}
              onChange={(e) => setName(e.target.value)}
            >
              {m.comparisons.map((c: any) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="tabs">
            {[
              ["roc", "ROC"],
              ["pr", "Precision–recall"],
              ["calibration", "Calibration"],
            ].map(([k, label]) => (
              <button
                className={curve === k ? "active" : ""}
                aria-pressed={curve === k}
                key={k}
                onClick={() => setCurve(k)}
              >
                {label}
              </button>
            ))}
          </div>
          <Trend data={comparison.curves[curve]} time={false} lines={["y"]} />
          <p className="caption">
            {curve === "roc"
              ? "Horizontal: false-positive rate. Vertical: true-positive rate."
              : curve === "pr"
                ? "Horizontal: recall. Vertical: precision."
                : "Horizontal: average predicted score. Vertical: observed positive-label fraction. Five quantile bins."}{" "}
            Development OOF data only.
          </p>
        </Card>
        <Card>
          <h3>Selected-model holdout confusion matrix</h3>
          <p>Rows: actual label · Columns: predicted label</p>
          <div className="matrix">
            <span />
            <small>Disease class</small>
            <small>No-disease class</small>
            <small>Disease class</small>
            <strong>
              {m.holdout.confusion_matrix[0][0]}
              <small>Correct disease labels</small>
            </strong>
            <strong className="coral-cell">
              {m.holdout.confusion_matrix[0][1]}
              <small>Disease labels missed</small>
            </strong>
            <small>No-disease class</small>
            <strong className="coral-cell">
              {m.holdout.confusion_matrix[1][0]}
              <small>No-disease labels missed</small>
            </strong>
            <strong>
              {m.holdout.confusion_matrix[1][1]}
              <small>Correct no-disease labels</small>
            </strong>
          </div>
          <p className="caption">
            Disease-class recall {(m.holdout.specificity * 100).toFixed(1)}% ·
            Precision {(m.holdout.precision * 100).toFixed(1)}% · F1{" "}
            {m.holdout.f1.toFixed(3)} · ECE {m.holdout.ece.toFixed(3)}
          </p>
        </Card>
      </div>
      <Card>
        <h3>Probability calibration, with boundaries</h3>
        <p>{info.data?.calibration_criterion}</p>
        <span className="badge">
          Development check:{" "}
          {info.data?.calibration_adequate ? "passed" : "not passed"}
        </span>
        <p>
          Passing this exploratory criterion is not clinical validation. With
          only {m.holdout.n} holdout records, calibration estimates and
          false-negative counts are uncertain.
        </p>
        <details>
          <summary>Research-only BIC model weights</summary>
          <p>{m.research_bma.method}</p>
          <p className="caption">
            A lower BIC gives a specification more weight in this comparison.
          </p>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Scrollable data table"
          >
            <table>
              <thead>
                <tr>
                  <th>Logistic specification</th>
                  <th>BIC</th>
                  <th>Evidence weight</th>
                </tr>
              </thead>
              <tbody>
                {m.research_bma.specifications.map((s: any) => (
                  <tr key={s.bic}>
                    <td>{s.features.join(", ")}</td>
                    <td>{s.bic.toFixed(2)}</td>
                    <td>{s.weight.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="caption">
            Approximate evidence weights depend on the model set and BIC
            assumptions. This research artifact is excluded from primary
            prediction.
          </p>
        </details>
      </Card>
      <Card>
        <div className="card-heading">
          <div>
            <span className="overline">REPRODUCIBILITY & PROVENANCE</span>
            <h3>Dataset audit</h3>
          </div>
          <Link href="/insights" className="text-link">
            Explore distributions <ArrowUpRight size={16} />
          </Link>
        </div>
        {info.data && (
          <div className="grid three">
            <Stat
              title="Modelling records"
              value={info.data.dataset.rows}
              sub="Records used for development and evaluation"
              icon={Database}
            />
            <Stat
              title="Development rows"
              value={info.data.development_rows}
              sub="Model selection and fitting"
              icon={Layers}
            />
            <Stat
              title="Holdout rows"
              value={info.data.holdout_rows}
              sub="One selected-model evaluation"
              icon={ShieldCheck}
            />
          </div>
        )}
        <p>{info.data?.dataset.provenance}</p>
        <p className="caption">
          Missing vessel readings: {info.data?.dataset.unusual_codes["ca=4"]}{" "}
          records. Missing stress-test results:{" "}
          {info.data?.dataset.unusual_codes["thal=0"]} records. These entries
          were identified in the UCI reference and cannot be used for a new
          assessment.
        </p>
      </Card>
    </>
  );
}
