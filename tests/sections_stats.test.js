// The stats strip (`sections/stats.js`): its tiles from the trace totals, and the line of the trace's first and last
// day.
import assert from "node:assert/strict";
import { test } from "node:test";

import { datesLine, statsRows } from "../site/js/sections/stats.js";

// One row of the trace totals, as `explore/trace_totals` answers it.
const TOTALS_ROW = Object.freeze({
  first_day: "2025-04-11",
  last_day: "2026-04-12",
  months: 13,
  requests: 6_122_413_756,
  input_tokens: 35_795_761_356_238,
  output_tokens: 2_522_394_591_477,
  users: 481_479,
  models: 9_174,
  instances: 875_921,
});

test("the strip's tiles are the totals' months, requests, tokens, user ids, models and instances, each formatted", () => {
  assert.deepEqual(statsRows(TOTALS_ROW), [
    { value: "13", label: "Months" },
    { value: "6.12B", label: "Requests" },
    { value: "35.8T", label: "Input tokens" },
    { value: "2.52T", label: "Output tokens" },
    { value: "481.5k", label: "User ids" },
    { value: "9,174", label: "Models" },
    { value: "875.9k", label: "Instances" },
  ]);
});

test("the line under the tiles names the trace's first and last day", () => {
  assert.equal(datesLine(TOTALS_ROW), "April 11, 2025 – April 12, 2026");
});
