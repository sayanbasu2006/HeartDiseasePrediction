# CardioLens AI

A new local web application with a Next.js / React frontend and a FastAPI machine-learning backend. The former CardioScope Qt desktop application, Mac bundle, launchers, old source, and old artifacts have been removed from this workspace. A recovery archive was created at `/private/tmp/cardioscope-before-cardiolens-20261103.tar.gz`; temporary storage may be cleared by the OS. The supplied original CSV remains unchanged at its Downloads location and is copied to `backend/data/heart.csv`.

This is an educational research platform, not a diagnosis, treatment tool, or clinically validated cardiovascular event risk calculator. Feature and outcome meanings were verified against the primary UCI Cleveland reference by matching all 303 supplied rows. The app uses plain-language choices and preserves numeric model inputs internally. The saved positive class (`target=1`) corresponds to no recorded disease in the source; `target=0` corresponds to disease present. Results now describe these source dataset patterns and cannot diagnose a person.

## Run locally

Python 3.12 and Node.js 20.9+ are required. The included artifacts were trained with scikit-learn 1.5.2. Use only trusted joblib files.

From this project folder:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements-lock.txt
cd frontend
npm ci
cd ..
```

The current workspace already has installed dependencies and a trained model. Start FastAPI in one terminal:

```bash
cd "/Users/sayanbasu/Downloads/Machine Learning Project"
source .venv/bin/activate
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python -m uvicorn backend.api.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Start Next.js in a second terminal:

```bash
cd "/Users/sayanbasu/Downloads/Machine Learning Project/frontend"
npm run dev
```

Open [CardioLens AI](http://127.0.0.1:3000). API schema: [FastAPI docs](http://127.0.0.1:8000/docs). For production compilation locally, run `npm run build` then `npm run start` inside `frontend`. Webpack is selected because Turbopack attempted a restricted process/port operation in the execution environment.

`.env.example` documents configuration. Next uses `frontend/.env.local`; backend settings must be exported in the shell. Defaults work without configuration. Backend requests go through Next’s `/api` rewrite, with no client-side backend URL. Changing `BACKEND_URL` requires restarting development or rebuilding production.

## Dataset and training

The actual source CSV contains 303 rows, 14 columns, 165 positive labels, 138 negative labels, no missing cells, and one duplicate. Five records contain `ca=4`; two contain `thal=0`. The source comparison shows these are missing-value markers (`ca=4`, `thal=0`). Historical training artifacts retain them, but new assessments abstain when either test is unavailable. `fbs` is a binary indicator, never a glucose concentration. All 13 fields are required at inference; no missing clinical tests are fabricated.

Put an alternative verified file with the exact schema at `backend/data/heart.csv`. To train a new experiment:

```bash
source .venv/bin/activate
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python -m backend.ml.train --out backend/artifacts-new
```

The default is `python -m backend.ml.train` for an empty `backend/artifacts` directory. The script refuses to overwrite a completed experiment, to discourage repeated inspection of the holdout. Review a new experiment scientifically before replacing the runtime artifact directory and restarting FastAPI. Changing datasets or environments requires training compatible artifacts. Do not select seeds, methods, or experiments by repeatedly checking holdout performance.

The training pipeline:

1. Validates column order and categories; removes exact duplicates before any splitting.
2. Uses a fixed stratified split: 241 development and 61 holdout records.
3. Compares logistic regression, CART, random forest, AdaBoost, gradient boosting, a spline additive logistic model, and calibrated OOF voting.
4. Uses four outer stratified folds and three inner folds for Brier-loss parameter selection. Imputation, scaling, and encoding stay inside pipelines. Sigmoid calibration uses inner training folds only.
5. Learns voting weights from OOF predictions **inside each fit**, so outer validation records are excluded from all weight and calibration fitting.
6. Selects using the prespecified utility `OOF AUC - 0.5 * OOF Brier + 0.1 * OOF recall` at threshold 0.5. This is an educational utility choice, not an established clinical objective.
7. Fits the selected model on development data, then evaluates that model once on the holdout. Other models’ displayed curves are development OOF curves.
8. Saves the model, development reference records, split audit, metrics, calibration/ROC/PR data, distributions, predictions, and metadata.

The additive model uses univariate splines on continuous features; its design matrix adds their effects without explicit feature interactions. A separate unpenalized logistic BIC evidence approximation is saved for research transparency. It is not ordinary voting and is excluded from primary prediction.

## Measured results

The selected model is **Calibrated OOF voting**, artifact version `1.0-704438dd0d`.

| Selected-model holdout metric | Value |
| --- | ---: |
| Accuracy | 0.8033 |
| Precision | 0.7692 |
| Recall of no-disease class (saved positive class) | 0.9091 |
| Recall of disease-present class (saved specificity) | 0.6786 |
| F1 | 0.8333 |
| ROC-AUC | 0.8950 |
| Brier score | 0.1367 |
| ECE (5 fixed bins) | 0.0852 |

Confusion matrix, rows actual and columns predicted: `[[19, 9], [3, 30]]`. These are 61 observations, with substantial statistical uncertainty and no external cohort validation. The matrix rows/columns use the saved order: disease-present, then no-disease. Thus 9 disease-present rows were predicted as no disease, while 3 no-disease rows were predicted as disease present. Earlier heart-disease-positive wording was incorrect and has been corrected; the scores, fitted models and evaluation artifacts are unchanged. All displayed performance comes from `backend/artifacts/metrics.json`. Calibration adequacy is an exploratory development OOF check (ECE <= 0.10 and Brier below prevalence baseline), not a clinical validation claim.

## Demonstrate the application

- `/`: responsive landing page, animated ECG / heart, local privacy context.
- `/dashboard`: real session assessment, stored measurement summaries and trends, session uploads. Empty states appear when there is no data. Completed assessment activity is kept in session memory; it is not a persistent assessment archive.
- `/predict`: four-step required-input form. For a presentation, explicitly click **Load dataset example**. The record overlaps source training data and is clearly labeled; it must not be presented as evidence of generalization. Review then run the actual API. Explanation contributions are approximate interventional Shapley values, with a deterministic seed and score-space additivity. Hybrid background records can be unrealistic because of correlations.
- On a result, change sliders in **What if?**; debounced requests compute real hypothetical model outputs. Reset restores the supplied record. No causal or treatment claim is made.
- `/upload`: drop CSV/JSON, select prediction or monitoring mode, confirm editable column mappings and units, edit preview cells, then analyze. All 1,000 allowed records can be reviewed in ten-row pages. Missing and out-of-range cells are highlighted; backend validation is authoritative. Eligible batch records receive predictions; unsupported records receive errors. Search, sort, and export results as CSV. The template contains readable measurement headers only, so no patient measurements are invented. Category columns accept plain-language values such as Male, Female, Yes, Typical angina and Normal ECG. Original numeric inputs remain supported internally, except verified missing-test markers, which now cause abstention.
- For monitoring uploads, use `timestamp` (ISO 8601 with timezone), optional `heart_rate`, `systolic`, `diastolic`, `cholesterol`. Blank unmeasured fields remain absent. Resting heart rate never substitutes for `thalach`. Records initially remain in session memory; save from the timeline only with consent.
- `/history`: add timestamped observations, opt in to SQLite storage or analyze without saving, filter dates, hover/brush plots, choose measurements, export records, and delete stored data. Missing readings are explicitly marked. Click **Explore sample timeline** for 60 clearly labeled synthetic observations. This data is never saved or used for static classifier training.
- Temporal fitting requires 30 paired heart-rate/systolic observations, distinct timestamps and approximately regular intervals within 35% of the median interval, meaningful variation, convergence and occupancy checks. Gaussian HMM parameters use EM; log-domain forward/backward and Viterbi are implemented explicitly and tested against enumeration. States describe measurement patterns only. Kalman process variance scales with elapsed days and shows raw observations, filtered trends, and estimate variability in tooltips. Neither temporal method forecasts medical events.
- `/insights`: source distributions, correlations, global permutation sensitivity, latest individual explanation, definitions, and interpretation guidance. Global sensitivity uses 20 development reference rows; it is descriptive and not held-out feature importance. Numeric correlations of arbitrary category codes require particular caution.
- `/models`: nested OOF comparisons, selected model, ROC/PR/calibration curves, holdout confusion matrix, variability, research-only BIC weights, dataset audit.
- `/reports`: export the latest assessment as a two-page PDF with submitted values, version, explanation, and limitations. The report is generated on request by re-running the same deterministic model; its timestamp is the report assessment time. No identifying information is requested. Batch CSV exports stay on the upload page.
- `/about`: data provenance, methods, privacy, limitations, and technical references. Dark mode is the default. A chosen light/dark theme is stored as a browser preference and applied before page paint. The updated interface uses frosted navigation surfaces, larger type, stronger contrast, and tablet/phone reflow. Reduced-motion CSS disables decorative animation.

## API

`GET /api/health`, `/api/model-info`, `/api/metrics`, `/api/distributions`, `/api/global-importance`, `/api/template`, `/api/example`.

`POST /api/predict`, `/api/predict/batch`, `/api/upload/validate`, `/api/explain`, `/api/report`, `/api/history/measurements`, `/api/history/analyze`.

`GET /api/history/measurements`, `DELETE /api/history/measurements`.

Typed clinical/history requests reject missing, extra, out-of-range, nonfinite, and unsupported category values. Request errors omit input values. Model unavailability returns 503. Uploads use UTF-8 CSV/JSON, bounded request size, no execution, no stored uploaded paths, and scalar cells. Backend validation happens again for every batch record. Mappings and units are explicitly reviewed in the frontend; clients calling the API directly must supply the documented units. File parsing never infers missing medical measurements.

## Verification

```bash
cd "/Users/sayanbasu/Downloads/Machine Learning Project"
source .venv/bin/activate
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python -m pytest backend/tests -q
cd frontend
npm run typecheck
npm run build
```

Tests cover actual dataset parsing/deduplication, feature consistency, auditable partition isolation and pipeline nesting, artifact loading, input rejection, upload parsing/mapping, batch abstention, consent, timestamp ordering/deletion, HMM forward/backward normalization and Viterbi versus a known enumerated case, long-sequence underflow resistance, irregular-series rejection, demo isolation, elapsed-time-aware Kalman smoothing, report PDF parsing, origin checks, and missing-artifact behavior. Frontend flow and responsive layout are additionally checked in a browser. These tests are engineering checks, not proof of clinical validity.

## Structure

```text
backend/
  api/          FastAPI routes and bounded request handling
  ml/           Data audit, training, models, temporal algorithms
  schemas/      Required clinical fields and measurement contracts
  services/     Inference, explanations, upload parsing, PDF generation
  database/     Consent-driven SQLAlchemy / SQLite history
  data/         Exact supplied CSV
  artifacts/    Generated model and actual evaluation data
  tests/        Scientific and API integration checks
frontend/
  app/          Next.js App Router pages, responsive light/dark styles
  components/   Shared workspace, shadcn-style Radix Button, charts, session provider
  lib/          Typed field definitions, API, safe CSV exports
```

The frontend uses React Hook Form, Zod, Dropzone, Recharts, Lucide, Tailwind and a Radix/CVA button component following shadcn conventions. CSS handles microinteractions, reduced-motion behavior, ECG and heart animations. Framer Motion is available for additional transitions; the current interface uses CSS animations.

## Docker

Optional local setup: `docker compose up --build`, then open `http://127.0.0.1:3000`. Docker binds only frontend port 3000 to loopback and stores consented history in a named volume. Saved model artifacts are copied into the backend image. Docker configuration is provided; container execution was not verified in this environment. Do not expose this unauthenticated local app publicly.

## Remaining limits

No login, multi-user separation, external clinical validation, external dataset-provenance verification, causal interpretation, persistent assessment archive, OCR, wearable integration, or reduced-feature classifier is included. Raw uploads and assessment inputs are ephemeral. Only consented measurement history is persistent; deletion removes active SQLite records but is not a forensic secure erasure guarantee. Current record history has no person identifier and must represent one individual when used for temporal analysis; do not combine multiple people’s readings. In-memory upload review must therefore be limited to a single individual for monitoring mode. Independent multi-patient complete clinical rows are supported for static batch classification.

The app and model are production-structured for local demonstration, not production clinical software. External exposure would require authentication, authorization, transport security, retention controls, operational monitoring, and independent model validation. The model is never silently retrained at startup, and no hardcoded scores substitute for an unavailable backend.

## Plain-language field labels and verified source meanings

The canonical category dictionary is `backend/schemas/fields.json`. Its generated frontend copy at `frontend/lib/fields.generated.json` is checked for equality in tests. Form choices, review values, upload previews, category charts, feature explanations and PDF reports all use these labels. Male/Female is the source sex field; Other / not listed and Prefer not to say are selectable but cannot be assessed because neither was represented in training. No unsupported choice is silently substituted.

The verification script matches the user CSV to the primary [UCI Heart Disease reference](https://archive.ics.uci.edu/dataset/45/heart+disease) on eight unchanged fields. It checks every transformed category against the original values. The row-level source reference, attribution and aggregate audit are in `backend/data/reference/` and `backend/data/category_mapping_audit.json`. No new training or holdout evaluation was performed for this UI change.

Non-obvious recodings include chest-pain typical angina → internal 3, normal resting ECG → internal 1, upward ST slope → internal 2, and normal thallium test → internal 2. Source missing values map to internal vessel value 4 or stress-test value 0. The API refuses those missing measurements at inference. Numeric encodings are implementation details; they are not shown as ordinary form choices.

The outcome audit also confirms that the saved model estimates the no-disease source class when its positive-class score is high. Model comparisons therefore label disease-class recall using the saved specificity (67.9%), and no-disease-class recall using the saved recall (90.9%). The original selection utility optimized saved positive-class recall, so its recall term favored no-disease-class detection. This is a retrospective research classifier and must not be used as a clinical screening tool.
