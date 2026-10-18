import assert from "node:assert/strict";
import { test } from "node:test";

import { bandKey, bandsColour, bandTipText, drawnBands } from "../site/js/charts/bands.js";
import { SERIES_SLOTS } from "../site/js/theme/colours.js";
import { useFakePage } from "./fake_page.js";

const ROWS = [
  { x: "2025-06", p10: 0, p25: 40, p50: 300, p75: 2000, p90: 9000 },
  { x: "2025-07", p10: 12, p25: 50, p50: 320, p75: 2100, p90: 9500 },
];

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

test("an x's tooltip writes its x after the x axis's title where the axis has one", () => {
  const xAxis = { label: "Trace month", tickFormat: String };
  const parameters = { x: xAxis, valueLabel: "Input tokens", valueFormat: String };
  const row = { x: 8, p10: 1, p25: 2, p50: 3, p75: 4, p90: 5 };
  assert.match(bandTipText(row, parameters), /^Trace month: 8\nInput tokens\n/);
});

test("a bands chart is drawn in its card's colour, the first series slot's when it gives none", () => {
  assert.equal(bandsColour({ colour: "var(--series-2)" }), "var(--series-2)");
  assert.equal(bandsColour({}), SERIES_SLOTS[0]);
});

test("the key lists a light band, a darker band and the median line, in the chart's colour and opacities", (context) => {
  useFakePage(context);
  const key = bandKey("var(--series-2)");
  assert.equal(key.className, "band-key");
  const [outer, inner, median] = key.children.map((entry) => entry.children[0]);
  assert.deepEqual(key.children.map((entry) => entry.children[1]), ["10th–90th percentile", "25th–75th", "Median"]);
  // The inner swatch is as opaque as the inner band reads over the outer one: 1 - 0.82 × 0.75.
  const opacities = [outer, inner, median].map((swatch) => Number(swatch.style.opacity).toFixed(2));
  assert.deepEqual(opacities, ["0.18", "0.39", "1.00"]);
  assert.equal(median.className, "legend-swatch is-line");
  assert.ok([outer, inner, median].every((swatch) => swatch.style.background === "var(--series-2)"));
});
