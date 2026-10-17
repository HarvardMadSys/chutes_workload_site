/**
 * The Traffic Explorer's bars (`traffic/traffic_bars.js`): the months written under them, and their words for each
 * metric.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { dayMonth, METRIC_WORDS, monthTicks } from "../site/js/traffic/traffic_bars.js";
import { METRICS } from "../site/js/traffic/traffic_filter.js";

// Plot widths, in pixels: a desktop card's, and a phone's at 360 px.
const WIDE_PLOT = 1200;
const PHONE_PLOT = 286;

// The first day of each month of the whole trace's days, from 2025-04-11 to 2026-04-12.
const TRACE_MONTH_STARTS = [
  "2025-05-01", "2025-06-01", "2025-07-01", "2025-08-01", "2025-09-01", "2025-10-01", "2025-11-01", "2025-12-01",
  "2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01",
];

test("the bars' axis writes the month at each first of a month, and at a first day in its month's first half", () => {
  const quarter = ["2025-07-01", "2025-07-02", "2025-08-01"];
  assert.deepEqual(monthTicks(quarter, WIDE_PLOT), ["2025-07-01", "2025-08-01"]);
  const fromMidMonth = ["2025-04-15", "2025-04-30", "2025-05-01", "2025-06-01"];
  assert.deepEqual(monthTicks(fromMidMonth, WIDE_PLOT).map(dayMonth), ["2025-04", "2025-05", "2025-06"]);
});

test("a range starting late in a month does not name that month, whose label would crowd the next's", () => {
  const days = ["2025-04-16", "2025-04-29", "2025-04-30", "2025-05-01", "2025-05-02", "2025-06-01"];
  assert.deepEqual(monthTicks(days, WIDE_PLOT), ["2025-05-01", "2025-06-01"]);
  assert.deepEqual(monthTicks(days.slice(1), WIDE_PLOT), ["2025-05-01", "2025-06-01"]);
});

test("a range with no first of a month, starting late in one, names its month by its first day", () => {
  const lateDays = ["2025-11-18", "2025-11-19", "2025-11-30"];
  assert.deepEqual(monthTicks(lateDays, WIDE_PLOT), ["2025-11-18"]);
  assert.deepEqual(monthTicks(["2025-11-29"], PHONE_PLOT), ["2025-11-29"]);
  assert.deepEqual(monthTicks([], WIDE_PLOT), []);
});

test("the whole trace's bars write every month and its first on a wide plot, every other one on a phone's", () => {
  const days = ["2025-04-11", ...TRACE_MONTH_STARTS, "2026-04-12"];
  assert.deepEqual(monthTicks(days, WIDE_PLOT), ["2025-04-11", ...TRACE_MONTH_STARTS]);
  assert.deepEqual(monthTicks(days, PHONE_PLOT).map(dayMonth), [
    "2025-04", "2025-06", "2025-08", "2025-10", "2025-12", "2026-02", "2026-04",
  ]);
});

test("a long range that is not the whole trace is thinned on a phone's plot too", () => {
  const allButOneDay = ["2025-04-12", ...TRACE_MONTH_STARTS, "2026-04-12"];
  assert.equal(monthTicks(allButOneDay, WIDE_PLOT).length, 13);
  assert.deepEqual(monthTicks(allButOneDay, PHONE_PLOT).map(dayMonth), [
    "2025-04", "2025-06", "2025-08", "2025-10", "2025-12", "2026-02", "2026-04",
  ]);
});

test("a quarter's bars write every month on a phone's plot, Q2 '25 naming April from the trace's first day", () => {
  const days = ["2025-04-11", "2025-05-01", "2025-06-01", "2025-06-30"];
  assert.deepEqual(monthTicks(days, PHONE_PLOT), ["2025-04-11", "2025-05-01", "2025-06-01"]);
});

test("the bars have their words for every metric, and for no other", () => {
  assert.deepEqual(Object.keys(METRIC_WORDS).sort(), METRICS.map((metric) => metric.value).sort());
});
