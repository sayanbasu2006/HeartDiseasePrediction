"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  FileCheck2,
  Database,
  History,
  Layers,
  FlaskConical,
  Check,
  Info,
} from "lucide-react";
import { api, fields } from "@/lib/api";
import { homeCopy } from "@/lib/presentation";
type Evidence = {
  holdout: { accuracy: number; roc_auc: number; n: number; name: string };
};
export function Landing() {
  const [metrics, setMetrics] = useState<Evidence | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    api("/metrics")
      .then((data) => {
        if (active) setMetrics(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <>
      <section className="editorial-hero" aria-labelledby="landing-title">
        <div className="hero-copy">
          <span className="eyebrow">{homeCopy.eyebrow}</span>
          <h1 id="landing-title">
            A clearer perspective on <em>cardiovascular health.</em>
          </h1>
          <p className="hero-description">{homeCopy.description}</p>
          <div className="hero-actions">
            <Link href="/predict" className="button primary">
              Begin Health Assessment <ArrowRight size={18} />
            </Link>
            <Link href="/models" className="text-link">
              Explore the Research <ArrowUpRight size={16} />
            </Link>
          </div>
          <p className="hero-disclaimer">
            <FlaskConical size={17} /> Research use only. Not a diagnosis or a
            future event risk estimate.
          </p>
        </div>
        <div className="hero-evidence">
          <div className="architectural-motif" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <section className="evidence-panel" aria-labelledby="evidence-title">
            <div className="evidence-top">
              <span className="overline">RESEARCH SNAPSHOT</span>
              <FlaskConical size={20} />
            </div>
            <h2 id="evidence-title">Evidence, with perspective.</h2>
            <p>Selected-model evaluation on reserved source-dataset records.</p>
            <div
              className="evidence-metrics"
              aria-live="polite"
              aria-busy={!metrics && !error}
            >
              <div>
                <strong>
                  {metrics
                    ? `${(metrics.holdout.accuracy * 100).toFixed(1)}%`
                    : "—"}
                </strong>
                <span>Holdout accuracy</span>
              </div>
              <div>
                <strong>
                  {metrics ? metrics.holdout.roc_auc.toFixed(3) : "—"}
                </strong>
                <span>ROC-AUC</span>
              </div>
            </div>
            <div className="evidence-records">
              <Database size={16} />
              <span>
                {metrics
                  ? `${metrics.holdout.n} held-out records`
                  : error
                    ? "Evaluation service unavailable"
                    : "Loading evaluation data…"}
              </span>
              <span className="evidence-rule" />
            </div>
            <p className="evidence-boundary">
              Small research dataset. No independent clinical validation. These
              results do not establish accuracy for the Indian population.
            </p>
            <Link href="/models">
              Review methodology <ArrowUpRight size={16} />
            </Link>
          </section>
          <div className="evidence-caption">
            <span className="caption-line" />
            Transparent methods. Interpretable outputs.
          </div>
        </div>
      </section>
      <div className="principles-strip">
        <span>
          <FileCheck2 size={18} /> 13 required clinical inputs
        </span>
        <span>
          <Layers size={18} /> Interpretable model contributions
        </span>
        <span>
          <Database size={18} /> History saved only with consent
        </span>
      </div>
      <section className="home-section" aria-labelledby="how-title">
        <div className="editorial-heading">
          <div>
            <span className="eyebrow">01 / THE ASSESSMENT</span>
            <h2 id="how-title">
              A clear path from records
              <br />
              to research insight.
            </h2>
          </div>
          <p>
            Four considered steps. Your clinical record stays at the centre of
            the process.
          </p>
        </div>
        <ol className="process-grid">
          {homeCopy.steps.map((step, i) => (
            <li key={step.title}>
              <span className="process-number">0{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section
        className="home-section indicators-section"
        aria-labelledby="indicators-title"
      >
        <div className="editorial-heading">
          <div>
            <span className="eyebrow">02 / KNOW YOUR RECORD</span>
            <h2 id="indicators-title">Understanding your indicators.</h2>
          </div>
          <Link className="text-link" href="/insights">
            All measurement definitions <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="indicator-grid">
          {["trestbps", "chol", "thalach", "fbs"].map((key, i) => {
            const field = fields.find((f) => f.key === key)!;
            return (
              <article key={key}>
                <span className="indicator-index">
                  0{i + 1} <Activity size={17} />
                </span>
                <span className="indicator-unit">
                  {field.unit || "Recorded test indicator"}
                </span>
                <h3>
                  {key === "fbs"
                    ? "Fasting blood sugar indicator"
                    : field.label}
                </h3>
                <p>{field.help}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section
        className="research-editorial"
        aria-labelledby="transparency-title"
      >
        <div>
          <span className="eyebrow">03 / RESEARCH & TRANSPARENCY</span>
          <h2 id="transparency-title">
            Trust begins with
            <br />
            knowing the limits.
          </h2>
          <p>
            CardioLens explores patterns in a small, verified source dataset.
            Its classification output is a research finding, never a medical
            diagnosis.
          </p>
          <Link href="/about" className="button secondary">
            Read our research approach <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="research-principles">
          {[
            [
              "Documented evaluation",
              "Nested cross-validation for model selection, followed by evaluation of the selected model on an untouched holdout.",
            ],
            [
              "Explanations in context",
              "Feature contributions describe changes in a model score. They are not evidence of cause, treatment effect, or future risk.",
            ],
            [
              "An honest scope",
              "No independent clinical validation, including in India. No certification, hospital endorsement, or medical association affiliation.",
            ],
          ].map(([title, text]) => (
            <article key={title}>
              <Check size={19} />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="home-section" aria-labelledby="tools-title">
        <div className="editorial-heading">
          <div>
            <span className="eyebrow">04 / YOUR RESEARCH WORKSPACE</span>
            <h2 id="tools-title">One record. Many perspectives.</h2>
          </div>
          <p>
            Tools for exploring clinical measurements, individually and over
            time.
          </p>
        </div>
        <div className="tool-grid">
          {[
            {
              title: "Health assessment",
              text: "A guided clinical record, a transparent research result.",
              href: "/predict",
              icon: FileCheck2,
            },
            {
              title: "Batch analysis",
              text: "Map, validate, and assess CSV or JSON records.",
              href: "/upload",
              icon: Database,
            },
            {
              title: "Measurement trends",
              text: "Explore recorded readings with honest gaps and context.",
              href: "/history",
              icon: History,
            },
            {
              title: "Model evaluation",
              text: "Inspect the data, comparisons, and measured performance.",
              href: "/models",
              icon: Layers,
            },
          ].map((tool) => (
            <Link className="tool-card" key={tool.href} href={tool.href}>
              <tool.icon size={24} strokeWidth={1.5} />
              <h3>{tool.title}</h3>
              <p>{tool.text}</p>
              <span>
                Explore tool <ArrowUpRight size={17} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="final-invitation">
        <div>
          <span className="eyebrow">START WITH WHAT YOU KNOW</span>
          <h2>
            Bring your records.
            <br />
            Explore with perspective.
          </h2>
          <p>Have all 13 clinical measurements and findings ready.</p>
        </div>
        <div>
          <Link href="/predict" className="button primary">
            Begin Health Assessment <ArrowRight size={18} />
          </Link>
          <span>
            <Info size={15} /> For education and research only.
          </span>
        </div>
      </section>
    </>
  );
}
