import Link from "next/link";
import { HeartPulse, ArrowUpRight, Check } from "lucide-react";
import { useSession } from "@/components/provider";
import { formatDate } from "@/lib/presentation";
import {
  assessmentInputCounts,
  assessmentScoreLabel,
  diseaseScore,
  fields,
} from "@/lib/api";
import { countSupportedInputs } from "@/lib/measurement-validation";
import { Card, Empty } from "./shared";
import { ReportButton } from "./ReportButton";
import { VisceralFatSummary } from "./VisceralFatPanel";

export function ReportsSection() {
  const { latest } = useSession();
  const synthetic = latest?.synthetic === true;
  const requiredInputs = synthetic
    ? assessmentInputCounts.total
    : assessmentInputCounts.required;
  const suppliedInputs = latest
    ? countSupportedInputs(fields, latest.measurements)
    : 0;
  return (
    <div className="grid prediction-grid">
      <Card>
        <span className="overline">ASSESSMENT REPORT</span>
        <h2>Export your latest assessment</h2>
        {synthetic ? (
          <div className="demo-banner">Model demonstration</div>
        ) : (
          latest?.demonstration && (
            <div className="demo-banner">
              Dataset demonstration — not your personal record.
            </div>
          )
        )}
        <p>
          Download submitted measurements, the experimental result, model
          version, feature explanations, and limitations as a PDF. No name or
          identifying details are requested.
        </p>
        {latest ? (
          <>
            <div className="report-preview">
              <div className="row between">
                <span className="brand">
                  <HeartPulse size={25} />
                  CardioLens AI
                </span>
                <span className="badge">PDF</span>
              </div>
              <hr />
              <span className="overline">
                {synthetic ? "MODEL DEMONSTRATION" : "EXPERIMENTAL ASSESSMENT"}
              </span>
              <h3>{latest.label}</h3>
              <p>{formatDate(latest.timestamp, true)}</p>
              <div className="grid two">
                <div>
                  <small>{assessmentScoreLabel(synthetic)}</small>
                  <h2>{(diseaseScore(latest) * 10).toFixed(2)} / 10</h2>
                </div>
                <div>
                  <small>Required inputs supplied</small>
                  <h2>
                    {suppliedInputs} / {requiredInputs}
                  </h2>
                </div>
              </div>
              <VisceralFatSummary result={latest} />
              <p className="caption">
                {synthetic
                  ? "The simulated score has no medical interpretation."
                  : "Not a medical diagnosis. Not a future cardiovascular event probability."}
              </p>
            </div>
            {suppliedInputs === requiredInputs ? (
              <ReportButton
                measurements={latest.measurements}
                demonstration={latest.demonstration}
                synthetic={synthetic}
                modelVersion={
                  typeof latest.model_version === "string"
                    ? latest.model_version
                    : undefined
                }
              />
            ) : (
              <div className="note">
                <div>
                  <p>
                    This saved record does not contain all 14 required inputs.
                    Complete a new assessment before exporting a matching
                    report.
                  </p>
                  <Link href="/predict" className="text-link">
                    Complete a new assessment <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <Empty
            title="Your first report is one assessment away"
            text="Complete an assessment to download a report with its inputs and model output."
            href="/predict"
            label="Start an assessment"
          />
        )}
      </Card>
      <Card>
        <h3>Included in every report</h3>
        <ul className="checklist">
          {[
            "Assessment timestamp",
            "All submitted measurements and units",
            "Model output and artifact version",
            "Input completeness",
            "Individual explanation summary",
            "Visceral fat comparison and model response chart",
            "Dataset and model limitations",
            "Prominent research disclaimer",
          ].map((t) => (
            <li key={t}>
              <Check size={16} />
              {t}
            </li>
          ))}
        </ul>
        <hr />
        <h3>Need a data export?</h3>
        <p>
          Batch results export as CSV from Upload data. Timestamped readings
          export from the Health timeline.
        </p>
        <Link className="text-link" href="/upload">
          Open uploads
          <ArrowUpRight size={16} />
        </Link>
      </Card>
    </div>
  );
}
