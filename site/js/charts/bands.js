/**
 * The bands kind: a value's spread at each x, in one colour: a light band from the 10th to the 90th percentile, a
 * darker one from the 25th to the 75th, and a line at the median, on a linear or a log y axis; and the key naming the
 * two bands and the median (`bandKey`), which a card places where a legend would go.
 *
 * Its rows are a bands answer's, one per x: `x` (a month, a day or a bin) and its percentiles `p10`, `p25`, `p50`,
 * `p75` and `p90`, in order of `x`.
 */

import { logColumns, positiveRows, titledFrame } from "../shared/charts.js";
import { axisMark, axisScale, axisTicks, axisValueText, gridMark } from "../axes/ticks.js";
import { SERIES_SLOTS } from "../theme/colours.js";

/** The percentile columns of a bands answer, low to high, with the name the tooltip gives each. */
export const PERCENTILES = Object.freeze([
  Object.freeze({ column: "p10", label: "10th" }),
  Object.freeze({ column: "p25", label: "25th" }),
  Object.freeze({ column: "p50", label: "Median" }),
  Object.freeze({ column: "p75", label: "75th" }),
  Object.freeze({ column: "p90", label: "90th" }),
]);

// The 10th-to-90th band: light, so the inner band and the median read over it, yet seen on the dark scheme's card too.
const OUTER_BAND_OPACITY = 0.18;
const INNER_BAND_OPACITY = 0.25; // the 25th-to-75th band, drawn over the outer one
// How opaque the inner band reads where it lies over the outer one, as it always does: the key's swatch matches it.
const INNER_BAND_SEEN_OPACITY = 1 - (1 - OUTER_BAND_OPACITY) * (1 - INNER_BAND_OPACITY);
const MEDIAN_WIDTH = 2; // pixels; the median is the line a reader follows, so it is drawn heavier than Plot's 1.5

// The key's three entries, in the order it lists them: the outer band, the inner band and the median.
const KEY_ENTRIES = Object.freeze([
  Object.freeze({ label: "10th–90th percentile", opacity: OUTER_BAND_OPACITY, isLine: false }),
  Object.freeze({ label: "25th–75th", opacity: INNER_BAND_SEEN_OPACITY, isLine: false }),
  Object.freeze({ label: "Median", opacity: 1, isLine: true }),
]);

/**
 * Draw `rows` into `body` as the two bands and the median line, in the colour `parameters.colour` (a colour token,
 * the first series colour when not given), and return the chart. It has no series: `colours` and `hidden` are not
 * read. Its named parameters:
 * - `x`, `y`: the card's axis options (`axes/ticks.js`); on a log y axis, an x whose percentiles are not all above
 *   zero is not drawn.
 * - `valueLabel`: what a value is, the tooltip's heading under the x; `valueFormat`: how a percentile is written there.
 * - `margins`: Plot margins in place of the frame's.
 * - `height`: the chart's height in pixels, as every kind takes it (`titledFrame` of `shared/charts.js`).
 * Required: `valueLabel` and `valueFormat`.
 */
export async function drawBands(rows, body, colours, parameters) {
  const { x: xAxis = {}, y: yAxis = {}, margins } = parameters;
  const colour = bandsColour(parameters);
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const drawn = drawnBands(rows, parameters);
  const xValues = drawn.map((row) => row.x);
  const xTicks = axisTicks(xAxis, xValues);
  const yTicks = axisTicks(yAxis, [...drawn.map((row) => row.p10), ...drawn.map((row) => row.p90)]);
  const chart = Plot.plot({
    ...titledFrame(body, yAxis.label ?? null, margins, parameters.height),
    x: axisScale(xAxis, xValues),
    y: axisScale(yAxis),
    marks: [
      gridMark(Plot, "y", yTicks),
      axisMark(Plot, "x", xAxis, xTicks),
      axisMark(Plot, "y", yAxis, yTicks),
      Plot.areaY(drawn, { x: "x", y1: "p10", y2: "p90", fill: colour, fillOpacity: OUTER_BAND_OPACITY }),
      Plot.areaY(drawn, { x: "x", y1: "p25", y2: "p75", fill: colour, fillOpacity: INNER_BAND_OPACITY }),
      Plot.line(drawn, { x: "x", y: "p50", stroke: colour, strokeWidth: MEDIAN_WIDTH }),
      Plot.tip(drawn, Plot.pointerX({ x: "x", y: "p50", title: (row) => bandTipText(row, parameters) })),
    ],
  });
  body.replaceChildren(chart);
  return chart;
}

/** The colour a bands chart of the parameters `parameters` is drawn in: its `colour`, the first series slot's if none. */
export function bandsColour({ colour = SERIES_SLOTS[0] }) {
  return colour;
}

/**
 * The key of a bands chart drawn in `colour`: an element of the class `band-key` holding three entries, not buttons,
 * each a swatch drawn as its part of the chart is seen and its name: "10th–90th percentile" (a light square),
 * "25th–75th" (a darker square, as the inner band reads over the outer one) and "Median" (a short line).
 */
export function bandKey(colour) {
  const key = document.createElement("div");
  key.className = "band-key";
  for (const entry of KEY_ENTRIES) {
    const swatch = document.createElement("span");
    swatch.className = entry.isLine ? "legend-swatch is-line" : "legend-swatch";
    swatch.style.background = colour;
    swatch.style.opacity = String(entry.opacity);
    const item = document.createElement("span");
    item.className = "band-key-entry";
    item.append(swatch, entry.label);
    key.append(item);
  }
  return key;
}

/** The rows drawn: every row, or on a log y axis (`parameters.y.log`) those whose five percentiles are above zero. */
export function drawnBands(rows, { x: xAxis = {}, y: yAxis = {} }) {
  const percentiles = PERCENTILES.map((percentile) => percentile.column);
  return positiveRows(rows, logColumns({ x: xAxis, y: yAxis }, ["x"], percentiles));
}

/**
 * An x's tooltip: its x as the x axis writes it, after the axis's title, `valueLabel`, then each percentile, high to
 * low, as `valueFormat` writes it, "90th: 12.4k".
 */
export function bandTipText(row, { x: xAxis = {}, valueLabel, valueFormat }) {
  const lines = [axisValueText(xAxis, row.x), valueLabel];
  for (const { column, label } of [...PERCENTILES].reverse()) {
    lines.push(`${label}: ${valueFormat(row[column])}`);
  }
  return lines.join("\n");
}
