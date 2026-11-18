# Annapurma Hospital — 100-person Tamil Nadu synthetic demo

Created 19 November 2026. Exactly 100 fictional people. All 14 CardioLens
assessment inputs are populated, including the visceral-fat device index.

Annapurma Hospital is the requested demonstration label. These are not real
hospital records and no affiliation, approval or endorsement is asserted.
Names, city assignments, clinical values and outcomes are generated.
Tamil names, Tamil language and Tamil Nadu cities provide fictional cultural
context; the simulation is not calibrated to Tamil people's health or disease prevalence.

The measurements and artificial outcome were generated using the project's
existing `backend.ml.train_synthetic.simulate` function with seed 20261119.
The seed makes the data reproducible within the same generator/environment.
`simulated_label` uses 1 for a lower simulated pattern and 0 for a higher
simulated pattern. It is not a confirmed disease label or a real model result.

## Files and use

- CSV: 100 data rows plus one header row. Metadata columns can be ignored
  when mapping the 14 clinical fields in the CardioLens upload screen.
- Excel: the same 100 records, with a Codebook sheet documenting every field.
- No training, deployment or accuracy claim is attached to this new cohort.

## Field dictionary

| Field | Unit/type | Definition |
| --- | --- | --- |
| `record_id` | Text | Fictional demonstration ID, not a hospital medical-record number. |
| `fictional_name` | Text | Invented name using Tamil given names and an initial. |
| `hospital_name` | Text | Requested demo label. No real hospital affiliation is asserted. |
| `home_city` | Text | Fictional home-city assignment within Tamil Nadu. |
| `state` | Text | Tamil Nadu; descriptive cohort context only. |
| `preferred_language` | Text | Tamil; no population-specific medical relationship was modelled. |
| `age` | years | Age at the time of your recorded examination. |
| `sex` | Category code | 1 = Male; 0 = Female |
| `cp` | Category code | 3 = Typical angina; 1 = Atypical angina; 2 = Non-anginal chest pain; 0 = No symptoms (asymptomatic) |
| `trestbps` | mmHg | The resting systolic (upper) blood-pressure measurement in your report. |
| `chol` | mg/dL | Enter your recorded serum cholesterol measurement. |
| `fbs` | Category code | 0 = No — 120 mg/dL or below; 1 = Yes — above 120 mg/dL |
| `restecg` | Category code | 1 = Normal ECG; 2 = ST–T wave changes; 0 = Possible enlargement (LVH) |
| `thalach` | bpm | The highest heart rate recorded during the exercise test, not your resting pulse. |
| `exang` | Category code | 0 = No; 1 = Yes |
| `oldpeak` | report value | Enter the ST-depression value from your exercise ECG report. Ask your clinician if you are unsure. |
| `slope` | Category code | 2 = Upward slope; 1 = Flat slope; 0 = Downward slope |
| `ca` | Category code | 0 = None; 1 = One vessel; 2 = Two vessels; 3 = Three vessels |
| `thal` | Category code | 2 = Normal blood-flow result; 1 = Fixed blood-flow defect; 3 = Reversible blood-flow defect |
| `visceral_fat` | index | Enter the visceral fat rating or index from your body-composition device. Use the device index rather than a visceral-fat area or percentage. Generated range: 1–31. Required for every record. |
| `simulated_label` | Artificial binary outcome | 1 = lower simulated pattern; 0 = higher simulated pattern. Not an observed diagnosis. |
| `synthetic` | Boolean | TRUE for every row: names, measurements and outcomes are invented. |
