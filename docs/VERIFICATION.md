# Local verification

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
