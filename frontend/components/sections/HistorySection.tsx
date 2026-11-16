import { useEffect, useState } from "react";
import {
  Activity,
  History,
  Info,
  Plus,
  Download,
  Trash2,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Trend } from "@/components/charts";
import { useSession } from "@/components/provider";
import { formatDate } from "@/lib/presentation";
import { api, post, download, csv } from "@/lib/api";
import { Card, ErrorBox, Empty, Stat } from "./shared";
import { useResource } from "./useResource";

function RecordedSummary({
  data,
  metric,
}: {
  data: { time: number; observed?: number | null }[];
  metric: string;
}) {
  const readings = data.filter(
    (reading): reading is { time: number; observed: number } =>
      typeof reading.observed === "number" && Number.isFinite(reading.observed),
  );
  if (!readings.length) return null;
  const first = readings[0];
  const last = readings[readings.length - 1];
  const units: Record<string, string> = {
    heart_rate: "bpm",
    systolic: "mmHg",
    diastolic: "mmHg",
    cholesterol: "mg/dL",
    visceral_fat: "device index",
  };
  const delta = last.observed - first.observed;
  return (
    <div
      className="recent-readings"
      aria-label="Recorded readings in selected date range"
    >
      <article>
        <span>First recorded reading</span>
        <strong>
          {first.observed.toFixed(1)}
          <small>{units[metric]}</small>
        </strong>
        <small>{formatDate(first.time)}</small>
      </article>
      <article>
        <span>Latest recorded reading</span>
        <strong>
          {last.observed.toFixed(1)}
          <small>{units[metric]}</small>
        </strong>
        <small>{formatDate(last.time)}</small>
      </article>
      <article>
        <span>Recorded change</span>
        <strong>
          {readings.length > 1
            ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`
            : "—"}
          <small>{units[metric]}</small>
        </strong>
        <small>
          {readings.length > 1
            ? "Latest minus first; not a clinical assessment"
            : "A second reading is needed for comparison"}
        </small>
      </article>
    </div>
  );
}
export function HistorySection() {
  const history = useResource("/history/measurements");
  const { temporary, setTemporary } = useSession();
  const [analysis, setAnalysis] = useState<any>(null);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [metric, setMetric] = useState("heart_rate");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (demo) return;
    if (temporary) {
      setAnalysis(temporary.analysis);
      return;
    }
    if (!history.data) return;
    const controller = new AbortController();
    post("/history/analyze", {}, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setAnalysis(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [demo, history.data, temporary]);
  async function sample() {
    setBusy(true);
    try {
      setAnalysis(await post("/history/analyze", { demo: true }));
      setDemo(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    setDemo(false);
    setTemporary(null);
    setAnalysis(null);
    history.reload();
  }
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const record: any = {
      timestamp: new Date(String(fd.get("timestamp"))).toISOString(),
    };
    for (const k of [
      "heart_rate",
      "systolic",
      "diastolic",
      "cholesterol",
      "visceral_fat",
    ])
      if (fd.get(k)) record[k] = Number(fd.get(k));
    setBusy(true);
    setError("");
    try {
      if (consent) {
        await post("/history/measurements", {
          consent: true,
          measurements: [record],
        });
        setMessage("Measurement saved locally with your consent.");
        setTemporary(null);
        history.reload();
      } else {
        const records = [...(temporary?.records || []), record];
        const a = await post("/history/analyze", { measurements: records });
        setTemporary({ records, analysis: a });
        setAnalysis(a);
        setMessage(
          "Measurement analyzed. You can save it to measurement history below.",
        );
      }
      setDemo(false);
      form.reset();
      setShowForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveTemporary() {
    if (!temporary) return;
    setError("");
    setBusy(true);
    try {
      await post("/history/measurements", {
        consent,
        measurements: temporary.records,
      });
      setTemporary(null);
      history.reload();
      setMessage("Measurements saved locally.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!window.confirm("Delete all saved local measurements?")) return;
    try {
      await api("/history/measurements", { method: "DELETE" });
      setTemporary(null);
      setDemo(false);
      setMessage("Saved history deleted.");
      history.reload();
    } catch (e: any) {
      setError(e.message);
    }
  }
  const data = (analysis?.trends?.[metric] || []).filter(
    (r: any) =>
      (!from || r.time >= new Date(from).getTime()) &&
      (!to || r.time < new Date(to).getTime() + 86400000),
  );
  const records = demo
    ? []
    : temporary?.records || history.data?.measurements || [];
  const temporalFiltered =
    analysis?.hmm?.posterior?.filter(
      (r: any) =>
        (!from || r.time >= new Date(from).getTime()) &&
        (!to || r.time < new Date(to).getTime() + 86400000),
    ) || [];
  return (
    <>
      <div className="toolbar">
        <div className="row">
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus size={16} />
            Add measurement
          </Button>
          <Button variant="outline" disabled={busy} onClick={sample}>
            <FlaskConical size={16} />
            Explore sample timeline
          </Button>
          {(demo || temporary) && (
            <Button variant="outline" onClick={restore}>
              Show saved history
            </Button>
          )}
        </div>
        <div className="row">
          <Button
            variant="outline"
            disabled={!records.length}
            onClick={() => download(csv(records), "cardiolens-history.csv")}
          >
            <Download size={16} />
            Export
          </Button>
          <Button
            variant="ghost"
            onClick={remove}
            disabled={!history.data?.measurements?.length}
          >
            <Trash2 size={17} />
            Delete saved data
          </Button>
        </div>
      </div>
      {demo && (
        <div className="demo-banner">
          <FlaskConical size={19} />
          Synthetic demonstration: 60 generated observations, never used to
          train the heart-disease classifier or saved as personal data.
        </div>
      )}
      {temporary && !demo && (
        <div className="note">
          <Info size={18} />
          <div>
            <strong>Temporary measurements</strong>
            <p>
              These records will disappear on reload. Saving them requires your
              explicit consent below.
            </p>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I consent to local storage
          </label>
          <Button disabled={!consent || busy} onClick={saveTemporary}>
            Save locally
          </Button>
        </div>
      )}
      {showForm && (
        <Card>
          <h3>Add an actual recorded measurement</h3>
          <form onSubmit={add}>
            <div className="form-grid">
              <label className="field">
                <span>Recorded date & time</span>
                <input name="timestamp" type="datetime-local" required />
                <small className="caption">
                  Your browser’s local timezone will be used.
                </small>
              </label>
              {[
                ["heart_rate", "Heart rate (bpm)", 25, 250],
                ["systolic", "Systolic pressure (mmHg)", 60, 260],
                ["diastolic", "Diastolic pressure (mmHg)", 30, 160],
                ["cholesterol", "Cholesterol (mg/dL)", 50, 700],
                ["visceral_fat", "Visceral fat (device index)", 0, undefined],
              ].map(([key, label, min, max]) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <input
                    name={String(key)}
                    type="number"
                    min={Number(min)}
                    max={max === undefined ? undefined : Number(max)}
                    step="any"
                    placeholder="Leave blank if unmeasured"
                  />
                </label>
              ))}
            </div>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I consent to saving these measurements in the local database.
            </label>
            <Button disabled={busy} type="submit">
              {consent ? "Save measurement" : "Analyze without saving"}
            </Button>
          </form>
        </Card>
      )}
      <ErrorBox message={error || history.error} />
      {message && (
        <p role="status" className="success">
          {message}
        </p>
      )}
      <div className="grid three">
        <Stat
          title="Observations"
          value={analysis?.count ?? 0}
          sub={
            demo
              ? "Synthetic demonstration"
              : temporary
                ? "Temporary records"
                : "Saved local records"
          }
          icon={History}
        />
        <Stat
          title="Available measurements"
          value={Object.keys(analysis?.trends || {}).length}
          sub="Distinct measurement types"
          icon={Activity}
        />
        <Stat
          title="Temporal analysis"
          value={analysis?.hmm?.available ? "Available" : "Needs more data"}
          sub="Experimental HMM patterns"
          icon={FlaskConical}
        />
      </div>
      <Card>
        <div className="card-heading">
          <div>
            <span className="overline">THE LONGER VIEW</span>
            <h3>Measurements & filtered trends</h3>
          </div>
          <select
            aria-label="Choose measurement"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="heart_rate">Heart rate · bpm</option>
            <option value="systolic">Systolic · mmHg</option>
            <option value="diastolic">Diastolic · mmHg</option>
            <option value="cholesterol">Cholesterol · mg/dL</option>
            <option value="visceral_fat">Visceral fat · device index</option>
          </select>
        </div>
        <div className="row filters">
          <label>
            From{" "}
            <input
              aria-label="From date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To{" "}
            <input
              aria-label="To date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <Button
            variant="ghost"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Clear range
          </Button>
        </div>
        {data.length ? (
          <>
            <RecordedSummary data={data} metric={metric} />
            <Trend data={data} brush />
            <div className="legend">
              <span className="dot teal" />
              Raw observations <span className="dot coral" />
              Kalman filtered estimates
            </div>
            <p className="caption">
              Time gaps are retained on the horizontal axis. Filtering scales
              process uncertainty with elapsed days. No unrecorded readings are
              imputed.
            </p>
            {metric === "visceral_fat" && (
              <p className="caption">
                Compare readings from the same device and rating scale. Visceral
                fat is not used by the heart-disease classifier or HMM.
              </p>
            )}
          </>
        ) : (
          <Empty
            title="A timeline worth building"
            text="Add timestamped measurements or explore the clearly labeled synthetic sample."
          />
        )}
      </Card>
      <Card>
        <div className="card-heading">
          <div>
            <span className="overline">EXPERIMENTAL TEMPORAL INTELLIGENCE</span>
            <h3>Measurement-pattern states</h3>
          </div>
          <span className="badge">Gaussian HMM</span>
        </div>
        {analysis?.hmm?.available ? (
          <>
            <p>{analysis.hmm.method}</p>
            <div className="grid two">
              {analysis.hmm.states.map((s: any) => (
                <div className="state-card" key={s.state}>
                  <span className="badge">State {s.state}</span>
                  <h3>{s.label}</h3>
                  <p>
                    Mean heart rate {s.mean_heart_rate.toFixed(1)} bpm · Mean
                    systolic {s.mean_systolic.toFixed(1)} mmHg
                  </p>
                </div>
              ))}
            </div>
            <h4>Posterior state probabilities</h4>
            <Trend
              data={temporalFiltered}
              lines={["state_0", "state_1"]}
              brush
              probability
            />
            <div className="state-timeline" aria-label="Viterbi state sequence">
              {temporalFiltered.map((r: any, i: number) => (
                <button
                  key={i}
                  style={{
                    background: r.state ? "var(--coral)" : "var(--teal)",
                  }}
                  aria-label={`${formatDate(r.time)}: ${r.label}`}
                  title={`${formatDate(r.time)}: ${r.label}`}
                  onClick={() =>
                    setMessage(`${formatDate(r.time, true)}: ${r.label}`)
                  }
                />
              ))}
            </div>
            <p className="caption">
              Viterbi sequence · Forward log-likelihood{" "}
              {analysis.hmm.log_likelihood.toFixed(2)} · State names describe
              learned patterns and have no validated clinical meaning.
            </p>
          </>
        ) : (
          <Empty
            title="More observations, more context"
            text={
              analysis?.hmm?.reason ||
              "Add at least 30 approximately regularly spaced paired heart-rate and systolic readings to attempt temporal analysis."
            }
          />
        )}
        <p className="caption">
          This module is separate from heart-disease classification. Neither the
          HMM nor Kalman filter predicts heart attacks or future disease.
        </p>
      </Card>
      {records.length > 0 && (
        <Card>
          <h3>Recorded observations</h3>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Scrollable data table"
          >
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Heart rate (bpm)</th>
                  <th>Systolic (mmHg)</th>
                  <th>Diastolic (mmHg)</th>
                  <th>Cholesterol (mg/dL)</th>
                  <th>Visceral fat (index)</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any, i: number) => (
                  <tr key={i}>
                    <td>{formatDate(r.timestamp, true)}</td>
                    {[
                      "heart_rate",
                      "systolic",
                      "diastolic",
                      "cholesterol",
                      "visceral_fat",
                    ].map((k) => (
                      <td key={k}>
                        {r[k] ?? <span className="missing">Not recorded</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
