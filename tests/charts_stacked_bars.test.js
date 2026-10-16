import assert from "node:assert/strict";
import { test } from "node:test";

import {
  foldedRows, foldToOther, stackedBarsLegend, sumFolded,
} from "../site/js/charts/stacked_bars.js";
import { barColours } from "../site/js/theme/colours.js";

// Ten endpoint groups in their colour order: the ninth and tenth fold into Other.
const ORDER = ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "e10"];
// Nine models in their colour order: the ninth folds into Other.
const NINE_MODELS = ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9"];
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

test("names past the first eight fold into Other, and the rows are not changed in place", () => {
  const rows = [{ model: "m1", requests: 5 }, { model: "m9", requests: 3 }, { model: "unlisted", requests: 1 }];
  const folded = foldToOther(rows, "model", NINE_MODELS);
  assert.deepEqual(folded, [{ model: "m1", requests: 5 }, { model: "Other", requests: 3 }, { model: "Other", requests: 1 }]);
  assert.equal(rows[1].model, "m9");
});

test("folding counts the first eight distinct names, not the first eight entries", () => {
  const names = ["m1", "m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9"];
  const folded = foldToOther([{ model: "m8" }, { model: "m9" }], "model", names);
  assert.deepEqual(folded, [{ model: "m8" }, { model: "Other" }]);
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
  const summed = sumFolded(foldToOther(rows, "model", NINE_MODELS), {
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
