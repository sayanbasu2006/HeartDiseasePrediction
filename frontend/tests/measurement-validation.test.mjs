import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadTypescript } from "./load-typescript.mjs";

const { countSupportedInputs, isSupportedMeasurement } = await loadTypescript(
  new URL("../lib/measurement-validation.ts", import.meta.url),
);

const { fields } = JSON.parse(
  readFileSync(new URL("../lib/fields.generated.json", import.meta.url)),
);
const patient = {
  age: 63,
  sex: 1,
  cp: 3,
  trestbps: 145,
  chol: 233,
  fbs: 1,
  restecg: 0,
  thalach: 150,
  exang: 0,
  oldpeak: 2.3,
  slope: 0,
  ca: 0,
  thal: 1,
  visceral_fat: 28,
};
const fat = fields.find((field) => field.key === "visceral_fat");

test("the canonical catalogue contains exactly 14 unique required inputs", () => {
  assert.equal(fields.length, 14);
  assert.equal(new Set(fields.map((field) => field.key)).size, 14);
  assert.equal(countSupportedInputs(fields, patient), 14);
});

test("old assessments without visceral fat are counted as 13 of 14", () => {
  const { visceral_fat, ...oldRecord } = patient;
  assert.equal(countSupportedInputs(fields, oldRecord), 13);
});

test("a finite zero visceral fat index counts as supplied", () => {
  assert.ok(isSupportedMeasurement(fat, 0));
  assert.equal(
    countSupportedInputs(fields, { ...patient, visceral_fat: 0 }),
    14,
  );
});

test("missing, negative, nonfinite and nonnumeric indices are invalid", () => {
  for (const value of [
    undefined,
    null,
    "",
    " ",
    "8.5",
    true,
    -1,
    NaN,
    Infinity,
  ]) {
    assert.equal(isSupportedMeasurement(fat, value), false);
    assert.equal(
      countSupportedInputs(fields, { ...patient, visceral_fat: value }),
      13,
    );
  }
});

test("recorded indices have no invented maximum from the demo model", () => {
  assert.ok(isSupportedMeasurement(fat, 32));
});

test("fractional ages and unsupported source categories are incomplete", () => {
  for (const change of [{ age: 63.5 }, { ca: 4 }, { thal: 0 }, { sex: 2 }]) {
    assert.equal(countSupportedInputs(fields, { ...patient, ...change }), 13);
  }
});
