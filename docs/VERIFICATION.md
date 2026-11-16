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

## Cleveland example indices

The main Cleveland CSV includes a seeded example index for each of its 303 rows. Duplicate records receive the same index. The `visceral_fat_source` column records how the index was filled. The original values and outcomes reproduce the verified checksum.

A fixed logistic-regression comparison reused the existing 241 development records and 61 holdout records. Accuracy was 85.25% with the observed inputs and 83.61% when the generated index was included. The index appears in the Cleveland example, its result and PDF as a reference value.
