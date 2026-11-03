"use client";
import Link from "next/link";
import { useEffect, useRef, useState, ReactNode } from "react";
import {
  HeartPulse,
  LayoutDashboard,
  Activity,
  Upload,
  History,
  Lightbulb,
  Layers,
  FileText,
  Info,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
  ShieldCheck,
  Database,
  Check,
  Plus,
  Download,
  RefreshCw,
  Trash2,
  FlaskConical,
  SlidersHorizontal,
  Search,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDropzone } from "react-dropzone";
import { BeatingHeart } from "./beating-heart";
import { Button } from "./ui/button";
import { ChoiceGroup } from "./ui/choice-group";
import { Trend, Distribution, Contributions } from "./charts";
import { useSession } from "./provider";
import {
  api,
  post,
  download,
  csv,
  fields,
  order,
  fieldLabel,
  formatMeasurement,
  parseMeasurement,
  diseaseScore,
  scorePercent,
} from "@/lib/api";
const navigation = [
  ["home", "Start here", Activity],
  ["dashboard", "Overview", LayoutDashboard],
  ["predict", "New assessment", HeartPulse],
  ["upload", "Upload data", Upload],
  ["insights", "Insights", Lightbulb],
  ["models", "Model laboratory", Layers],
  ["reports", "Reports", FileText],
] as const;
const titles: Record<string, [string, string]> = {
  dashboard: [
    "Workspace overview",
    "Your latest assessment, recorded measurements, and trends — together in one place.",
  ],
  predict: [
    "New assessment",
    "A guided assessment with transparent results and a clear view of the model’s reasoning.",
  ],
  upload: [
    "Upload data",
    "Choose what you want to do, then upload a CSV or JSON file.",
  ],
  history: [
    "Health timeline",
    "Explore recorded observations, patterns, and changes over time.",
  ],
  insights: [
    "Data and model insights",
    "Explore the data and the ideas behind your results.",
  ],
  models: [
    "Model laboratory",
    "Compare classifiers on the same development folds and inspect the selected model’s holdout results.",
  ],
  reports: [
    "Assessment reports",
    "Export a clear, portable summary of your latest assessment.",
  ],
  about: [
    "About the research",
    "The data, methodology, and boundaries of CardioLens AI.",
  ],
};
function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="error">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
function Empty({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Activity size={26} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {href && (
        <Button asChild variant="outline">
          <Link href={href}>
            {label}
            <ArrowUpRight size={15} />
          </Link>
        </Button>
      )}
    </div>
  );
}
function Loading() {
  return (
    <div className="loading">
      <Loader2 className="spin" /> Connecting to your local analytics engine…
    </div>
  );
}
function useResource(path: string) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setError("");
    api(path)
      .then((r) => {
        if (alive) setData(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [path, tick]);
  return { data, error, reload: () => setTick((v) => v + 1) };
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
export function Workspace({ section }: { section: string }) {
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const health = useResource("/health");
  useEffect(() => {
    const q = window.matchMedia("(max-width:900px)");
    const update = () => setMobile(q.matches);
    update();
    q.addEventListener("change", update);
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      q.removeEventListener("change", update);
      window.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    const selected = document.documentElement.dataset.theme !== "light";
    setDark(selected);
  }, []);
  function theme() {
    setDark(!dark);
    document.documentElement.dataset.theme = !dark ? "dark" : "light";
    try {
      localStorage.setItem("cardiolens-theme-v2", !dark ? "dark" : "light");
    } catch {
      /* The theme still works when browser storage is unavailable. */
    }
  }
  return (
    <div className="app">
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      <aside
        id="workspace-navigation"
        inert={mobile && !menu}
        aria-hidden={mobile && !menu}
        className={`sidebar ${menu ? "open" : ""}`}
      >
        <Link href="/" className="brand">
          <span className="brand-icon">
            <HeartPulse size={21} strokeWidth={1.8} />
          </span>
          <span>
            CardioLens <b>AI</b>
            <small>RESEARCH WORKSPACE</small>
          </span>
        </Link>
        <nav aria-label="Workspace">
          {[
            { label: "Workspace", links: navigation.slice(0, 2) },
            { label: "Measurements", links: navigation.slice(2, 4) },
            { label: "Research", links: navigation.slice(4) },
          ].map(({ label, links }) => (
            <div className="nav-group" key={label}>
              <div className="nav-caption">{label}</div>
              {links.map(([key, title, Icon]) => (
                <Link
                  onClick={() => setMenu(false)}
                  key={key}
                  href={key === "home" ? "/" : `/${key}`}
                  className={section === key ? "active" : ""}
                  aria-current={section === key ? "page" : undefined}
                >
                  <Icon size={17} strokeWidth={1.8} />
                  {title}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      {menu && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <main id="workspace-content" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMenu(!menu)}
              aria-label={menu ? "Close navigation" : "Open navigation"}
              aria-expanded={menu}
              aria-controls="workspace-navigation"
            >
              {menu ? <X size={21} /> : <Menu size={21} />}
            </button>
            <span>CardioLens</span>
            <ChevronRight size={13} />
            <strong>
              {section === "home"
                ? "Start here"
                : navigation.find((n) => n[0] === section)?.[1] ||
                  (section === "history" ? "Health timeline" : "About")}
            </strong>
          </div>
          <div className="top-actions">
            <span
              className={`engine ${health.data?.model_ready ? "online" : ""}`}
            >
              <span className="status-dot" />
              {health.data?.model_ready
                ? "Model ready"
                : health.error
                  ? "Backend offline"
                  : "Connecting"}
            </span>
            <button
              onClick={theme}
              className="icon-button"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>
        <div className={section === "home" ? "page landing-page" : "page"}>
          {section !== "home" && (
            <div className="page-heading">
              <div>
                <div className="eyebrow">Cardiac research workspace</div>
                <h1>{titles[section][0]}</h1>
                <p>{titles[section][1]}</p>
              </div>
              {section === "dashboard" && (
                <Button asChild>
                  <Link href="/predict">
                    <Plus size={17} />
                    New assessment
                  </Link>
                </Button>
              )}
            </div>
          )}
          {section === "home" ? (
            <Landing />
          ) : section === "dashboard" ? (
            <Dashboard />
          ) : section === "predict" ? (
            <Prediction />
          ) : section === "upload" ? (
            <UploadPage />
          ) : section === "history" ? (
            <HistoryPage />
          ) : section === "models" ? (
            <Models />
          ) : section === "insights" ? (
            <Insights />
          ) : section === "reports" ? (
            <Reports />
          ) : (
            <About />
          )}
        </div>
      </main>
    </div>
  );
}
function Landing() {
  return (
    <>
      <section className="landing-intro" aria-labelledby="landing-title">
        <div className="landing-copy">
          <span className="eyebrow">
            <Activity size={15} /> Cardiac machine learning
          </span>
          <h1 id="landing-title">
            A clearer view
            <br />
            of <em>cardiac data.</em>
          </h1>
          <p>
            Run an explainable assessment, trace measurements over time, and see
            how the models perform on real research data.
          </p>
          <div className="row">
            <Button asChild>
              <Link href="/predict">
                Start an assessment
                <ArrowRight size={17} />
              </Link>
            </Button>
            <Link className="text-link" href="/models">
              Compare models <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <BeatingHeart />
      </section>
      <section className="launch-section" aria-labelledby="launch-title">
        <div className="launch-heading">
          <h2 id="launch-title">Explore the workspace</h2>
          <span className="eyebrow">Three ways to begin</span>
        </div>
        <div className="grid three launch-grid">
          {[
            {
              icon: HeartPulse,
              title: "Run an assessment",
              text: "Enter 13 clinical inputs and see which features shaped the model’s result.",
              href: "/predict",
              tag: "01",
            },
            {
              icon: Upload,
              title: "Bring your own data",
              text: "Map and validate CSV or JSON records before running an analysis.",
              href: "/upload",
              tag: "02",
            },
            {
              icon: History,
              title: "Explore a timeline",
              text: "Follow trends in recorded measurements or try the sample sequence.",
              href: "/history",
              tag: "03",
            },
          ].map((x) => (
            <Link className="card launch-card" href={x.href} key={x.title}>
              <div className="row between">
                <span className="tile-icon">
                  <x.icon size={19} />
                </span>
                <span className="launch-number">
                  {x.tag} <ArrowUpRight size={16} />
                </span>
              </div>
              <h3>{x.title}</h3>
              <p>{x.text}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="research-band" aria-labelledby="research-title">
        <FlaskConical size={23} />
        <div>
          <h2 id="research-title">From dataset to result</h2>
          <p>
            See how the classifiers were trained and evaluated. Assessments are
            for education and research and cannot diagnose heart disease.
          </p>
        </div>
        <Link className="text-link" href="/about">
          Read the methodology
          <ArrowUpRight size={15} />
        </Link>
      </section>
    </>
  );
}
function Dashboard() {
  const { latest, assessments, uploads } = useSession();
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
              ? latest.predicted_class
                ? "No-disease pattern"
                : "Disease-present pattern"
              : "No assessment"
          }
          sub={
            latest
              ? "Experimental model output"
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
          title="Session uploads"
          value={uploads.length}
          sub="Files reviewed in this session"
          icon={Upload}
        />
        <Stat
          title="Input completeness"
          value={latest ? "13 / 13" : "—"}
          sub="Clinical inputs for a prediction"
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
            assessments.map((assessment: any) => (
              <div key={assessment.timestamp} className="activity-row">
                <span className="tile-icon">
                  <Check size={20} />
                </span>
                <div>
                  <strong>{assessment.label}</strong>
                  <small>
                    {new Date(assessment.timestamp).toLocaleString()}
                    {assessment.demonstration ? " · Dataset demonstration" : ""}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No completed assessments in this session.</p>
          )}
          <p className="caption">
            Assessment results are kept in session memory and disappear on
            reload.
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
            <p className="muted">No uploads reviewed in this session.</p>
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
function Stat({
  title,
  value,
  sub,
  icon: Icon,
}: {
  title: string;
  value: any;
  sub: string;
  icon: any;
}) {
  return (
    <Card className="stat">
      <div className="row between">
        <span>{title}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </Card>
  );
}
function Score({ result }: { result: any }) {
  const score = diseaseScore(result);
  return (
    <div className="score-readout">
      {result.demonstration && (
        <span className="badge warning">Dataset demonstration</span>
      )}
      <span className="overline">Disease-present class score</span>
      <div className="score-value">
        <strong>{(score * 10).toFixed(2)}</strong>
        <span> / 10</span>
      </div>
      <meter
        min={0}
        max={10}
        value={score * 10}
        aria-label="Disease-present class score"
        aria-valuetext={`${(score * 10).toFixed(2)} out of 10`}
      />
      <strong className="score-class">{result.class_description}</strong>
      <p>Experimental model output for the research dataset.</p>
    </div>
  );
}
const patientShape: Record<string, z.ZodType> = Object.fromEntries(
  fields.map((f) => [
    f.key,
    z
      .number({ error: `Enter a supported ${f.label.toLowerCase()}.` })
      .refine(
        (v) =>
          Number.isFinite(v) &&
          ("codes" in f && f.codes
            ? f.codes.includes(v) &&
              !!f.options?.some((o) => o.value === v && o.supported)
            : v >= (f.min ?? 0) && v <= (f.max ?? 1000)) &&
          (f.key !== "age" || Number.isInteger(v)),
        f.validationMessage || `Choose a recorded ${f.label.toLowerCase()}.`,
      ),
  ]),
);
const patientSchema = z.object(patientShape);
function Prediction() {
  const { setLatest } = useSession();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [example, setExample] = useState(false);
  const form = useForm<Record<string, number>>({
    resolver: zodResolver(patientSchema) as any,
  });
  const selectedValues = form.watch();
  const formHeading = useRef<HTMLHeadingElement>(null);
  async function next() {
    const group = fields.filter((f) => f.group === step).map((f) => f.key);
    if (await form.trigger(group)) {
      setStep(step + 1);
      setError("");
    }
  }
  async function submit(values: Record<string, number>) {
    setBusy(true);
    setError("");
    try {
      const r = await post("/predict", values);
      setLatest({ ...r, demonstration: example });
      setResult(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function exampleLoad() {
    setBusy(true);
    setError("");
    try {
      const r = await api("/example");
      form.reset(r.measurements);
      setExample(true);
      setStep(3);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (step > 0) formHeading.current?.focus();
  }, [step]);
  if (result)
    return (
      <Result
        key={result.timestamp}
        result={result}
        example={example}
        onReset={() => {
          setResult(null);
          setStep(0);
        }}
      />
    );
  return (
    <>
      {step === 0 && (
        <div className="workflow-callout">
          <div>
            <strong>Just exploring?</strong>
            <p>Load an example and go straight to the review step.</p>
          </div>
          <Button variant="outline" onClick={exampleLoad} disabled={busy}>
            <FlaskConical size={16} /> Load dataset example
          </Button>
        </div>
      )}
      {example && (
        <div className="demo-banner">
          <FlaskConical size={18} />
          Dataset example loaded for demonstration. This is not your personal
          record.
        </div>
      )}
      <div className="grid prediction-grid">
        <Card>
          <div className="stepper">
            {[
              "Patient details",
              "Measurements",
              "Clinical records",
              "Review",
            ].map((s, i) => (
              <div
                key={s}
                className={i === step ? "current" : i < step ? "done" : ""}
                aria-current={i === step ? "step" : undefined}
              >
                <span>{i < step ? <Check size={14} /> : i + 1}</span>
                <small>{s}</small>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              if (step < 3) {
                e.preventDefault();
                void next();
              } else {
                void form.handleSubmit(submit)(e);
              }
            }}
          >
            <div className="form-title">
              <span className="overline">STEP {step + 1} OF 4</span>
              <h2 ref={formHeading} tabIndex={-1}>
                {
                  [
                    "Start with patient details",
                    "Add your measurements",
                    "Complete the clinical picture",
                    "Review your inputs",
                  ][step]
                }
              </h2>
              <p>
                {step === 3
                  ? "Check the supplied measurements before requesting a prediction."
                  : "Choose the options and enter the values in your medical report. If a result is unknown, do not guess."}
              </p>
            </div>
            {step < 3 ? (
              <div className="form-grid">
                {fields
                  .filter((f) => f.group === step)
                  .map((f) =>
                    f.key === "sex" ? (
                      <fieldset className="field choice-field" key={f.key}>
                        <legend>{f.label}</legend>
                        <Controller
                          name={f.key}
                          control={form.control}
                          render={({ field }) => (
                            <ChoiceGroup
                              name={field.name}
                              label={f.label}
                              value={field.value}
                              options={f.options || []}
                              describedBy="sex-help"
                              inputRef={field.ref}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                            />
                          )}
                        />
                        <small className="field-help" id="sex-help">
                          {f.help}
                        </small>
                        {(form.formState.errors[f.key] ||
                          f.options?.some(
                            (o) =>
                              o.value === selectedValues[f.key] && !o.supported,
                          )) && (
                          <span className="field-error" role="status">
                            {String(
                              form.formState.errors[f.key]?.message ||
                                f.validationMessage,
                            )}
                          </span>
                        )}
                      </fieldset>
                    ) : (
                      <label className="field" key={f.key}>
                        <span>
                          {f.label}
                          <small>{f.unit || ""}</small>
                        </span>
                        {f.codes ? (
                          <select
                            defaultValue=""
                            {...form.register(f.key, {
                              setValueAs: (v) =>
                                v === "" ? undefined : Number(v),
                            })}
                          >
                            <option value="">Select an option</option>
                            {f.options?.map((choice) => (
                              <option value={choice.value} key={choice.value}>
                                {choice.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            min={f.min}
                            max={f.max}
                            step={f.step}
                            placeholder="Enter measurement"
                            {...form.register(f.key, { valueAsNumber: true })}
                          />
                        )}
                        <small className="field-help">{f.help}</small>
                        {(form.formState.errors[f.key] ||
                          f.options?.some(
                            (o) =>
                              o.value === selectedValues[f.key] && !o.supported,
                          )) && (
                          <span className="field-error">
                            {String(
                              form.formState.errors[f.key]?.message ||
                                f.validationMessage ||
                                "A recorded result is required. If it is unavailable, you can still use measurement tracking.",
                            )}
                          </span>
                        )}
                      </label>
                    ),
                  )}
              </div>
            ) : (
              <>
                <div className="review-grid">
                  {fields.map((f) => (
                    <div key={f.key}>
                      <span>{f.label}</span>
                      <strong>
                        {formatMeasurement(f.key, form.getValues(f.key))}{" "}
                        <small>{f.unit || ""}</small>
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="note compact">
                  <Info size={19} />
                  <p>
                    This model predicts a dataset label. It cannot confirm or
                    exclude heart disease. All selections are converted
                    internally to the model’s verified input format.
                  </p>
                </div>
              </>
            )}
            <ErrorBox message={error} />
            <div className="form-actions">
              <Button
                variant="outline"
                type="button"
                disabled={!step || busy}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
              <span>
                {step === 3
                  ? "13 required inputs"
                  : "All fields in this step are required"}
              </span>
              {step < 3 ? (
                <Button key="next" type="button" onClick={next}>
                  Continue
                  <ArrowRight size={16} />
                </Button>
              ) : (
                <Button key="submit" type="submit" disabled={busy}>
                  {busy ? (
                    <Loader2 className="spin" size={17} />
                  ) : (
                    <HeartPulse size={17} />
                  )}
                  Run assessment
                </Button>
              )}
            </div>
          </form>
        </Card>
        <div className="stack">
          <Card className="guidance">
            <span className="tile-icon">
              <ShieldCheck size={24} />
            </span>
            <h3>Your records stay in your control.</h3>
            <p>
              Prediction inputs are processed locally. Assessments remain in
              session memory and are not written to the history database.
            </p>
            <hr />
            <h4>Before you begin</h4>
            <p>
              You’ll need lab and exercise-test measurements, alongside basic
              patient details.
            </p>
            <p>
              Resting pulse alone cannot replace maximum exercise heart rate. A
              fasting glucose value cannot replace the binary indicator.
            </p>
            <Link className="text-link" href="/insights">
              Understand the measurements
              <ArrowUpRight size={14} />
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
function Result({
  result,
  example,
  onReset,
}: {
  result: any;
  example: boolean;
  onReset: () => void;
}) {
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
      post("/predict", values, { signal: controller.signal })
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
  }, [changed, values]);
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
            ASSESSMENT COMPLETE · {new Date(result.timestamp).toLocaleString()}
          </span>
          <h2>Assessment result</h2>
          <div className="result-summary">
            <Score result={result} />
            <div>
              <span className="badge">13 / 13 inputs supplied</span>
              <h3>Context matters.</h3>
              <p>
                This experimental result describes the model’s response to your
                supplied measurements. It cannot confirm or exclude heart
                disease.
              </p>
              <p className="caption">
                {result.model_name}
                <br />
                Version {result.model_version}
              </p>
            </div>
          </div>
          <details className="workflow-details">
            <summary>See what affected the score</summary>
            <Contributions data={result.explanation.features} />
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
            />
            <Button variant="outline" onClick={onReset}>
              <RefreshCw size={16} />
              Edit assessment
            </Button>
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
            Both percentages show how strongly the model favors the
            disease-present class in the research dataset. Changing a slider
            shows how the model responds to a different input.
          </p>
          <div className="grid two">
            <div>
              {fields
                .filter((f) =>
                  ["age", "chol", "trestbps", "thalach"].includes(f.key),
                )
                .map((f) => (
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
                <small>Disease-present class score</small>
                <p>{result.class_description}</p>
              </div>
              <div className="comparison-cell" aria-live="polite">
                <span>Hypothetical measurements</span>
                <strong>
                  {hypotheticalPercent ?? (error ? "Unavailable" : "Updating…")}
                </strong>
                <small>Disease-present class score</small>
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
                        ? "Difference in classifier output only. This is not a change in medical risk."
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
                Experimental model output — not a diagnosis or your probability
                of having heart disease.
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
function ReportButton({
  measurements,
  demonstration = false,
}: {
  measurements: any;
  demonstration?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function get() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...measurements, demonstration }),
      });
      if (!r.ok)
        throw new Error(
          "Report generation failed. Check that the backend and model are ready.",
        );
      download(await r.blob(), "cardiolens-assessment.pdf", "application/pdf");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button disabled={busy} onClick={get}>
        {busy ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
        Download PDF
      </Button>
      <ErrorBox message={error} />
    </>
  );
}
function invalidCell(key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return true;
  if (key === "timestamp") return !Number.isFinite(Date.parse(String(value)));
  const field = fields.find((f) => f.key === key);
  const n = Number(parseMeasurement(key, value));
  if (!Number.isFinite(n)) return true;
  if (field?.codes)
    return !field.options?.some(
      (o) => o.value === Number(parseMeasurement(key, value)) && o.supported,
    );
  return field ? n < (field.min ?? 0) || n > (field.max ?? Infinity) : false;
}
const timelineColumns = {
  timestamp: "Date and time",
  heart_rate: "Resting heart rate",
  systolic: "Systolic blood pressure",
  diastolic: "Diastolic blood pressure",
  cholesterol: "Cholesterol",
};

function uploadMapping(
  mapping: Record<string, string>,
  predictionMode: boolean,
) {
  return Object.fromEntries(
    Object.entries(mapping).map(([column, key]) => [
      column,
      predictionMode && key === "cholesterol"
        ? "chol"
        : !predictionMode && key === "chol"
          ? "cholesterol"
          : key,
    ]),
  );
}

function UploadPage() {
  const { uploads, setUploads, setTemporary } = useSession();
  const [file, setFile] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<any[]>([]);
  const [mode, setMode] = useState("prediction");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const predictionMode = mode === "prediction";
  const targets = predictionMode ? order : Object.keys(timelineColumns);
  const columnLabel = (key: string) =>
    predictionMode
      ? fieldLabel(key)
      : (timelineColumns[key as keyof typeof timelineColumns] ?? key);
  useEffect(() => {
    if (file) reviewHeading.current?.focus();
  }, [file]);
  useEffect(() => {
    if (results) resultsHeading.current?.focus();
  }, [results]);
  async function onDrop(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setError("");
    setResults(null);
    setProgress(15);
    const fd = new FormData();
    fd.append("file", files[0]);
    try {
      const data = await api("/upload/validate", { method: "POST", body: fd });
      setProgress(100);
      setFile({ ...data, name: files[0].name });
      setRows(data.rows);
      setMapping(uploadMapping(data.suggested_mapping, predictionMode));
      setConfirmed(false);
      setPage(0);
      setUploads([...uploads, { name: files[0].name, rows: data.row_count }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: busy,
    onDropRejected: () => setError("Use one CSV or JSON file up to 2 MB."),
    accept: { "text/csv": [".csv"], "application/json": [".json"] },
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024,
  });
  const selected = Object.values(mapping).filter((key) =>
    targets.includes(key),
  );
  const duplicates = selected.length !== new Set(selected).size;
  const required = predictionMode ? order : ["timestamp"];
  const missing = required.filter((k) => !selected.includes(k));
  function selectMode(next: string) {
    if (next === mode) return;
    setMode(next);
    setMapping((current) => uploadMapping(current, next === "prediction"));
    setConfirmed(false);
    setResults(null);
  }
  function mapped(row: any) {
    return Object.fromEntries(
      Object.entries(mapping)
        .filter(([, v]) => v)
        .map(([key, target]) => [target, row[key] ?? ""]),
    );
  }
  async function run() {
    setBusy(true);
    setError("");
    try {
      if (mode === "prediction") {
        const records = rows.map((r) =>
          Object.fromEntries(
            Object.entries(mapped(r)).filter(([k]) => order.includes(k)),
          ),
        );
        setResults(await post("/predict/batch", { records }));
      } else {
        const records = rows.map((r) =>
          Object.fromEntries(
            Object.entries(mapped(r)).filter(
              ([k, v]) =>
                [
                  "timestamp",
                  "heart_rate",
                  "systolic",
                  "diastolic",
                  "cholesterol",
                ].includes(k) &&
                v !== "" &&
                v !== null,
            ),
          ),
        );
        const analysis = await post("/history/analyze", {
          measurements: records,
        });
        setTemporary({ analysis, records });
        setResults({ monitoring: true, count: records.length });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  let displayResults =
    results?.results?.filter((r: any) =>
      JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
    ) || [];
  if (sort)
    displayResults = [...displayResults].sort(
      (a: any, b: any) =>
        (b.result ? diseaseScore(b.result) : -1) -
        (a.result ? diseaseScore(a.result) : -1),
    );
  return (
    <>
      <Card className="upload-setup">
        <fieldset className="workflow-options" disabled={busy}>
          <legend>1. What do you want to do?</legend>
          <label>
            <input
              type="radio"
              name="upload-mode"
              checked={predictionMode}
              onChange={() => selectMode("prediction")}
            />
            <span>
              <strong>Assess several records</strong>
              <small>Each row needs all 13 clinical inputs.</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="upload-mode"
              checked={!predictionMode}
              onChange={() => selectMode("monitoring")}
            />
            <span>
              <strong>Track readings over time</strong>
              <small>
                Upload dated readings for one person, such as pulse or blood
                pressure.
              </small>
            </span>
          </label>
        </fieldset>
      </Card>
      <div className="grid upload-grid">
        <Card>
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? "dragging" : ""}`}
          >
            <input {...getInputProps()} aria-label="Upload CSV or JSON" />
            <span className="upload-symbol">
              <Upload size={31} />
            </span>
            <h2>{isDragActive ? "Drop your file here" : "2. Upload a file"}</h2>
            <p>
              Drag a CSV or JSON file here, or choose one from your computer.
            </p>
            <span className="button secondary">
              Choose a file
              <ArrowUpRight size={15} />
            </span>
            <small>CSV / JSON · Up to 2 MB · 1,000 records maximum</small>
          </div>
          {busy && (
            <progress
              max={100}
              value={progress || undefined}
              aria-label="Upload and analysis progress"
            />
          )}
        </Card>
        <Card>
          <h3>
            {predictionMode
              ? "What goes in an assessment file?"
              : "What goes in a timeline file?"}
          </h3>
          {predictionMode ? (
            <>
              <p>
                Use one row per record and include all 13 fields. The template
                lists the accepted column names.
              </p>
              <Button asChild variant="outline">
                <a href="/api/template" download>
                  <Download size={16} /> Download blank CSV template
                </a>
              </Button>
            </>
          ) : (
            <p>
              Include a date and time with its time zone on each row. Add any
              recorded pulse, blood pressure, or cholesterol readings for that
              time.
            </p>
          )}
        </Card>
      </div>
      <ErrorBox message={error} />
      {file && (
        <Card>
          <fieldset disabled={busy} className="upload-review">
            <div className="card-heading">
              <div>
                <h2 ref={reviewHeading} tabIndex={-1}>
                  3. Review and run
                </h2>
                <p>
                  {file.name} · {rows.length}{" "}
                  {rows.length === 1 ? "row" : "rows"}
                </p>
              </div>
            </div>
            {!missing.length && !duplicates && (
              <p>
                Required columns matched. You can review the rows or run the
                analysis.
              </p>
            )}
            <details
              className="workflow-details"
              open={missing.length > 0 || duplicates ? true : undefined}
            >
              <summary>Match column names</summary>
              <div className="mapping-grid">
                {file.columns.map((c: string) => (
                  <label className="field" key={c}>
                    <span>{c}</span>
                    <select
                      value={targets.includes(mapping[c]) ? mapping[c] : ""}
                      onChange={(e) => {
                        setMapping({ ...mapping, [c]: e.target.value });
                        setConfirmed(false);
                        setResults(null);
                      }}
                    >
                      <option value="">Ignore column</option>
                      {targets.map((k) => (
                        <option key={k} value={k}>
                          {columnLabel(k)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </details>
            {(missing.length > 0 || duplicates) && (
              <div className="note compact">
                <Info size={17} />
                <p>
                  {duplicates
                    ? "Multiple columns map to the same field. Resolve these mappings."
                    : `Match these required columns before running: ${missing.map(columnLabel).join(", ")}.`}
                </p>
              </div>
            )}
            <details className="workflow-details">
              <summary>Review or edit rows</summary>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      {file.columns.map((c: string) => (
                        <th key={c}>
                          {c}
                          <small>
                            {targets.includes(mapping[c])
                              ? columnLabel(mapping[c])
                              : "Ignored"}
                          </small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(page * 10, page * 10 + 10).map((r, i) => (
                      <tr key={page * 10 + i}>
                        <td>{page * 10 + i + 1}</td>
                        {file.columns.map((c: string) => (
                          <td key={c}>
                            {fields.find((f) => f.key === mapping[c])
                              ?.options ? (
                              <select
                                aria-label={`Row ${page * 10 + i + 1} ${fieldLabel(mapping[c])}`}
                                value={String(
                                  parseMeasurement(mapping[c], r[c]) ?? "",
                                )}
                                className={
                                  invalidCell(mapping[c], r[c]) ? "invalid" : ""
                                }
                                onChange={(e) => {
                                  const next = [...rows];
                                  next[page * 10 + i] = {
                                    ...r,
                                    [c]: e.target.value,
                                  };
                                  setRows(next);
                                  setResults(null);
                                  setConfirmed(false);
                                }}
                              >
                                <option value="">Not provided</option>
                                {!fields
                                  .find((f) => f.key === mapping[c])
                                  ?.options?.some(
                                    (o) =>
                                      o.value ===
                                      Number(
                                        parseMeasurement(mapping[c], r[c]),
                                      ),
                                  ) &&
                                  r[c] !== "" &&
                                  r[c] != null && (
                                    <option value={String(r[c])}>
                                      Unrecognized value: {String(r[c])}
                                    </option>
                                  )}
                                {fields
                                  .find((f) => f.key === mapping[c])
                                  ?.options?.map((o) => (
                                    <option value={o.value} key={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <input
                                aria-label={`Row ${page * 10 + i + 1} ${fieldLabel(mapping[c] || c)}`}
                                className={
                                  mapping[c] && invalidCell(mapping[c], r[c])
                                    ? "invalid"
                                    : ""
                                }
                                value={r[c] ?? ""}
                                onChange={(e) => {
                                  const next = [...rows];
                                  next[page * 10 + i] = {
                                    ...r,
                                    [c]: e.target.value,
                                  };
                                  setRows(next);
                                  setResults(null);
                                  setConfirmed(false);
                                }}
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <Button
                  variant="outline"
                  disabled={!page}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span>
                  Page {page + 1} of {Math.ceil(rows.length / 10)}
                </span>
                <Button
                  variant="outline"
                  disabled={(page + 1) * 10 >= rows.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </details>
            <div className="units-box">
              <p>
                {predictionMode
                  ? "Use years for age, mmHg for blood pressure, mg/dL for cholesterol, and bpm for maximum exercise heart rate."
                  : "Use bpm for resting pulse, mmHg for blood pressure, and mg/dL for cholesterol. Include a time zone with each date and time."}
              </p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                {predictionMode
                  ? "I checked the columns and units."
                  : "I checked the columns and units. These readings are for one person."}
              </label>
            </div>
            <Button
              onClick={run}
              disabled={!confirmed || duplicates || missing.length > 0 || busy}
            >
              {busy ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <Activity size={16} />
              )}
              {predictionMode ? "Run batch assessment" : "Analyze readings"}
            </Button>
          </fieldset>
        </Card>
      )}
      {results?.monitoring && (
        <Card>
          <h3 ref={resultsHeading} tabIndex={-1}>
            {results.count} readings analyzed
          </h3>
          <p>
            These observations are held in session memory. Open the timeline to
            inspect them and optionally save with consent.
          </p>
          <Button asChild>
            <Link href="/history">
              Open health timeline
              <ArrowRight size={16} />
            </Link>
          </Button>
        </Card>
      )}
      {results?.results && (
        <Card>
          <div className="card-heading">
            <div>
              <h3 ref={resultsHeading} tabIndex={-1}>
                Batch results
              </h3>
              <p>
                {results.eligible} of {results.total} rows scored.{" "}
                {results.total - results.eligible > 0 &&
                  `${results.total - results.eligible} need corrections.`}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                download(
                  csv(
                    results.results.map((r: any) => ({
                      row: r.row,
                      eligible: r.eligible,
                      disease_pattern_score: r.result
                        ? diseaseScore(r.result)
                        : undefined,
                      label: r.result?.label,
                      model_version: r.result?.model_version,
                      errors: r.errors
                        .map((e: any) => `${fieldLabel(e.field)}: ${e.message}`)
                        .join("; "),
                    })),
                  ),
                  "cardiolens-batch-results.csv",
                )
              }
            >
              <Download size={15} />
              Export CSV
            </Button>
          </div>
          <div className="row">
            <label className="search-input">
              <Search size={16} />
              <input
                placeholder="Search batch results"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <Button variant="outline" onClick={() => setSort(!sort)}>
              Sort {sort ? "by row" : "by score"}
            </Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Disease-present score</th>
                  <th>Dataset label / validation errors</th>
                </tr>
              </thead>
              <tbody>
                {displayResults.map((r: any) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>
                      <span className={`badge ${r.eligible ? "" : "warning"}`}>
                        {r.eligible ? "Scored" : "Needs review"}
                      </span>
                    </td>
                    <td>
                      {r.result
                        ? `${(diseaseScore(r.result) * 10).toFixed(2)} / 10`
                        : "—"}
                    </td>
                    <td>
                      {r.result?.label ||
                        r.errors
                          .map(
                            (e: any) => `${fieldLabel(e.field)}: ${e.message}`,
                          )
                          .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="caption">
            Experimental label predictions. Scores do not represent clinically
            validated future event probabilities.
          </p>
        </Card>
      )}
    </>
  );
}
function HistoryPage() {
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
    if (temporary) {
      setAnalysis(temporary.analysis);
      return;
    }
    if (history.data)
      post("/history/analyze", {})
        .then(setAnalysis)
        .catch((e) => setError(e.message));
  }, [history.data, temporary]);
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
    for (const k of ["heart_rate", "systolic", "diastolic", "cholesterol"])
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
          "Measurement analyzed in session memory. It has not been saved.",
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
            <strong>Unsaved session measurements</strong>
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
              ].map(([key, label, min, max]) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <input
                    name={String(key)}
                    type="number"
                    min={Number(min)}
                    max={Number(max)}
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
                ? "Unsaved session records"
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
                  style={{ background: r.state ? "#f48a71" : "#198d86" }}
                  aria-label={`${new Date(r.time).toLocaleDateString()}: ${r.label}`}
                  title={`${new Date(r.time).toLocaleDateString()}: ${r.label}`}
                  onClick={() =>
                    setMessage(
                      `${new Date(r.time).toLocaleString()}: ${r.label}`,
                    )
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
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Heart rate</th>
                  <th>Systolic</th>
                  <th>Diastolic</th>
                  <th>Cholesterol</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any, i: number) => (
                  <tr key={i}>
                    <td>{new Date(r.timestamp).toLocaleString()}</td>
                    {["heart_rate", "systolic", "diastolic", "cholesterol"].map(
                      (k) => (
                        <td key={k}>
                          {r[k] ?? (
                            <span className="missing">Not recorded</span>
                          )}
                        </td>
                      ),
                    )}
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
function Models() {
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
      <div className="note">
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
        <div className="table-wrap">
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
          <div className="table-wrap">
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
        <h3>Dataset audit</h3>
        {info.data && (
          <div className="grid four">
            <Stat
              title="Source rows"
              value={info.data.dataset.raw_rows}
              sub="User-provided CSV"
              icon={Database}
            />
            <Stat
              title="Duplicate removed"
              value={info.data.dataset.duplicates_removed}
              sub="Before splitting"
              icon={Check}
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
function Insights() {
  const distribution = useResource("/distributions");
  const global = useResource("/global-importance");
  const [feature, setFeature] = useState("age");
  const { latest } = useSession();
  return (
    <>
      <div className="grid two">
        <Card>
          <span className="overline">EXPLORE THE SOURCE DATA</span>
          <div className="card-heading">
            <h3>Measurement distributions</h3>
            <select
              aria-label="Select distribution feature"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
            >
              {fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          {distribution.data ? (
            <Distribution
              data={distribution.data.distributions[feature]}
              feature={feature}
            />
          ) : distribution.error ? (
            <ErrorBox message={distribution.error} />
          ) : (
            <Loading />
          )}
          <p className="caption">
            302 unique source records. Counts describe this dataset’s
            composition; they do not define a healthy range.
          </p>
        </Card>
        <Card>
          <span className="overline">A BROADER PERSPECTIVE</span>
          <h3>Global model sensitivity</h3>
          {global.data ? (
            <>
              <Contributions data={global.data.features} absolute />
              <p className="caption">{global.data.method}</p>
            </>
          ) : global.error ? (
            <ErrorBox message={global.error} />
          ) : (
            <Loading />
          )}
        </Card>
      </div>
      <Card>
        <div className="card-heading">
          <h3>Your individual explanation</h3>
          <span className="badge">Relative to development references</span>
        </div>
        {latest ? (
          <>
            <Contributions data={latest.explanation.features} />
            <p className="caption">
              Individual contributions differ from global sensitivity. These
              describe one supplied record and are not proven causes.
            </p>
          </>
        ) : (
          <Empty
            title="A result with the reasoning in view"
            text="Complete an assessment to explore which supplied features pushed its score toward either dataset label."
            href="/predict"
            label="Run assessment"
          />
        )}
      </Card>
      <Card>
        <span className="overline">DATASET RELATIONSHIPS</span>
        <h3>Correlations with {fieldLabel(feature)}</h3>
        <p>
          Choose a feature in the distribution chart above. These Pearson
          correlations describe numerical representations of categories and
          recorded measurements in this dataset. Category correlations depend on
          how the groups are represented and do not establish clinical
          relationships or causes.
        </p>
        {distribution.data && (
          <div className="correlation-grid">
            {Object.entries(distribution.data.correlation[feature])
              .filter(([k]) => k !== feature)
              .map(([k, v]) => (
                <div key={k}>
                  <span>{fieldLabel(k)}</span>
                  <strong
                    style={{
                      color: Number(v) >= 0 ? "var(--teal)" : "var(--coral)",
                    }}
                  >
                    {Number(v).toFixed(2)}
                  </strong>
                  <progress max={1} value={Math.abs(Number(v))} />
                </div>
              ))}
          </div>
        )}
      </Card>
      <Card>
        <span className="overline">KNOW YOUR MEASUREMENTS</span>
        <h3>A guide to the inputs</h3>
        <div className="definitions">
          {fields.map((f) => (
            <details key={f.key}>
              <summary>
                {f.label}
                <span>{f.unit || "report finding"}</span>
              </summary>
              <p>{f.help}</p>
              <p className="caption">
                {f.options
                  ? `Available choices: ${f.options
                      .filter((o) => o.supported)
                      .map((o) => o.label)
                      .join("; ")}.`
                  : `Supported range: ${f.min}–${f.max} ${f.unit}.`}{" "}
                Unknown or missing measurements cannot be guessed.
              </p>
            </details>
          ))}
        </div>
      </Card>
      <div className="grid three">
        {[
          [
            "A score is not a diagnosis",
            "The model estimates a dataset class. Its output is not a validated chance of a future heart attack or disease event.",
          ],
          [
            "Correlation is not a treatment plan",
            "Feature sensitivity and hypothetical input changes do not establish cause and effect.",
          ],
          [
            "Uncertainty stays in the picture",
            "Category labels have been verified against the source, but the small dataset and lack of external validation limit generalization.",
          ],
        ].map(([h, p]) => (
          <Card key={h}>
            <span className="tile-icon">
              <Lightbulb size={20} />
            </span>
            <h3>{h}</h3>
            <p>{p}</p>
          </Card>
        ))}
      </div>
      <div className="note symptom-note">
        <AlertCircle size={22} />
        <div>
          <strong>Symptoms take priority over an app result.</strong>
          <p>
            Persistent chest pain or significant shortness of breath needs
            urgent medical evaluation. Do not wait for a model prediction.
          </p>
        </div>
      </div>
    </>
  );
}
function Reports() {
  const { latest } = useSession();
  return (
    <div className="grid prediction-grid">
      <Card>
        <span className="overline">ASSESSMENT REPORT</span>
        <h2>Export your latest assessment</h2>
        {latest?.demonstration && (
          <div className="demo-banner">
            Dataset demonstration — not your personal record.
          </div>
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
              <span className="overline">EXPERIMENTAL ASSESSMENT</span>
              <h3>{latest.label}</h3>
              <p>{new Date(latest.timestamp).toLocaleString()}</p>
              <div className="grid two">
                <div>
                  <small>Disease-present class score</small>
                  <h2>{(diseaseScore(latest) * 10).toFixed(2)} / 10</h2>
                </div>
                <div>
                  <small>Input completeness</small>
                  <h2>13 / 13</h2>
                </div>
              </div>
              <p className="caption">
                Not a medical diagnosis. Not a future cardiovascular event
                probability.
              </p>
            </div>
            <ReportButton
              measurements={latest.measurements}
              demonstration={latest.demonstration}
            />
          </>
        ) : (
          <Empty
            title="Your first report is one assessment away"
            text="A report is generated from your completed assessment, using the real trained model."
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
function About() {
  const info = useResource("/model-info");
  return (
    <>
      <div className="overview-banner">
        <div>
          <span className="pill">RESEARCH, IN THE OPEN</span>
          <h2>
            Useful insight.
            <br />
            Honest boundaries.
          </h2>
          <p>
            A local learning platform for exploring machine learning and
            recorded heart-health measurements.
          </p>
        </div>
        <div className="banner-wave">
          <ShieldCheck size={90} strokeWidth={1} />
        </div>
      </div>
      <div className="grid two">
        <Card>
          <h3>Where the data comes from</h3>
          <p>
            The supplied heart.csv contains 303 records, 13 input features, and
            a binary target. It contains 165 positive and 138 negative labels,
            no missing cells, and one exact duplicate removed before splitting.
          </p>
          <p>
            Category labels were verified by matching all supplied records to
            the primary UCI Cleveland reference. Missing vessel and stress-test
            entries are shown as “Not available” and cannot be used for a new
            assessment. The source outcome labels are reversed relative to the
            earlier display: the positive model class represents no recorded
            disease. Results now describe the correct dataset pattern; they
            remain experimental and cannot diagnose you.
          </p>
          <p className="caption">
            SHA-256:{" "}
            <span className="hash">
              {info.data?.dataset.sha256 ||
                "Connect backend to view fingerprint"}
            </span>
          </p>
        </Card>
        <Card>
          <h3>How models are compared</h3>
          <p>
            Stratified splitting reserves 20% of unique rows. All imputation,
            scaling, spline transformations, and category encoding occur within
            training pipelines. Nested cross-validation compares six classifier
            families and calibrated voting.
          </p>
          <p>
            The additive model transforms each continuous feature separately,
            without introducing interaction terms. Voting weights use
            predictions made out of fold inside each training fit.
          </p>
          <Link className="text-link" href="/models">
            Inspect measured performance
            <ArrowUpRight size={16} />
          </Link>
        </Card>
        <Card>
          <h3>Privacy in the local version</h3>
          <p>
            No authentication is included. This app is designed for one local
            workspace, bound to the loopback interface. Anyone with access to
            the running local app can access its saved history.
          </p>
          <p>
            Assessment inputs and upload previews remain in session memory.
            History is written to SQLite only after explicit storage consent,
            and can be deleted from the timeline. The theme preference is the
            only browser local-storage setting.
          </p>
          <p>
            Uploaded files are parsed in memory and are not saved. No health
            measurements are intentionally written to request logs. Downloads
            are saved by your browser.
          </p>
        </Card>
        <Card>
          <h3>What remains experimental</h3>
          <p>
            No external clinical validation, treatment recommendation, future
            event prediction, or guarantee of generalization is provided. Scores
            refer to a small dataset’s binary labels.
          </p>
          <p>
            HMM states describe learned repeated-measurement patterns, not
            disease stages. At least 30 complete, approximately regularly spaced
            observations are required. Kalman filtering only smooths recorded
            trends.
          </p>
          <p>
            The Model laboratory shows approximate BIC weights for two logistic
            specifications. The synthetic timeline is separate from the static
            classifier’s training dataset.
          </p>
        </Card>
      </div>
      <Card>
        <h3>Technical references</h3>
        <p>
          <a
            className="text-link"
            href="https://scikit-learn.org/stable/modules/calibration.html"
            target="_blank"
            rel="noreferrer"
          >
            scikit-learn probability calibration
            <ArrowUpRight size={14} />
          </a>
        </p>
        <p>
          <a
            className="text-link"
            href="https://hmmlearn.readthedocs.io/en/stable/tutorial.html"
            target="_blank"
            rel="noreferrer"
          >
            hmmlearn sequence-model documentation
            <ArrowUpRight size={14} />
          </a>
        </p>
        <p>
          <a
            className="text-link"
            href="https://www.nhs.uk/conditions/chest-pain/"
            target="_blank"
            rel="noreferrer"
          >
            NHS chest-pain guidance
            <ArrowUpRight size={14} />
          </a>
        </p>
      </Card>
      <ErrorBox message={info.error} />
    </>
  );
}
