import assert from "node:assert/strict";
import test from "node:test";
import { loadTypescript } from "./load-typescript.mjs";

const { localDateBounds } = await loadTypescript(
  new URL("../lib/date-range.ts", import.meta.url),
);

test("an Indian local-day filter includes midnight through the end of that day", () => {
  process.env.TZ = "Asia/Kolkata";
  const { start, end } = localDateBounds("2026-11-18", "2026-11-18");
  assert.equal(start, Date.parse("2026-11-18T00:00:00+05:30"));
  assert.equal(end, Date.parse("2026-11-19T00:00:00+05:30"));
  assert.ok(Date.parse("2026-11-18T00:30:00+05:30") >= start);
  assert.ok(Date.parse("2026-11-18T23:59:59+05:30") < end);
});

test("the end of a local day accounts for daylight-saving transitions", () => {
  process.env.TZ = "America/New_York";
  const spring = localDateBounds("2026-03-08", "2026-03-08");
  assert.equal((spring.end - spring.start) / 3600000, 23);
  const autumn = localDateBounds("2026-11-01", "2026-11-01");
  assert.equal((autumn.end - autumn.start) / 3600000, 25);
});

test("unset date limits leave the timeline unbounded", () => {
  assert.deepEqual(localDateBounds("", ""), {
    start: -Infinity,
    end: Infinity,
  });
});
