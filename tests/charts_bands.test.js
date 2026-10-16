import assert from "node:assert/strict";
import { test } from "node:test";

import { bandTipText, drawnBands, PERCENTILES } from "../site/js/charts/bands.js";

const ROWS = [
  { x: "2025-06", p10: 0, p25: 40, p50: 300, p75: 2000, p90: 9000 },
  { x: "2025-07", p10: 12, p25: 50, p50: 320, p75: 2100, p90: 9500 },
];

test("the percentiles run from the 10th to the 90th, the median in the middle", () => {
  assert.deepEqual(PERCENTILES.map((percentile) => percentile.column), ["p10", "p25", "p50", "p75", "p90"]);
});

test("on a log y axis an x with a percentile at zero is not drawn; on a linear one every x is", () => {
  assert.deepEqual(drawnBands(ROWS, { y: { log: true } }), [ROWS[1]]);
  assert.deepEqual(drawnBands(ROWS, { y: {} }), ROWS);
  assert.deepEqual(drawnBands(ROWS, {}), ROWS);
});

test("an x's tooltip gives its x, what a value is, and its five percentiles from the 90th down", () => {
  const parameters = { valueLabel: "Input tokens", valueFormat: (value) => value.toLocaleString("en-US") };
  assert.equal(bandTipText(ROWS[1], parameters),
    "2025-07\nInput tokens\n90th: 9,500\n75th: 2,100\nMedian: 320\n25th: 50\n10th: 12");
});
