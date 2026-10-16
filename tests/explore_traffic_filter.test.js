import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  choiceSeries, dailyRequests, DEFAULT_CHOICE, endpointChoices, modelChoices, OTHER_MODEL, PERIODS, periodDays,
  readTrafficChoice, rowsInChoice, trafficSummary, writeTrafficChoice,
} from "../site/js/explore/traffic_filter.js";
import { ENDPOINT_SERIES, MODEL_SERIES } from "../site/js/shared/series.js";
import { modelColours } from "../site/js/theme/colours.js";

// The rows of the shipped daily rollup, as the page reads them.
const SHIPPED_ROWS = JSON.parse(
  readFileSync(new URL("../site/data/all/explore/daily_rollup.json", import.meta.url), "utf8"),
);

// A row of the daily rollup with every count zero but those given.
function rollupRow(fields) {
  return {
    day: "2025-07-01", chute_id: null, model: "Other", endpoint_group: "chat", requests: 0,
    input_tokens: null, input_counted: 0, output_tokens: null, output_counted: 0, ttft_sum: null, ttft_counted: 0,
    ...fields,
  };
}

// Two named models and Other over three days and two endpoint groups.
const ROWS = [
  rollupRow({ day: "2025-06-30", chute_id: "id-a", model: "A", requests: 10 }),
  rollupRow({ day: "2025-07-01", chute_id: "id-a", model: "A", endpoint_group: "chat_stream", requests: 30 }),
  rollupRow({ day: "2025-07-01", chute_id: "id-b", model: "B", requests: 50 }),
  rollupRow({ day: "2025-07-01", model: "Other", requests: 5 }),
  rollupRow({ day: "2025-10-01", chute_id: "id-b", model: "B", endpoint_group: "chat_stream", requests: 20 }),
];

const MODEL_VALUES = ["id-a", "id-b", OTHER_MODEL];

test("the default choice writes no key and leaves every other key as it is", () => {
  const written = writeTrafficChoice(new URLSearchParams("tab=x&model=id-a"), DEFAULT_CHOICE);
  assert.equal(written.toString(), "tab=x");
});

test("a choice written to the URL reads back the same", () => {
  const choice = { model: "id-b", endpoint: "chat_stream", period: "2026-q1" };
  const written = writeTrafficChoice(new URLSearchParams("tab=x"), choice);
  assert.equal(written.toString(), "tab=x&model=id-b&endpoint=chat_stream&period=2026-q1");
  assert.deepEqual(readTrafficChoice(written, MODEL_VALUES), choice);
});

test("a URL value the explorer does not know falls back to the default, the others kept", () => {
  const params = new URLSearchParams("model=nope&endpoint=fax&period=2027-q1");
  assert.deepEqual(readTrafficChoice(params, MODEL_VALUES), DEFAULT_CHOICE);
  const mixed = new URLSearchParams("model=other&endpoint=fax&period=2025-q3");
  assert.deepEqual(readTrafficChoice(mixed, MODEL_VALUES), { model: OTHER_MODEL, endpoint: "", period: "2025-q3" });
});

test("the periods are All and the four calendar quarters, by their keys and labels", () => {
  assert.deepEqual(PERIODS.map((period) => [period.value, period.label]), [
    ["", "All"], ["2025-q2", "Q2 '25"], ["2025-q3", "Q3 '25"], ["2025-q4", "Q4 '25"], ["2026-q1", "Q1 '26"],
  ]);
});

test("each period holds the shipped answer's days of its quarter; All holds every day, April 2026's twelve too", () => {
  const days = [...new Set(SHIPPED_ROWS.map((row) => row.day))];
  const spans = PERIODS.map((period) => {
    const held = periodDays(days, period.value);
    return [period.value, held[0], held.at(-1), held.length];
  });
  assert.deepEqual(spans, [
    ["", "2025-04-11", "2026-04-12", 367],
    ["2025-q2", "2025-04-11", "2025-06-30", 81],
    ["2025-q3", "2025-07-01", "2025-09-30", 92],
    ["2025-q4", "2025-10-01", "2025-12-31", 92],
    ["2026-q1", "2026-01-01", "2026-03-31", 90],
  ]);
});

test("a choice keeps the rows of its model, its endpoint group and its period's days", () => {
  const requests = (choice) => rowsInChoice(ROWS, { ...DEFAULT_CHOICE, ...choice }).map((row) => row.requests);
  assert.deepEqual(requests({}), [10, 30, 50, 5, 20]);
  assert.deepEqual(requests({ model: "id-a" }), [10, 30]);
  assert.deepEqual(requests({ model: OTHER_MODEL }), [5]);
  assert.deepEqual(requests({ endpoint: "chat_stream" }), [30, 20]);
  assert.deepEqual(requests({ period: "2025-q3" }), [30, 50, 5]);
  assert.deepEqual(requests({ model: "id-b", period: "2025-q4" }), [20]);
});

test("an average divides by the requests that have the value: 490 of 1,000 recording a TTFT is 49%", () => {
  const rows = [
    rollupRow({ requests: 600, input_tokens: 6000, input_counted: 600, ttft_sum: 98, ttft_counted: 490 }),
    rollupRow({ requests: 400, input_tokens: 2000, input_counted: 400, output_tokens: 900, output_counted: 300 }),
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

test("the bars are by model while no model is chosen, and by endpoint group once one is", () => {
  assert.equal(choiceSeries(DEFAULT_CHOICE), MODEL_SERIES);
  assert.equal(choiceSeries({ ...DEFAULT_CHOICE, endpoint: "chat" }), MODEL_SERIES);
  assert.equal(choiceSeries({ ...DEFAULT_CHOICE, model: "id-a" }), ENDPOINT_SERIES);
  assert.equal(choiceSeries({ ...DEFAULT_CHOICE, model: OTHER_MODEL }), ENDPOINT_SERIES);
});

test("a model the Overview does not name folds into Other in the bars, summed per day", () => {
  const colours = modelColours([{ model: "A" }, { model: "Other" }]);
  assert.deepEqual(dailyRequests(ROWS, "model", colours), [
    { day: "2025-06-30", model: "A", requests: 10 },
    { day: "2025-07-01", model: "A", requests: 30 },
    { day: "2025-07-01", model: "Other", requests: 55 },
    { day: "2025-10-01", model: "Other", requests: 20 },
  ]);
});

test("the shipped rollup's requests add up to the trace totals', so the tile equals the stats strip", () => {
  const [totals] = JSON.parse(
    readFileSync(new URL("../site/data/all/explore/trace_totals.json", import.meta.url), "utf8"),
  );
  assert.equal(trafficSummary(SHIPPED_ROWS).requests, totals.requests);
});

test("the model drop-down offers every named model by its requests, then Other; the shipped one twenty", () => {
  assert.deepEqual(modelChoices(ROWS), [
    { value: "", text: "All models" },
    { value: "id-b", text: "B" },
    { value: "id-a", text: "A" },
    { value: OTHER_MODEL, text: "Other" },
  ]);
  const shipped = modelChoices(SHIPPED_ROWS);
  assert.equal(shipped.length, 22);
  assert.equal(shipped[1].text, "deepseek-ai/DeepSeek-V3-0324");
});

test("the endpoint drop-down offers every endpoint group by its label", () => {
  assert.deepEqual(endpointChoices().map((choice) => [choice.value, choice.text]), [
    ["", "All endpoints"],
    ["chat", "Chat"],
    ["chat_stream", "Chat stream"],
    ["completion", "Completion"],
    ["completion_stream", "Completion stream"],
    ["other", "Other"],
  ]);
});
