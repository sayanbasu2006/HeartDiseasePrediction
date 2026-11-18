## Website readability — 19 Nov 2026

Raised the shared body size to 17px and moved compact labels and supporting text to a 14–16px scale using rem tokens. Navigation, form guidance, tables, model comparisons and visceral-fat explanations share the new scale. Chart ticks use 14px text. Strengthened secondary text in both monochrome themes, increased heading weights and added distinct form-control border colours. The narrow form stepper now uses two columns, and the desktop menu switches to its drawer before enlarged links collide.

Browser checks covered all nine routes at 320, 768 and 1440 CSS pixels in light mode, and at 320 and 1440 pixels in dark mode. A 1280px navigation check and completed 14-input assessments with the hypothetical comparison expanded also passed. These views had no document horizontal overflow or sampled text contrast below 4.5:1. Main content labels and captions were at least 14px; the compact brand tagline retains a separate size. These checks concern rendered text and layout, rather than certification of the whole site against an accessibility standard.

## Neutral source naming and Annapurma demo dataset — 19 Nov 2026

Replaced the former cohort name in application labels, example notices, PDF text, model-provenance descriptions and project documentation with neutral source-dataset or UCI Heart Disease wording. The data path constant is now `MAIN_DATASET`; the numerical dataset, source checksums, trained model and score contracts are unchanged. Official archive-member filenames remain in the source audit and verification script so original-source matching continues to work.

Created a separate, explicitly synthetic 100-person Tamil Nadu demonstration for the requested Annapurma Hospital label. The CSV and Excel workbook contain all 14 assessment inputs, fictional names, city/language context and artificial labels. Seed: 20261119. Every record validates against the current assessment schema. Names, hospital association, measurements and outcomes are invented; the cohort is not a clinical or population-calibrated hospital dataset and was not merged into the main training file.

Files: `outputs/annapurma-tamil-100-20261119/`. Backend: 84 tests passed. Frontend: 9 regression tests and production build passed.

Published frontend `dpl_7SB5ibFvkDiUmqWs4HZ7FCFSkyRC` and API `dpl_HS5p6V6TrqLx1GTkboJA9gvS2g7Q`. Both reached Ready. Live checks confirmed neutral example notices, inference limitations, metadata provenance and three-page PDF text; the main model remains `2.0-bb5ec8e04e` with 14 inputs. Browser inspection confirmed the new “Load example record” control. Standalone TypeScript checking passed. The 100-row CSV also passed the actual upload parser, clinical-column mapping and row validation; Excel export was visually checked with the data and codebook populated.

## Visceral fat visual comparisons — production release, 18 Nov 2026

Published reviewed application commit `c02dcc363238f52c00f9b6f1014bc884a43bbfba` to GitHub `main`. Production frontend: `dpl_2eAi4AM6hS1y4zD3zQu4SC9da3n2`; production API: `dpl_F34LLDLddR57mF8TAqcE2xikzNgt`. The public address is `https://cardiolens-ai.vercel.app`.

Fourteen live checks passed through the public frontend: health, 14-input model contract, individual response curve, independently recalculated reference comparison, missing-index rejection, batch comparisons and incomplete-record rejection, standard three-page PDF, simulated response curve, simulated three-page PDF, 14-column upload template, distributions, global sensitivity, disabled shared server history, and visceral-fat timeline analysis. Browser verification completed the live Source-dataset example and displayed the new comparison panel with index 28, reference index 18 and a -0.40 percentage-point model-score difference. These are experimental model responses to generated training indices.

## Visceral fat visual comparisons — local review, 18 Nov 2026

Every standard, simulated and eligible batch prediction now includes a same-record visceral-fat comparison against the median of its model's development background records. Only the visceral-fat index changes. Regression checks verify reference and sampled-curve scores against independent predictions, zero difference at the reference index, consistency between individual and batch results, and the dedicated third PDF page. Training indices remain identified as generated; no model retraining or clinical thresholds were introduced.

Backend: 84 tests passed. Frontend: 9 tests, type checking and production build passed. The local browser completed the Source-dataset example and displayed the dedicated response curve, paired score bars and report-preview summary. The insights panel was inspected in desktop and narrow phone layouts and in both themes, with no document horizontal overflow or browser errors in those checks. All three PDF pages were rendered and visually inspected. Local preview services run at `http://127.0.0.1:3000` and `http://127.0.0.1:8000`. Nothing from this change has been committed, pushed or deployed.

## Full workflow and responsive review — 18 Nov 2026

The 14-input model was checked directly at visceral-fat indices 0, 8.5, 15, 28 and 31 with every other input fixed. Disease-present scores differ (50.44373%, 50.00562%, 49.58649%, 49.61235%, 49.47064%). Visceral fat is included in continuous preprocessing, individual explanations, global sensitivity and PDF measurements. These are model responses to the previously generated training column, not validation of measured visceral-fat effects.

Browser checks covered required visceral-fat validation (13/14 when cleared), successful 14-input assessment, changed-index inference and reset, two-page PDF download with the submitted 8.5 index, draft/assessment/upload restoration after refresh, and a three-row CSV upload in which the row missing visceral fat was rejected while both complete rows were scored. The long uploaded filename and 14-column editable preview remain contained on mobile.

Timeline checks covered two actual-entry test records (visceral-fat indices 8.5 and 9), metric selection, date filters, the HMM sample and return to the original two workspace records. Dashboard measurements and charts now include workspace readings; opening/closing the sample no longer discards them. Date filters use local calendar boundaries, including daylight-saving changes. One-point charts omit the range brush; longer charts have a named, wider range control.

All nine routes (home, dashboard, predict, upload, history, models, insights, reports, about) were checked at 320, 768 and 1440 CSS-pixel widths in light mode, and at 390 pixels in dark mode, with no document horizontal overflow or displayed page errors. Charts, validation-curve controls, navigation drawer, measurement definitions and saved reports were additionally exercised with loaded data. White/black themes use consistent neutral surfaces; form actions no longer obscure fields, and mobile entry precedes the expanded guidance.

Saved assessment completeness is calculated from the current catalogue, so a legacy 13-input record is not labeled 14/14. PDF downloads check the recorded main-model version before recalculating a report. Frontend regression tests cover the required catalogue, legacy/missing inputs, valid zero indices, unsupported values/categories, fractional ages, local dates and daylight-saving boundaries. Backend: 80 tests passed. Frontend: 9 tests, type checking and production build passed.

Both services were published to production: frontend `dpl_BcyNwHDpFs2BBqtJ9ajv526S2ZHz`, API `dpl_5ZSgr6TzJgDo5HuniWzSNDmiQztk`. Fourteen live API checks through `https://cardiolens-ai.vercel.app` passed, including required-input rejection, changed visceral-fat scores, batch eligibility, uploaded column mapping, distribution/global-explanation availability, PDF generation and visceral-fat timeline analysis. The public browser completed a 14-input assessment with index 8.5 and displayed its signed contribution; the new mobile progress control, white desktop theme and black theme were verified. Screenshots: `/private/tmp/cardiolens-responsive-mobile.jpg` and `/private/tmp/cardiolens-responsive-desktop.jpg`. Local test workspace saving was turned off again and temporary viewport overrides were reset.

## Age comparison interpretation — 18 Nov 2026

Reproduced the reported Source-dataset example using model `2.0-bb5ec8e04e`: changing only age from 63 to 76 changes the disease-present class score from 49.6123% to 48.7555%. This is the fitted, unconstrained classifier's response; the API and UI use the same disease-present class, without score inversion or a manually added age adjustment. The development age range is 29–77 years.

The hypothetical explorer now explains that it compares records rather than estimating the effects of aging, and explicitly identifies a lower score after an age-only increase. A version mismatch blocks comparisons between an existing result and a newly deployed model. A regression check verifies age-specific API scores against the fitted model's class-0 probabilities. All 80 backend tests and frontend type checking passed.

Published the frontend update and verified it in the production browser: loaded the Source-dataset example, ran its assessment and changed the age slider from 63 to 76. The displayed scores match the fitted model and the age-decrease explanation appears. Screenshot: `/private/tmp/cardiolens-age-comparison.jpg`.

## Required visceral fat integration — 18 Nov 2026

The main classifier now requires all 14 inputs. Visceral fat enters every candidate model's continuous preprocessing, the selected model's predictions, feature explanations and the measurement review. Form submission, batch classification, explanations and reports reject omitted, blank, null and nonfinite indices. The timeline continues to represent only readings actually available at each timestamp.

The dataset contains the original 303 UCI Heart Disease records with the previously generated visceral-fat indices. Its metadata retains the observed-field checksum and full-file checksum. The field provenance records the generated indices.

The selected model is Calibrated OOF voting, version `2.0-bb5ec8e04e`. The fixed split contains 241 development and 61 holdout records. Holdout accuracy is 80.33%, ROC-AUC is 0.8918, and the confusion matrix is `[[20, 8], [4, 29]]`. All metrics are calculated from the retrained model.

The UI and upload template list 14 required parameters. The visceral-fat field appears with the other required measurements and can be varied in the hypothetical explorer.

Verification: 79 backend tests passed with Starlette deprecations treated as errors; `npm run typecheck` passed. Local browser checks covered missing-index step validation, a completed 14-input assessment and a recalculated visceral-fat scenario.

Published both services to production. Live checks through `https://cardiolens-ai.vercel.app` confirmed 14 model features, 14 unique template columns, 14 returned measurements and feature contributions, HTTP 422 for omitted visceral fat, batch rejection of an incomplete record, changed scores for changed indices and PDF report generation. Browser inspection confirmed the live assessment's 14/14 review and upload guidance requiring all 14 parameters, including visceral fat.

# Local verification

## Current institutional redesign verification — 14 Nov 2026

- Backend: 67 tests passed, including classification semantics, feature contracts, upload validation, history and optional visceral-fat behavior. One existing Starlette/httpx deprecation warning remains.
- Frontend: TypeScript checking and Next.js production compilation passed. All nine application routes are generated.
- PDF: reports generated through the actual API with and without the optional device index were two pages. Both pages of the optional-index report were rendered and visually inspected; values, signed contributions, disclaimers and footer fit without clipping.
- Visual inspection: the AHA PREVENT reference was reviewed for information hierarchy. Actual CardioLens components were rendered to isolated static snapshots with real backend responses. Homepage and assessment layouts were inspected on desktop, the measurement step at 390 CSS pixels, and result summary/contribution/measurement sections on desktop. These snapshots are verification fixtures, not a replacement application or fabricated patient history.
- Limit: this execution sandbox denies localhost socket binding (`EPERM`) on both 3000 and 8000. Server startup was retried and failed at binding. Consequently this redesign has **not** received a fresh live-browser end-to-end interaction check, hydration check, or dynamic Recharts rendering check. Prior browser verification below describes the earlier interface, not this redesign. Start the two servers using README commands for the remaining live checks.
- No dependencies were added, no model was retrained, and no commit or push was made. Existing uncommitted changes were retained. Preferred web fonts fall back to locally installed system fonts; no font network request is required.

## Earlier application verification

Verified on Python 3.12 / Node 24 with the checked-in dependency locks.

- Backend: 45 tests passed. One dependency deprecation warning from Starlette’s httpx TestClient adapter; no test failures.
- Frontend: TypeScript check passed; Next.js production build passed with Webpack and all nine requested application routes.
- Browser: blank required inputs blocked progression; the labeled dataset example advanced through all four steps including Review, then returned actual trained-model output and additive feature explanations.
- Browser: hypothetical slider changes triggered real inference.
- Browser: CSV upload produced editable mapping/preview; a valid example received a score, while ca=9 produced an ineligible row with an explicit category error.
- Browser: synthetic timeline produced real Kalman smoothing and fitted HMM states; synthetic data remained separate from stored personal history.
- Browser: real model laboratory showed nested OOF candidate comparisons, selected-model holdout results, calibration status, and the actual dataset audit.
- Responsive layout checked at desktop and narrow phone/tablet widths; phone layout had no document horizontal overflow in the inspected viewport.
- PDF: both generated pages were rendered with Poppler and visually inspected. Dataset demonstration label, submitted values, contribution bars, version, and disclaimers were readable without clipping.
- Final production frontend and backend answered locally; a preview screenshot is saved in docs/cardiolens-preview.jpg.

The supplied SQLite history is empty. Only consented user history persists; demonstration/test records were not written into the personal database. Docker configuration is supplied but was not executed. This verification establishes software behavior, not clinical performance beyond the measured supplied-dataset experiment.

## Interface refresh

The follow-up UI update makes dark mode the default and applies a saved light preference in the document head before paint. The theme switch uses explicit accessible labels and still works when browser storage is unavailable.

Typography, field labels, explanatory text, chart labels and buttons were enlarged. Navigation and the header use frosted surfaces with opaque fallbacks; active steps, field focus, and navigation states have stronger highlights. Form cards now size to content. Navigation becomes a drawer below 900 CSS pixels; narrow forms become a single column. Reduced-motion and reduced-transparency preferences have dedicated fallbacks.

Measured opaque palette contrast ratios: dark helper text 9.14:1, light helper text 6.32:1, light page descriptions 5.65:1, and light accent text 6.32:1. These are sampled palette checks rather than a full accessibility audit.

Browser checks covered desktop, tablet and phone layout widths, visible theme changes, retained light preference after reload, and restored dark preference. No machine-learning pipeline, prediction behavior, or personal health records were changed by the interface refresh.

## Visceral fat model evaluation

The supplied combined CSV contains 920 UCI heart-disease outcomes and zero rows with both that outcome and a visceral-fat device index. The 319 Ankara rows match the standalone visceral-fat CSV on the analysis inputs and CAD labels after recoding sex. The Ankara cohort has 12 recorded CAD cases. Its CAD field records a comorbidity in a gallstone study. The main classifier uses the UCI angiographic disease-status outcome. [UCI Heart Disease](https://archive.ics.uci.edu/dataset/45/heart+disease) · [UCI Gallstone](https://archive.ics.uci.edu/dataset/1150/gallstone-1)

The exploratory comparison used class-weighted logistic regression with fold-local scaling and a fixed 0.5 decision threshold. Both models used the same four held-out folds. Records with identical age, sex and BMI stayed in the same fold. The models used age, sex and BMI, with the second model adding the visceral-fat device index.

| Inputs | Accuracy | Balanced accuracy | ROC-AUC | Average precision | CAD cases detected |
| --- | ---: | ---: | ---: | ---: | ---: |
| Age, sex and BMI | 65.52% | 62.07% | 0.689 | 0.103 | 7 / 12 |
| Age, sex, BMI and visceral fat | 66.46% | 62.55% | 0.666 | 0.108 | 7 / 12 |
| Always predict no recorded CAD | 96.24% | 50.00% | 0.500 | 0.038 | 0 / 12 |

Adding visceral fat reduced false positives from 105 to 102 and lowered ROC-AUC. The small number of cases makes these estimates uncertain. Evaluating the feature for the main assessment requires the existing 13 clinical inputs, a genuinely measured visceral-fat index with a documented device scale, and the classifier’s outcome for each same person.

Reproduce the comparison from the project root.

```bash
python -m backend.ml.evaluate_visceral_fat \
  ~/Downloads/CardioLens_Research_1239_Provenance_Preserved.csv \
  ~/Downloads/CardioLens_Visceral_Fat_319_Real_Records.csv
```

## Source-dataset example indices

The main UCI Heart Disease CSV includes a seeded example index for each of its 303 rows. Duplicate records receive the same index. The `visceral_fat_source` column records how the index was filled. The original values and outcomes reproduce the verified checksum.

A fixed logistic-regression comparison reused the existing 241 development records and 61 holdout records. Accuracy was 85.25% with the observed inputs and 83.61% when the generated index was included. The index appears in the Source-dataset example, its result and PDF as a reference value.
