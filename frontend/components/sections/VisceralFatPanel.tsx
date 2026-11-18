"use client";

import { useId } from "react";
import { Activity, ArrowUpRight, Layers, MoveRight } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatFatDifference,
  type VisceralFatAssessment,
  type VisceralFatEffect,
} from "@/lib/visceral-fat";
import { Card } from "./shared";

const evidenceUrl = "https://pmc.ncbi.nlm.nih.gov/articles/PMC8493650/";

function FatIllustration() {
  const pattern = useId().replaceAll(":", "");
  return (
    <svg
      viewBox="0 0 240 160"
      className="vf-anatomy"
      role="img"
      aria-label="Schematic abdominal cross-section: visceral fat surrounds internal organs; subcutaneous fat sits beneath the skin."
    >
      <defs>
        <pattern
          id={pattern}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 6 6 0"
            stroke="currentColor"
            strokeWidth="0.7"
            opacity="0.35"
          />
        </pattern>
      </defs>
      <ellipse
        cx="120"
        cy="77"
        rx="91"
        ry="61"
        fill="var(--card)"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <ellipse
        cx="120"
        cy="77"
        rx="80"
        ry="50"
        fill="var(--surface-muted)"
        stroke="currentColor"
        strokeWidth="0.7"
      />
      <ellipse
        cx="120"
        cy="77"
        rx="65"
        ry="39"
        fill={`url(#${pattern})`}
        stroke="currentColor"
        strokeWidth="0.7"
      />
      <path
        d="M78 64c-12-19 9-29 23-16s8 21-3 23-17 0-20-7ZM144 47c20-9 30 10 17 24s-27 0-17-24ZM100 83c1-14 29-15 30 0s-13 24-23 14-1-13 9-11M140 84c17-5 20 17 4 21s-23-9-4-21Z"
        fill="var(--card)"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle
        cx="120"
        cy="119"
        r="8"
        fill="var(--card)"
        stroke="currentColor"
      />
      <path
        d="M48 39 26 17H7M165 95l31 39h35"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      <circle cx="48" cy="39" r="2.4" fill="currentColor" />
      <circle cx="165" cy="95" r="2.4" fill="currentColor" />
      <text x="7" y="10" fill="currentColor" fontSize="8">
        BENEATH THE SKIN
      </text>
      <text x="166" y="149" fill="currentColor" fontSize="8">
        AROUND ORGANS
      </text>
    </svg>
  );
}

export function VisceralFatGuide() {
  return (
    <aside className="vf-guide" aria-label="Understanding visceral fat">
      <div className="vf-guide-illustration">
        <FatIllustration />
        <span>Abdominal cross-section · schematic</span>
      </div>
      <div>
        <span className="overline">BEYOND BODY WEIGHT</span>
        <h3>A small input. Important context.</h3>
        <p>
          Visceral fat sits around the internal organs. Excess visceral fat is
          associated with insulin resistance, inflammation, and cardiovascular
          disease.
        </p>
        <p className="caption">
          Enter your device’s visceral fat <strong>index</strong>. Device scales
          differ; a percentage, waist measurement, or fat area cannot substitute
          for this value.
        </p>
        <a
          href={evidenceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-link"
        >
          Read the AHA scientific statement <ArrowUpRight size={13} />
        </a>
      </div>
    </aside>
  );
}

function ResponseCurve({ effect }: { effect: VisceralFatEffect }) {
  const gradient = useId().replaceAll(":", "");
  const data = effect.curve.map((point) => ({
    ...point,
    score: point.score * 10,
  }));
  return (
    <figure className="vf-response">
      <div className="vf-chart-heading">
        <strong>One input. The model’s response.</strong>
        <span>All other inputs held fixed</span>
      </div>
      <div
        className="vf-chart"
        role="img"
        aria-label={`Model response to the visceral fat index. Submitted index ${effect.index}: ${(effect.submitted_score * 10).toFixed(2)} out of 10. Reference index ${effect.reference_index}: ${(effect.reference_score * 10).toFixed(2)} out of 10. Difference ${formatFatDifference(effect.difference)} percentage points.`}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart
            data={data}
            margin={{ top: 18, right: 18, bottom: 8, left: -24 }}
          >
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.13} />
                <stop
                  offset="100%"
                  stopColor="currentColor"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <XAxis
              type="number"
              dataKey="index"
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => Number(v.toFixed(1)).toString()}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 2.5, 5, 7.5, 10]}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="chart-tooltip">
                    <strong>
                      Visceral fat index{" "}
                      {Number(payload[0].payload.index).toFixed(1)}
                    </strong>
                    <div>
                      Model score: {Number(payload[0].value).toFixed(2)} / 10
                    </div>
                  </div>
                ) : null
              }
            />
            <ReferenceLine
              x={effect.reference_index}
              stroke="var(--muted)"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              x={effect.index}
              stroke="var(--ink)"
              strokeDasharray="2 3"
            />
            <Area
              type="linear"
              dataKey="score"
              stroke="var(--ink)"
              strokeWidth={2}
              fill={`url(#${gradient})`}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={effect.reference_index}
              y={effect.reference_score * 10}
              r={5}
              fill="var(--card)"
              stroke="var(--ink)"
              strokeWidth={1.5}
            />
            <ReferenceDot
              x={effect.index}
              y={effect.submitted_score * 10}
              r={5}
              fill="var(--ink)"
              stroke="var(--card)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="vf-chart-legend">
        <span>
          <i />
          Submitted index
        </span>
        <span>
          <i className="vf-reference-dot" />
          Development reference
        </span>
        <span>Device index →</span>
      </div>
      <figcaption>
        Model score / 10. Lines connect sampled predictions; they do not
        describe a medical risk curve.
      </figcaption>
      <details className="vf-data-table">
        <summary>View chart values</summary>
        <table>
          <thead>
            <tr>
              <th>Device index</th>
              <th>Model score / 10</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.index}>
                <td>{point.index.toFixed(2)}</td>
                <td>{point.score.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function VisceralFatSummary({
  result,
}: {
  result: VisceralFatAssessment;
}) {
  const effect = result.visceral_fat_effect;
  const index = result.measurements.visceral_fat;
  return (
    <div className="vf-summary">
      <div className="vf-summary-title">
        <Layers size={17} />
        <strong>Visceral fat effect</strong>
      </div>
      <div className="vf-summary-values">
        <div>
          <span>Submitted index</span>
          <strong>
            {index ?? "—"}
            <small>device index</small>
          </strong>
        </div>
        <MoveRight size={18} aria-hidden="true" />
        <div>
          <span>Model score difference</span>
          <strong>
            {effect ? formatFatDifference(effect.difference) : "—"}
            <small>percentage points</small>
          </strong>
        </div>
      </div>
      <p>
        {effect
          ? `Compared with index ${Number(effect.reference_index.toFixed(2))}, with other inputs fixed. Generated training indices; not a medical risk estimate.`
          : "Run a new assessment to calculate the visceral fat comparison for this saved record."}
      </p>
    </div>
  );
}

export function VisceralFatPanel({
  result,
}: {
  result: VisceralFatAssessment;
}) {
  const effect = result.visceral_fat_effect;
  if (!effect)
    return (
      <Card>
        <VisceralFatSummary result={result} />
      </Card>
    );
  const outOfRange =
    effect.index < effect.development_range[0] ||
    effect.index > effect.development_range[1];
  return (
    <Card className="vf-panel">
      <div className="vf-heading">
        <div>
          <span className="overline">
            BODY COMPOSITION · INDIVIDUAL MODEL RESPONSE
          </span>
          <h2>Visceral fat, in focus.</h2>
          <p>
            See how this input changes the score, with every other measurement
            held fixed.
          </p>
        </div>
        <span className="badge">
          <Layers size={13} />
          {result.synthetic ? "Simulated model" : "Research model"}
        </span>
      </div>
      <div className="vf-metrics">
        <div>
          <span>01 / Submitted index</span>
          <strong>
            {effect.index}
            <small>device index</small>
          </strong>
          <p>The value supplied for this record</p>
        </div>
        <div>
          <span>02 / Reference comparison</span>
          <strong>
            {Number(effect.reference_index.toFixed(2))}
            <small>device index</small>
          </strong>
          <p>
            Median of {effect.reference_count} development background records
          </p>
        </div>
        <div>
          <span>03 / Model score difference</span>
          <strong>
            {formatFatDifference(effect.difference)}
            <small>percentage points</small>
          </strong>
          <p>
            {Math.abs(effect.difference) < 0.00005
              ? "No difference at the displayed precision"
              : effect.difference > 0
                ? "Higher model score than the reference record"
                : "Lower model score than the reference record"}
          </p>
        </div>
      </div>
      <div className="vf-detail-grid">
        <div className="vf-comparison">
          <span className="overline">THE SAME RECORD, TWO INDICES</span>
          <h3>Isolating the model response</h3>
          {[
            {
              label: `Reference index · ${Number(effect.reference_index.toFixed(2))}`,
              score: effect.reference_score,
              reference: true,
            },
            {
              label: `Submitted index · ${effect.index}`,
              score: effect.submitted_score,
              reference: false,
            },
          ].map((row) => (
            <div className="vf-score-row" key={row.label}>
              <div>
                <span>{row.label}</span>
                <strong>
                  {(row.score * 10).toFixed(2)}
                  <small> / 10</small>
                </strong>
              </div>
              <div
                className={`vf-score-track ${row.reference ? "vf-score-reference" : ""}`}
              >
                <i style={{ width: `${row.score * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="caption">
            {result.synthetic
              ? "Higher simulated-pattern"
              : "Disease-present class"}{" "}
            model score. The reference is a dataset comparison, not a
            recommended index.
          </p>
        </div>
        {effect.curve.length > 0 && <ResponseCurve effect={effect} />}
      </div>
      {outOfRange && (
        <p className="vf-range-note">
          <Activity size={16} />
          This index falls outside the development range (
          {effect.development_range.join("–")}). The model’s response here has
          limited support.
        </p>
      )}
      <div className="vf-evidence-note">
        <Layers size={17} />
        <p>
          <strong>Read this as model behavior.</strong> Training visceral fat
          indices are generated. This comparison is not a measured biological
          effect, a treatment prediction, or personal cardiovascular risk.
          Device indices have no universal healthy threshold.
        </p>
      </div>
    </Card>
  );
}
