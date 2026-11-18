"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import { fields, fieldLabel, formatMeasurement } from "@/lib/api";
import { formatDate, locale } from "@/lib/presentation";
const colors = ["var(--teal)", "var(--coral)", "var(--chart-blue)"];
export function Trend({
  data,
  lines = ["observed", "filtered"],
  height = 260,
  brush = false,
  time = true,
  probability = false,
}: {
  data: any[];
  lines?: string[];
  height?: number;
  brush?: boolean;
  time?: boolean;
  probability?: boolean;
}) {
  return (
    <div style={{ height, width: "100%", minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 15, right: 20, left: -8, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 5"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey={time ? "time" : "x"}
            type="number"
            domain={time ? ["dataMin", "dataMax"] : [0, 1]}
            tickFormatter={
              time
                ? (v) =>
                    new Date(v).toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                    })
                : (v) => `${Math.round(v * 100)}%`
            }
            tick={{ fontSize: 13, fill: "var(--muted)" }}
          />
          <YAxis
            domain={time && !probability ? ["auto", "auto"] : [0, 1]}
            tick={{ fontSize: 13, fill: "var(--muted)" }}
          />
          <Tooltip
            content={({ active, payload, label }: any) =>
              active && payload?.length ? (
                <div className="chart-tooltip">
                  <strong>
                    {time
                      ? formatDate(Number(label), true)
                      : `x: ${Number(label).toFixed(2)}`}
                  </strong>
                  {payload.map((p: any) => (
                    <div key={p.dataKey} style={{ color: p.color }}>
                      {p.dataKey}: {Number(p.value).toFixed(3)}
                    </div>
                  ))}
                  {payload[0]?.payload?.estimate_sd !== undefined && (
                    <div>
                      Filtered estimate SD:{" "}
                      {Number(payload[0].payload.estimate_sd).toFixed(2)}
                    </div>
                  )}
                </div>
              ) : null
            }
          />
          {lines.map((key, i) => (
            <Line
              key={key}
              type="linear"
              dataKey={key}
              className={i === 1 ? "trend-secondary-line" : undefined}
              stroke={colors[i % 3]}
              strokeWidth={i === 0 ? 1.5 : 2.5}
              dot={data.length < 15}
              isAnimationActive={false}
              connectNulls={false}
            />
          ))}
          {!time && (
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: 1, y: 1 },
              ]}
              stroke="var(--muted)"
              strokeDasharray="4 4"
            />
          )}
          {brush && data.length > 1 && (
            <Brush
              dataKey="time"
              ariaLabel={`Adjust the chart date range between ${formatDate(data[0].time)} and ${formatDate(data[data.length - 1].time)} using the left and right arrow keys`}
              height={28}
              travellerWidth={12}
              stroke="var(--teal)"
              fill="var(--card)"
              tickFormatter={(v) => formatDate(v)}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Distribution({
  data,
  feature = "",
}: {
  data: any[];
  feature?: string;
}) {
  const categorical = !!fields.find((f) => f.key === feature)?.options;
  if (categorical)
    return (
      <div style={{ height: 270, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "var(--muted)" }}
            />
            <YAxis
              type="category"
              dataKey="value"
              width={160}
              tickFormatter={(v) => {
                const label = formatMeasurement(feature, v);
                return label.length > 25 ? label.slice(0, 24) + "…" : label;
              }}
              tick={{ fontSize: 12, fill: "var(--muted)" }}
            />
            <Tooltip
              labelFormatter={(v) => formatMeasurement(feature, v)}
              contentStyle={{
                background: "var(--card)",
                color: "var(--ink)",
                border: "1px solid var(--border)",
                borderRadius: 12,
              }}
            />
            <Bar
              dataKey="count"
              name="Records"
              fill="var(--teal)"
              radius={[0, 5, 5, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );

  return (
    <div style={{ height: 270, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="value"
            tick={{ fontSize: 13, fill: "var(--muted)" }}
          />
          <YAxis tick={{ fontSize: 13, fill: "var(--muted)" }} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
            }}
          />
          <Bar
            dataKey="count"
            fill="var(--teal)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export type FeatureContribution = {
  feature: string;
  value?: number;
  contribution: number;
};
export function Contributions({
  data,
  absolute = false,
  scoreName = "disease-present score",
}: {
  data: FeatureContribution[];
  absolute?: boolean;
  scoreName?: string;
}) {
  const extent = Math.max(
    ...data.map((item) => Math.abs(item.contribution)),
    0.001,
  );
  return (
    <figure
      className="contribution-chart"
      aria-label={
        absolute
          ? "Absolute feature sensitivity"
          : `Signed contributions to the ${scoreName}`
      }
    >
      <figcaption className="contribution-description">
        {absolute
          ? "Absolute model-score change across the development references."
          : `Negative values decrease the ${scoreName}. Positive values increase it. These contributions describe how the model responds to its inputs.`}
      </figcaption>
      <div className="contribution-axis" aria-hidden="true">
        <span>{absolute ? "Zero" : "Decreases score ←"}</span>
        <span>{absolute ? "Greater sensitivity" : "→ Increases score"}</span>
      </div>
      <div className="contributions">
        {data.map((item) => {
          const width =
            (Math.abs(item.contribution) / extent) * (absolute ? 100 : 50);
          const sign = item.contribution >= 0 ? "+" : "";
          const description = `${fieldLabel(item.feature)}: ${absolute ? "" : sign}${item.contribution.toFixed(3)} score units${item.value === undefined ? "" : `; submitted ${formatMeasurement(item.feature, item.value)}`}. ${absolute ? "Absolute sensitivity." : `${item.contribution >= 0 ? "Increases" : "Decreases"} the ${scoreName}.`}`;
          return (
            <div
              className="contribution"
              key={item.feature}
              tabIndex={0}
              aria-label={description}
              title={description}
            >
              <span>{fieldLabel(item.feature)}</span>
              <div
                className={`track ${absolute ? "" : "signed"}`}
                aria-hidden="true"
              >
                <span
                  className={
                    absolute || item.contribution < 0 ? "away" : "toward"
                  }
                  style={{
                    width: `${width}%`,
                    left: `${absolute ? 0 : item.contribution >= 0 ? 50 : 50 - width}%`,
                  }}
                />
              </div>
              <b aria-hidden="true">
                {!absolute && sign}
                {item.contribution.toFixed(3)}
              </b>
            </div>
          );
        })}
      </div>
      <div className="legend">
        {absolute ? (
          <>
            <span className="dot teal" /> Absolute score change
          </>
        ) : (
          <>
            <span className="dot teal" /> − Decreases score{" "}
            <span className="dot coral" /> + Increases score
          </>
        )}
      </div>
    </figure>
  );
}
