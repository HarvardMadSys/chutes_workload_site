import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { MONTH_COLUMN, TRENDS, trendLegend } from "../site/js/explore/trends.js";
import { MIXES, mixLegend } from "../site/js/landing/donuts.js";
import { foldedRows } from "../site/js/charts/stacked_bars.js";
import { distinct } from "../site/js/shared/charts.js";
import { OTHER_SERIES } from "../site/js/theme/colours.js";

// The rows of a shipped answer, as the page reads them.
function shippedAnswer(name) {
  return JSON.parse(readFileSync(new URL(`../site/data/all/${name}.json`, import.meta.url), "utf8"));
}

// Nine named models and Other, most requested first, as `explore/model_mix` answers: the ninth is not among the eight.
const MODEL_MIX_ROWS = [
  "m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "Other",
].map((model, index) => ({ model, requests: 100 - index }));

const ENDPOINT_MIX_ROWS = [
  { endpoint_group: "chat", requests: 50 },
  { endpoint_group: "chat_stream", requests: 40 },
  { endpoint_group: "completion_stream", requests: 9 },
  { endpoint_group: "other", requests: 2 },
  { endpoint_group: "completion", requests: 1 },
];

test("the three trends are requests and tokens by model and requests by endpoint group, from their answers", () => {
  assert.deepEqual(TRENDS.map((trend) => [trend.title, trend.query, trend.series.column, trend.valueColumn]), [
    ["Requests per month", "explore/requests_by_month_model", "model", "requests"],
    ["Tokens per month", "explore/tokens_by_month_model", "model", "tokens"],
    ["Requests per month by endpoint", "explore/requests_by_month_endpoint", "endpoint_group", "requests"],
  ]);
  assert.equal(MONTH_COLUMN, "calendar_month");
});

test("a model trend's legend lists the model mix's eight in its order, then Other, in the donut's colours", () => {
  const rows = [
    { calendar_month: "2025-04", model: "m2", requests: 5 },
    { calendar_month: "2025-04", model: "Other", requests: 9 },
    { calendar_month: "2025-05", model: "m1", requests: 7 },
    { calendar_month: "2025-05", model: "m8", requests: 1 },
  ];
  const legend = trendLegend(TRENDS[0], rows, MODEL_MIX_ROWS);
  assert.deepEqual(legend.series.map((entry) => entry.name), ["m1", "m2", "m8", "Other"]);
  assert.equal(legend.colours.get("Other"), OTHER_SERIES);
  const donutColours = mixLegend(MIXES[0], MODEL_MIX_ROWS).colours;
  for (const trend of TRENDS.slice(0, 2)) {
    assert.deepEqual([...trendLegend(trend, rows, MODEL_MIX_ROWS).colours], [...donutColours]);
  }
});

test("the endpoint trend's legend writes each group's label, the group other folded into Other, last", () => {
  const rows = [];
  for (const { endpoint_group: group } of ENDPOINT_MIX_ROWS) {
    rows.push({ calendar_month: "2025-04", endpoint_group: group, requests: 1 });
  }
  const legend = trendLegend(TRENDS[2], rows, ENDPOINT_MIX_ROWS);
  assert.deepEqual(legend.series.map((entry) => entry.label), [
    "Chat", "Chat stream", "Completion stream", "Completion", "Other",
  ]);
  assert.deepEqual([...legend.colours], [...mixLegend(MIXES[1], ENDPOINT_MIX_ROWS).colours]);
});

test("each shipped trend has a bar per calendar month in order, 2025-04 first and 2026-04 last", () => {
  const modelMixRows = shippedAnswer("explore/model_mix");
  const endpointMixRows = shippedAnswer("explore/endpoint_mix");
  for (const trend of TRENDS) {
    const rows = shippedAnswer(trend.query);
    const orderRows = trend.series.order === "models" ? modelMixRows : endpointMixRows;
    const colours = trendLegend(trend, rows, orderRows).colours;
    const columns = { xColumn: MONTH_COLUMN, seriesColumn: trend.series.column, valueColumn: trend.valueColumn };
    const months = distinct(foldedRows(rows, colours, columns).map((row) => row[MONTH_COLUMN]));
    assert.equal(months.length, 13, trend.title);
    assert.equal(months[0], "2025-04");
    assert.equal(months.at(-1), "2026-04");
    assert.deepEqual(months, [...months].sort());
  }
});

test("a shipped model trend folds every model past the model mix's eight into Other, drawn last", () => {
  const rows = shippedAnswer("explore/requests_by_month_model");
  const legend = trendLegend(TRENDS[0], rows, shippedAnswer("explore/model_mix"));
  assert.equal(legend.series.length, 9);
  assert.equal(legend.series.at(-1).name, "Other");
});
