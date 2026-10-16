import assert from "node:assert/strict";
import { test } from "node:test";

import {
  barTipText, foldedRows, foldToOther, stackedBarsLegend, sumFolded,
} from "../site/js/charts/stacked_bars.js";
import { barColours, familyColours } from "../site/js/theme/colours.js";

// Ten endpoint groups in their colour order: the ninth and tenth fold into Other.
const ORDER = ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "e10"];
// Eight models in their colour order: a ninth folds into Other.
const EIGHT_MODELS = ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8"];
const ROWS = [
  { month: "2025-06", endpoint: "e1", requests: 40 },
  { month: "2025-06", endpoint: "e9", requests: 3 },
  { month: "2025-06", endpoint: "e10", requests: 2 },
  { month: "2025-07", endpoint: "e10", requests: 7 },
  { month: "2025-07", endpoint: "e1", requests: 38 },
];

test("a series past the eighth of the colours folds into Other, summed per month, in order of first appearance", () => {
  const columns = { xColumn: "month", seriesColumn: "endpoint", valueColumn: "requests" };
  assert.deepEqual(foldedRows(ROWS, barColours(ORDER), columns), [
    { month: "2025-06", endpoint: "e1", requests: 40 },
    { month: "2025-06", endpoint: "Other", requests: 5 },
    { month: "2025-07", endpoint: "Other", requests: 7 },
    { month: "2025-07", endpoint: "e1", requests: 38 },
  ]);
});

test("a name not among the names folds into Other, and the rows are not changed in place", () => {
  const rows = [{ model: "m1", requests: 5 }, { model: "m9", requests: 3 }, { model: "unlisted", requests: 1 }];
  const folded = foldToOther(rows, "model", EIGHT_MODELS);
  assert.deepEqual(folded, [{ model: "m1", requests: 5 }, { model: "Other", requests: 3 }, { model: "Other", requests: 1 }]);
  assert.equal(rows[1].model, "m9");
});

test("ten named families keep their ten series; a family the colours do not name folds into Other", () => {
  const families = ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "Other"];
  const colours = familyColours(families.map((family) => ({ family })));
  const rows = families.map((family) => ({ day: "2025-07-01", family, requests: 1 }));
  const folded = foldedRows(rows, colours, { xColumn: "day", seriesColumn: "family", valueColumn: "requests" });
  assert.deepEqual(folded.map((row) => [row.family, row.requests]), [
    ["f1", 1], ["f2", 1], ["f3", 1], ["f4", 1], ["f5", 1], ["f6", 1], ["f7", 1], ["f8", 1], ["f9", 1], ["f10", 1],
    ["Other", 2],
  ]);
});

test("rows sharing a bar and a series are summed into one, in order of first appearance", () => {
  const rows = [
    { month: "2025-08", endpoint: "m1", requests: 400 },
    { month: "2025-08", endpoint: "Other", requests: 30 },
    { month: "2025-08", endpoint: "Other", requests: 12 },
    { month: "2025-09", endpoint: "Other", requests: 7 },
    { month: "2025-09", endpoint: "m1", requests: 380 },
    { month: "2025-09", endpoint: "Other", requests: 5 },
  ];
  assert.deepEqual(sumFolded(rows, { xColumn: "month", seriesColumn: "endpoint", valueColumn: "requests" }), [
    { month: "2025-08", endpoint: "m1", requests: 400 },
    { month: "2025-08", endpoint: "Other", requests: 42 },
    { month: "2025-09", endpoint: "Other", requests: 12 },
    { month: "2025-09", endpoint: "m1", requests: 380 },
  ]);
  assert.equal(rows[1].requests, 30);
});

test("folding then summing leaves one Other row per bar", () => {
  const rows = [{ month: "2025-04", model: "m8", requests: 3 }, { month: "2025-04", model: "m9", requests: 4 }, { month: "2025-04", model: "m10", requests: 5 }];
  const summed = sumFolded(foldToOther(rows, "model", EIGHT_MODELS), {
    xColumn: "month", seriesColumn: "model", valueColumn: "requests",
  });
  assert.deepEqual(summed, [{ month: "2025-04", model: "m8", requests: 3 }, { month: "2025-04", model: "Other", requests: 9 }]);
});

test("a figure of fewer series than colours folds none", () => {
  const parts = new Map([["cached", "a"], ["uncached", "b"], ["unreported", "c"]]);
  const rows = [{ month: "2025-06", part: "unreported", tokens: 9 }, { month: "2025-06", part: "cached", tokens: 4 }];
  assert.deepEqual(foldedRows(rows, parts, { xColumn: "month", seriesColumn: "part", valueColumn: "tokens" }), rows);
});

test("the legend lists the folded series in the colours' order, Other among them, each by its label", () => {
  const colours = barColours(ORDER);
  const legend = stackedBarsLegend(ROWS, colours, { seriesColumn: "endpoint", labels: { e1: "One" } });
  assert.deepEqual(legend.series, [{ name: "e1", label: "One" }, { name: "Other", label: "Other" }]);
  assert.equal(legend.colours, colours);
});

test("a segment's tooltip names its series by its label where it has one, its bar and its value", () => {
  const columns = { xColumn: "month", seriesColumn: "endpoint", valueColumn: "requests", valueLabel: "Requests" };
  const row = { month: "2025-06", endpoint: "chat_stream", requests: 4120 };
  const valueFormat = (value) => value.toLocaleString("en-US");
  assert.equal(barTipText(row, { ...columns, valueFormat, labels: { chat_stream: "Chat stream" } }),
    "Chat stream\n2025-06\nRequests: 4,120");
  assert.equal(barTipText(row, { ...columns, valueFormat }), "chat_stream\n2025-06\nRequests: 4,120");
});
