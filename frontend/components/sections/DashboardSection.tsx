import Link from "next/link";
import { useEffect, useState } from "react";
import {
  HeartPulse,
  Activity,
  Upload,
  History,
  ArrowUpRight,
  ArrowRight,
  Check,
  FlaskConical,
  CheckCircle2,
} from "lucide-react";
import { Trend } from "@/components/charts";
import { useSession } from "@/components/provider";
import { formatDate } from "@/lib/presentation";
import { post } from "@/lib/api";
import { Card, ErrorBox, Empty, Stat, Score } from "./shared";
import { useResource } from "./useResource";

export function DashboardSection() {
  const { latest, assessments, uploads, storage } = useSession();
  const history = useResource("/history/measurements");
  const metrics = useResource("/model-info");
  const [analysis, setAnalysis] = useState<any>(null);
  useEffect(() => {
    post("/history/analyze", {})
      .then(setAnalysis)
      .catch(() => {});
  }, [history.data]);
  return (
    <>
      <div className="overview-banner">
        <div>
          <span className="overline">Measurement history</span>
          <h2>Track changes over time</h2>
          <p>Review your recorded readings and their filtered trends.</p>
          <Link href="/history" className="text-link">
            View health timeline
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="banner-wave">
          <HeartPulse size={65} strokeWidth={1} />
          <ECG />
        </div>
      </div>
      <div className="grid four">
        <Stat
          title="Latest assessment"
          value={
            latest
              ? latest.synthetic
                ? latest.class_description
                : latest.predicted_class
                  ? "No-disease pattern"
                  : "Disease-present pattern"
              : "No assessment"
          }
          sub={
            latest
              ? latest.synthetic
                ? "Model demonstration"
                : "Experimental model output"
              : "Start when your records are ready"
          }
          icon={HeartPulse}
        />
        <Stat
          title="Saved measurements"
          value={history.data?.measurements?.length ?? "—"}
          sub="Stored with your consent"
          icon={History}
        />
        <Stat
          title="Reviewed uploads"
          value={uploads.length}
          sub="Files reviewed in this workspace"
          icon={Upload}
        />
        <Stat
          title="Input completeness"
          value={latest ? (latest.synthetic ? "14 / 14" : "13 / 13") : "—"}
          sub={
            latest?.synthetic
              ? "Simulated inputs"
              : "Clinical inputs for a prediction"
          }
          icon={CheckCircle2}
        />
      </div>
      <div className="grid dashboard-grid">
        <Card>
          <div className="card-heading">
            <div>
              <span className="overline">MEASUREMENTS OVER TIME</span>
              <h3>
                Heart-rate trend <small>bpm</small>
              </h3>
            </div>
            <span className="badge">Recorded data</span>
          </div>
          {analysis?.trends?.heart_rate ? (
            <Trend data={analysis.trends.heart_rate} brush />
          ) : (
            <Empty
              title="Your timeline starts here"
              text="Add repeated measurements to see your recorded heart-rate trend."
              href="/history"
              label="Add a measurement"
            />
          )}
          <div className="card-foot">
            Observations and filtered estimates are shown separately.
          </div>
        </Card>
        <Card>
          <div className="card-heading">
            <h3>Latest model result</h3>
            <HeartPulse size={20} />
          </div>
          {latest ? (
            <>
              <Score result={latest} />
              <Link className="text-link" href="/reports">
                Export assessment
                <ArrowUpRight size={15} />
              </Link>
            </>
          ) : (
            <Empty
              title="See your result in context"
              text="Complete a guided assessment using all 13 recorded clinical inputs."
              href="/predict"
              label="Start assessment"
            />
          )}
        </Card>
      </div>
      <div className="grid two">
        <Card>
          <div className="card-heading">
            <h3>
              Blood pressure <small>mmHg</small>
            </h3>
            <Activity size={18} />
          </div>
          {analysis?.trends?.systolic ? (
            <Trend data={analysis.trends.systolic} />
          ) : (
            <Empty
              title="No pressure readings yet"
              text="Add timestamped blood-pressure measurements to your history."
            />
          )}
        </Card>
        <Card>
          <div className="card-heading">
            <h3>
              Cholesterol <small>mg/dL</small>
            </h3>
            <Activity size={18} />
          </div>
          {analysis?.trends?.cholesterol ? (
            <Trend data={analysis.trends.cholesterol} />
          ) : (
            <Empty
              title="No lab history yet"
              text="Record actual cholesterol measurements over time."
            />
          )}
        </Card>
      </div>
      <div className="grid two">
        <Card>
          <h3>Assessment activity</h3>
          {assessments.length ? (
            assessments.map((assessment) => (
              <div key={assessment.timestamp} className="activity-row">
                <span className="tile-icon">
                  <Check size={20} />
                </span>
                <div>
                  <strong>{assessment.label}</strong>
                  <small>
                    {formatDate(assessment.timestamp, true)}
                    {assessment.synthetic
                      ? " · Model demonstration"
                      : assessment.demonstration
                        ? " · Dataset demonstration"
                        : ""}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No completed assessments yet.</p>
          )}
          <p className="caption">
            {storage.enabled
              ? "Browser saving is on."
              : "Assessment results stay in memory until you refresh."}{" "}
            <Link href="/about">Manage browser saving</Link>
          </p>
        </Card>
        <Card>
          <h3>Recent uploads</h3>
          {uploads.length ? (
            uploads.map((u, i) => (
              <div className="activity-row" key={i}>
                <Upload size={18} />
                <div>
                  <strong>{u.name}</strong>
                  <small>{u.rows} records reviewed</small>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No uploads reviewed yet.</p>
          )}
        </Card>
      </div>
      <div className="note">
        <FlaskConical size={21} />
        <div>
          <strong>Know the model behind the result.</strong>
          <p>
            {metrics.data?.selected_model ||
              "Model details load from the local backend."}{" "}
            · Inspect validation, calibration, and limitations.
          </p>
        </div>
        <Link href="/models">
          Open model laboratory
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <ErrorBox message={history.error} />
    </>
  );
}

function ECG() {
  return (
    <svg className="ecg" viewBox="0 0 600 90" aria-hidden="true">
      <path
        d="M0 48 H80 L91 40 101 55 114 48 H165 L175 47 189 63 209 6 231 86 247 39 263 48 H340 L353 42 367 54 382 48 H440 L450 48 466 64 482 13 501 78 517 41 531 48 H600"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
