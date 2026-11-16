import { useState } from "react";
import { Lightbulb, AlertCircle } from "lucide-react";
import { Distribution, Contributions } from "@/components/charts";
import { useSession } from "@/components/provider";
import { fields, fieldLabel } from "@/lib/api";
import { Card, ErrorBox, Empty, Loading } from "./shared";
import { useResource } from "./useResource";

export function InsightsSection() {
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
        {latest?.explanation ? (
          <>
            {latest.synthetic && (
              <div className="demo-banner">Model demonstration</div>
            )}
            <Contributions
              data={latest.explanation.features}
              scoreName={
                latest.synthetic ? "simulated-pattern score" : undefined
              }
            />
            <p className="caption">
              {latest.synthetic
                ? "These contributions describe the latest simulated assessment."
                : "Individual contributions differ from global sensitivity. These describe one supplied record and are not proven causes."}
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
