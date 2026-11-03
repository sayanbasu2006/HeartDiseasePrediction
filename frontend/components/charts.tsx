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
                    new Date(v).toLocaleDateString(undefined, {
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
                      ? new Date(Number(label)).toLocaleString()
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
          {brush && (
            <Brush
              dataKey="time"
              height={22}
              stroke="var(--teal)"
              fill="var(--card)"
              tickFormatter={(v) => new Date(v).toLocaleDateString()}
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
export function Contributions({
  data,
  absolute = false,
}: {
  data: any[];
  absolute?: boolean;
}) {
  return (
    <div className="contributions">
      {data.map((r: any) => (
        <div key={r.feature} className="contribution">
          <span
            title={
              r.value !== undefined
                ? `${fieldLabel(r.feature)}: ${formatMeasurement(r.feature, r.value)}`
                : fieldLabel(r.feature)
            }
          >
            {fieldLabel(r.feature)}
          </span>
          <div className="track">
            <span
              className={
                absolute ? "away" : r.contribution >= 0 ? "toward" : "away"
              }
              style={{
                width: `${Math.min(100, Math.abs(r.contribution) * 350)}%`,
              }}
            />
          </div>
          <b>
            {!absolute && r.contribution >= 0 ? "+" : ""}
            {r.contribution.toFixed(3)}
          </b>
        </div>
      ))}
      <div className="legend">
        {absolute ? (
          <>
            <span className="dot teal" />
            Absolute model-score change
          </>
        ) : (
          <>
            <span className="dot coral" /> Increases disease-pattern score{" "}
            <span className="dot teal" /> Decreases disease-pattern score
          </>
        )}
      </div>
    </div>
  );
}
