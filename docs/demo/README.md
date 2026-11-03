# Demonstration records

These CSVs contain the first two records from the supplied heart.csv, without target labels. They are dataset examples, not personal health records and not evidence of generalization.

- dataset-examples.csv: two source examples for the batch upload demonstration.
- dataset-examples-invalid.csv: the second example deliberately has ca=9, an unsupported category, to demonstrate abstention. Do not treat this modified value as a medical observation.

Temporal demonstration observations are generated only when the explicit sample timeline is selected. They are never substituted into the static classifier training data.
