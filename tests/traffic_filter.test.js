/**
 * The rows a Traffic Explorer's choice keeps and what follows from them (`traffic/traffic_filter.js`): the period
 * buttons' days, the tiles' sums, the bars' breakdown and their metric per day.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  choiceBreakdown, dailyValues, periodDays, rowsInChoice, trafficSummary,
} from "../site/js/traffic/traffic_filter.js";
import { modelOrder, OTHER_MODEL } from "../site/js/traffic/traffic_choice.js";
import { PERIODS, periodRange } from "../site/js/traffic/traffic_range.js";
import { BY_ENDPOINT, BY_FAMILY, BY_MODEL } from "../site/js/shared/series.js";
import { modelColours } from "../site/js/theme/colours.js";
import { shippedAnswer } from "./fake_page.js";
import { dayRow, EVERYTHING, KIN_ROWS, SHIPPED_ROWS, TRACE_DAYS } from "./traffic_fixtures.js";

// The family Kin's answer, as the explorer reads it: its name and its rows.
const KIN = Object.freeze({ name: "Kin", rows: KIN_ROWS });

test("each period's range holds the shipped answer's days of its quarter; All every day, April 2026's too", () => {
  const spans = PERIODS.map((period) => {
    const held = periodDays(TRACE_DAYS, periodRange(period, TRACE_DAYS));
    return [period.label, held[0], held.at(-1), held.length];
  });
  assert.deepEqual(spans, [
    ["All", "2025-04-11", "2026-04-12", 367],
    ["Q2 '25", "2025-04-11", "2025-06-30", 81],
    ["Q3 '25", "2025-07-01", "2025-09-30", 92],
    ["Q4 '25", "2025-10-01", "2025-12-31", 92],
    ["Q1 '26", "2026-01-01", "2026-03-31", 90],
  ]);
});

test("a choice keeps the rows of its model, its endpoint group and its range's days", () => {
  const requests = (choice) => rowsInChoice(KIN_ROWS, { ...EVERYTHING, ...choice }).map((row) => row.requests);
  assert.deepEqual(requests({}), [10, 30, 50, 5, 20]);
  assert.deepEqual(requests({ family: "kin", model: "id-a" }), [10, 30]);
  assert.deepEqual(requests({ family: "kin", model: OTHER_MODEL }), [5]);
  assert.deepEqual(requests({ endpoint: "chat_stream" }), [30, 20]);
  assert.deepEqual(requests({ from: "2025-07-01", to: "2025-09-30" }), [30, 50, 5]);
  assert.deepEqual(requests({ from: "2025-07-01" }), [30, 50, 5, 20]);
  assert.deepEqual(requests({ to: "2025-07-01" }), [10, 30, 50, 5]);
  assert.deepEqual(requests({ family: "kin", model: "id-b", from: "2025-10-01", to: "2025-12-31" }), [20]);
});

test("an average divides by the requests that have the value: 490 of 1,000 recording a TTFT is 49%", () => {
  const rows = [
    dayRow({ requests: 600, input_tokens: 6000, input_counted: 600, ttft_sum: 98, ttft_counted: 490 }),
    dayRow({ requests: 400, input_tokens: 2000, input_counted: 400, output_tokens: 900, output_counted: 300 }),
  ];
  assert.deepEqual(trafficSummary(rows), {
    requests: 1000, inputAverage: 8, outputAverage: 3, ttftAverage: 0.2, ttftShare: 0.49,
  });
});

test("a summary of no requests has no averages and no share", () => {
  assert.deepEqual(trafficSummary([]), {
    requests: 0, inputAverage: null, outputAverage: null, ttftAverage: null, ttftShare: null,
  });
});

test("the bars are by family with no family chosen, by model with one, and by endpoint group with a model", () => {
  assert.equal(choiceBreakdown(EVERYTHING, null), BY_FAMILY);
  assert.equal(choiceBreakdown({ ...EVERYTHING, endpoint: "chat" }, null).column, "family");
  const byModel = choiceBreakdown({ ...EVERYTHING, family: "kin" }, KIN);
  assert.deepEqual([byModel.column, byModel.order, byModel.colours], ["model", "models", BY_MODEL.colours]);
  assert.deepEqual(byModel.labels, { Other: "Other Kin" });
  assert.equal(choiceBreakdown({ ...EVERYTHING, family: "kin", model: "id-a" }, KIN), BY_ENDPOINT);
  assert.equal(choiceBreakdown({ ...EVERYTHING, family: "kin", model: OTHER_MODEL }, KIN), BY_ENDPOINT);
});

test("a family's other models fold into Other in the bars, their requests summed per day", () => {
  const colours = modelColours(modelOrder(KIN_ROWS));
  assert.deepEqual(dailyValues(KIN_ROWS, "model", "", colours), [
    { day: "2025-06-30", model: "A", value: 10 },
    { day: "2025-07-01", model: "A", value: 30 },
    { day: "2025-07-01", model: "B", value: 50 },
    { day: "2025-07-01", model: "Other", value: 5 },
    { day: "2025-10-01", model: "B", value: 20 },
  ]);
});

test("the bars of a token metric sum its column per day and series, a null sum adding nothing", () => {
  const rows = [
    dayRow({ chute_id: "id-a", model: "A", requests: 3, input_tokens: 300, output_tokens: 30 }),
    dayRow({ chute_id: "id-a", model: "A", endpoint_group: "chat_stream", requests: 2, input_tokens: 200 }),
    dayRow({ chute_id: "id-b", model: "B", requests: 4 }),
  ];
  const colours = modelColours(modelOrder(rows));
  assert.deepEqual(dailyValues(rows, "model", "input_tokens", colours), [
    { day: "2025-07-01", model: "A", value: 500 },
    { day: "2025-07-01", model: "B", value: 0 },
  ]);
  assert.deepEqual(dailyValues(rows, "model", "output_tokens", colours), [
    { day: "2025-07-01", model: "A", value: 30 },
    { day: "2025-07-01", model: "B", value: 0 },
  ]);
  assert.deepEqual(dailyValues(rows, "model", "", colours).map((row) => row.value), [5, 4]);
});

test("the shipped answer by family adds up to the trace totals', so the tile equals the stats strip", () => {
  const [totals] = shippedAnswer("explore/trace_totals");
  assert.equal(trafficSummary(SHIPPED_ROWS).requests, totals.requests);
});

test("the family Other's other models are Rest of Other on its bars", () => {
  const other = { name: "Other", rows: KIN_ROWS };
  assert.deepEqual(choiceBreakdown({ ...EVERYTHING, family: "other" }, other).labels, { Other: "Rest of Other" });
});
