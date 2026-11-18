# CardioLens AI

A new local web application with a Next.js / React frontend and a FastAPI machine-learning backend. The former CardioScope Qt desktop application, Mac bundle, launchers, old source, and old artifacts have been removed from this workspace. A recovery archive was created at `/private/tmp/cardioscope-before-cardiolens-20261103.tar.gz`; temporary storage may be cleared by the OS. The working UCI Heart Disease dataset is in `backend/data/heart.csv`.

This is an educational research platform, not a diagnosis, treatment tool, or clinically validated cardiovascular event risk calculator. Feature and outcome meanings were verified against the primary UCI Heart Disease reference by matching all 303 supplied rows. The app uses plain-language choices and preserves numeric model inputs internally. The saved positive class (`target=1`) corresponds to no recorded disease in the source; `target=0` corresponds to disease present. Results now describe these source dataset patterns and cannot diagnose a person.

## Run locally

Python 3.12 and Node.js 20.9+ are required.

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
cd "/Users/sayanbasu/Downloads/HeartDiseasePrediction"
source .venv/bin/activate
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python -m uvicorn backend.api.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Start Next.js in a second terminal:

```bash
cd "/Users/sayanbasu/Downloads/HeartDiseasePrediction/frontend"
npm run dev
```

Open [CardioLens AI](http://127.0.0.1:3000). API schema: [FastAPI docs](http://127.0.0.1:8000/docs). For production compilation locally, run `npm run build` then `npm run start` inside `frontend`. Webpack is selected because Turbopack attempted a restricted process/port operation in the execution environment.

`.env.example` documents configuration. Next uses `frontend/.env.local`; backend settings must be exported in the shell. Defaults work without configuration. Backend requests go through Next’s `/api` rewrite, with no client-side backend URL. Changing `BACKEND_URL` requires restarting development or rebuilding production.

## Dataset and training

A separate [100-person Annapurma Hospital Tamil Nadu demo](outputs/annapurma-tamil-100-20261119/DATASET_README.md) is available as CSV and Excel. It contains fictional people and generated measurements with all 14 inputs. It is not a real hospital cohort and is separate from the main model's training data.

The source CSV contains 303 rows, 165 positive labels, 138 negative labels, and one duplicate. The main model requires 14 inputs, including the visceral fat device index. Five records contain `ca=4`; two contain `thal=0`. These are missing-value markers. Training retains those historical records, while new assessments require supported findings. `fbs` indicates whether fasting blood sugar exceeded 120 mg/dL.

The main CSV carries a reproducible index in `visceral_fat` with `visceral_fat_source=generated`. All 14 features enter preprocessing, fitting, explanations, distributions and prediction. The original source fields and outcome retain their audited checksum. The model metadata records the generated index's provenance and the full training-file checksum. To regenerate those indices, run `python -m backend.ml.add_visceral_fat`.

Put an alternative verified file with the exact schema at `backend/data/heart.csv`. To train a new experiment:

```bash
source .venv/bin/activate
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python -m backend.ml.train --out backend/artifacts-new
```

The default is `python -m backend.ml.train` for an empty `backend/artifacts` directory. The script refuses to overwrite a completed experiment, to discourage repeated inspection of the holdout. Review a new experiment scientifically before replacing the runtime artifact directory and restarting FastAPI. Changing datasets or environments requires training compatible artifacts. Do not select seeds, methods, or experiments by repeatedly checking holdout performance.

### Visceral fat model demonstration

On `/predict`, choose **Explore the model demo**. Adjust the generated inputs, including the visceral-fat device index, and choose **Run model demo**. The result shows the simulated score, feature contributions, a visceral-fat slider, and a PDF with the data source.

The [generated CSV](backend/data/synthetic_visceral_fat.csv) contains 3,200 training records and 800 independently generated holdout records. A logistic regression model achieved **94.25% accuracy on the synthetic holdout**, compared with **74.75%** for the same model trained without visceral fat. The simulation explicitly uses visceral fat to generate the artificial labels. These figures measure how well the models reproduce that rule. The standard UCI Heart Disease assessment uses its own dataset, model, and evaluation.

Reproduce the synthetic dataset and model from the project root.

```bash
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python -m backend.ml.train_synthetic
```

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

The selected 14-input model is **Calibrated OOF voting**, artifact version `2.0-bb5ec8e04e`.

| Selected-model holdout metric | Value |
| --- | ---: |
| Accuracy | 0.8033 |
| Precision | 0.7838 |
| Recall of no-disease class | 0.8788 |
| Recall of disease-present class | 0.7143 |
| F1 | 0.8286 |
| ROC-AUC | 0.8918 |
| Brier score | 0.1394 |
| ECE (5 fixed bins) | 0.0690 |

The confusion matrix is `[[20, 8], [4, 29]]`, with rows actual and columns predicted in disease-present, then no-disease order. The evaluation uses the fixed 61-record holdout and includes the generated visceral-fat values. Calibration checks use development out-of-fold predictions.

## Demonstrate the application

- `/`: responsive landing page, animated ECG / heart, local privacy context.
- `/dashboard`: completed assessments, stored measurement summaries and trends, and reviewed uploads. Empty states appear when there is no data.
- `/predict`: four-step required-input form. For a presentation, explicitly click **Load example record**. The record overlaps source training data and is clearly labeled; it must not be presented as evidence of generalization. Review then run the actual API. Explanation contributions are approximate interventional Shapley values, with a deterministic seed and score-space additivity. Hybrid background records can be unrealistic because of correlations.
- On a result, change sliders in **What if?**; debounced requests compute real hypothetical model outputs. Reset restores the supplied record. No causal or treatment claim is made.
- `/upload`: drop CSV/JSON, select prediction or monitoring mode, confirm editable column mappings and units, edit preview cells, then analyze. All 1,000 allowed records can be reviewed in ten-row pages. Missing and out-of-range cells are highlighted; backend validation is authoritative. Eligible batch records receive predictions; unsupported records receive errors. Search, sort, and export results as CSV. The template contains readable measurement headers only, so no patient measurements are invented. Category columns accept plain-language values such as Male, Female, Yes, Typical angina and Normal ECG. Original numeric inputs remain supported internally, except verified missing-test markers, which now cause abstention.
- For monitoring uploads, use `timestamp` (ISO 8601 with timezone), optional `heart_rate`, `systolic`, `diastolic`, `cholesterol`, `visceral_fat`. Blank unmeasured fields remain absent. Resting heart rate never substitutes for `thalach`. Saving readings to measurement history requires separate consent on the timeline.
- `/history`: add timestamped observations, opt in to SQLite storage or analyze without saving, filter dates, hover/brush plots, choose measurements, export records, and delete stored data. Missing readings are explicitly marked. Click **Explore sample timeline** for 60 clearly labeled synthetic observations. This data is never saved or used for static classifier training.
- Temporal fitting requires at least 30 paired heart-rate/systolic observations, distinct timestamps, and gaps within 50% of the median interval. Fitting also checks variation, convergence, and state occupancy. Gaussian HMM parameters use EM; log-domain forward/backward and Viterbi are implemented explicitly and tested against enumeration. States describe measurement patterns only. Kalman process variance scales with elapsed days and shows raw observations, filtered trends, and estimate variability in tooltips. Neither temporal method forecasts medical events.
- `/insights`: source distributions, correlations, global permutation sensitivity, latest individual explanation, definitions, and interpretation guidance. Global sensitivity uses 20 development reference rows; it is descriptive and not held-out feature importance. Numeric correlations of arbitrary category codes require particular caution.
- `/models`: nested OOF comparisons, selected model, ROC/PR/calibration curves, holdout confusion matrix, variability, research-only BIC weights, dataset audit.
- `/reports`: export the latest assessment as a three-page PDF with submitted values, version, explanation, a dedicated visceral-fat comparison chart, and limitations. The report is generated on request by re-running the same deterministic model; its timestamp is the report assessment time. No identifying information is requested. Batch CSV exports stay on the upload page.
- `/about`: data provenance, methods, privacy, limitations, and technical references. Light mode is the default. The app restores the saved light or dark theme before the page renders. The workspace adapts to tablet and phone screens and respects reduced-motion preferences.
- **Save workspace data in this browser** keeps completed assessments, the current assessment draft, upload activity, the latest upload preview and mapping, and temporary timeline readings across refreshes. It is off by default. Drafts and previews remain available during navigation in the current tab. Turning browser saving off removes the stored copy. Uploaded records require confirmation of columns and units before each new analysis.

## API

`GET /api/health`, `/api/model-info`, `/api/metrics`, `/api/distributions`, `/api/global-importance`, `/api/template`, `/api/example`.

`POST /api/predict`, `/api/predict/batch`, `/api/upload/validate`, `/api/explain`, `/api/report`, `/api/history/measurements`, `/api/history/analyze`.

`GET /api/history/measurements`, `DELETE /api/history/measurements`.

Typed clinical/history requests reject missing, extra, out-of-range, nonfinite, and unsupported category values. Request errors omit input values. Model unavailability returns 503. Uploads use UTF-8 CSV/JSON, bounded request size, no execution, no stored uploaded paths, and scalar cells. Backend validation happens again for every batch record. Mappings and units are explicitly reviewed in the frontend; clients calling the API directly must supply the documented units. File parsing never infers missing medical measurements.

## Verification

```bash
cd "/Users/sayanbasu/Downloads/HeartDiseasePrediction"
source .venv/bin/activate
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python -m pytest backend/tests -q
cd frontend
npm test
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

The frontend uses React Hook Form, Zod, Dropzone, Recharts, Lucide, Tailwind and a Radix/CVA button component following shadcn conventions. The institutional interface uses restrained CSS transitions with reduced-motion support and no animated heart. Framer Motion remains available.

## CardioLens institutional interface

The homepage, navigation, four-step assessment, results, uploads, measurement history and research pages share a navy/ivory design system with restrained saffron geometry and teal actions. `frontend/app/clinical.css` defines the shared tokens and responsive presentation. `site-shell.tsx`, `landing.tsx` and `clinical-entry.tsx` provide reusable navigation, editorial sections and accessible clinical fields; `lib/presentation.ts` centralizes navigation, homepage copy and Indian date formatting for future localisation. Manrope and Inter are preferred font families with system fallbacks; remote font downloads are not required.

Assessment progress and review count all 14 required inputs. Visceral fat is required in the form, batch rows and report requests. Results include signed contributions for all 14 model inputs. Homepage evidence is fetched from the evaluation API.

Every prediction also includes a visceral-fat comparison: all other submitted inputs remain fixed while the index is replaced with the median of the model's development background records. Individual and simulated assessments show sampled model-response curves, paired score bars and percentage-point differences. Batch results and CSV exports include the index, reference and score difference; the dashboard and report preview show the same comparison. The third PDF page presents the dedicated chart and provenance. These comparisons describe the existing model's response to generated training indices, not a causal biological effect or personal medical risk. Device scales differ, and the app does not invent clinical cutoffs.

The redesign does not retrain the classifier, change its encodings or introduce clinical risk calculations. It retains the existing workflow and API contracts. See `docs/VERIFICATION.md` for checks and the limits of the current browser verification.

## Docker

Optional local setup: `docker compose up --build`, then open `http://127.0.0.1:3000`. Docker binds only frontend port 3000 to loopback and stores consented history in a named volume. Saved model artifacts are copied into the backend image. Docker configuration is provided; container execution was not verified in this environment. Do not expose this unauthenticated local app publicly.

## Hosted research demo

The linked Vercel frontend uses its production `BACKEND_URL` to forward API calls to the hosted FastAPI project. Stage the API by running `python scripts/stage_vercel_backend.py <empty-directory>` from the repository root, then deploy that directory as the FastAPI project. Set the API's `ALLOWED_ORIGINS` to the frontend's production origins.

The hosted entry point disables shared server history. The timeline can analyze readings for the current session and export them. The staged release includes the tracked model and reference data.

## Remaining limits

No login, multi-user separation, external clinical validation, external dataset-provenance verification, causal interpretation, OCR, wearable integration, or reduced-feature classifier is included. Browser saving stores workspace data in the current browser profile. Consented measurement history is stored separately in SQLite. Deletion removes active SQLite records. Current record history has no person identifier and must represent one individual when used for temporal analysis. Independent multi-patient complete clinical rows are supported for static batch classification.

The app and model are production-structured for local demonstration, not production clinical software. External exposure would require authentication, authorization, transport security, retention controls, operational monitoring, and independent model validation. The model is never silently retrained at startup, and no hardcoded scores substitute for an unavailable backend.

## Plain-language field labels and verified source meanings

The canonical category dictionary is `backend/schemas/fields.json`. Its generated frontend copy at `frontend/lib/fields.generated.json` is checked for equality in tests. Form choices, review values, upload previews, category charts, feature explanations and PDF reports all use these labels. Male/Female is the source sex field; Other / not listed and Prefer not to say are selectable but cannot be assessed because neither was represented in training. No unsupported choice is silently substituted.

The verification script matches the user CSV to the primary [UCI Heart Disease reference](https://archive.ics.uci.edu/dataset/45/heart+disease) on eight unchanged fields. It checks every transformed category against the original values. The row-level source reference, attribution and aggregate audit are in `backend/data/reference/` and `backend/data/category_mapping_audit.json`. No new training or holdout evaluation was performed for this UI change.

Non-obvious recodings include chest-pain typical angina → internal 3, normal resting ECG → internal 1, upward ST slope → internal 2, and normal thallium test → internal 2. Source missing values map to internal vessel value 4 or stress-test value 0. The API refuses those missing measurements at inference. Numeric encodings are implementation details; they are not shown as ordinary form choices.

The outcome audit also confirms that the saved model estimates the no-disease source class when its positive-class score is high. Model comparisons therefore label disease-class recall using the saved specificity (67.9%), and no-disease-class recall using the saved recall (90.9%). The original selection utility optimized saved positive-class recall, so its recall term favored no-disease-class detection. This is a retrospective research classifier and must not be used as a clinical screening tool.
