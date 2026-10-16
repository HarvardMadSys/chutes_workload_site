/**
 * The boxes kind: one box per series, in its legend's colour and order: a rule from its low whisker to its high one, a
 * box from the 25th percentile to the 75th, and a tick at the median, on a linear or a log y axis.
 *
 * Its rows are a boxes answer's, one per series: `series` (the series' name), its statistics `low`, `q1`, `median`,
 * `q3` and `high`, and `count`, the values they summarise.
 */

import { colourScale, logColumns, positiveRows, titledFrame } from "../shared/charts.js";
import { axisMark, axisScale, axisTicks, bandAxisMark, gridMark } from "../axes/ticks.js";
import { formatCount } from "../shared/format.js";
import { shownRows } from "../shared/series.js";

const SERIES_COLUMN = "series"; // the column of a boxes answer naming each box's series
/** The statistics of a box, high to low, with the name the tooltip gives each. */
export const STATISTICS = Object.freeze([
  Object.freeze({ column: "high", label: "High" }),
  Object.freeze({ column: "q3", label: "75th" }),
  Object.freeze({ column: "median", label: "Median" }),
  Object.freeze({ column: "q1", label: "25th" }),
  Object.freeze({ column: "low", label: "Low" }),
]);
const BOX_OPACITY = 0.55; // a box is a tint of its colour, so the median's tick reads over it
const BOX_PADDING = 0.4; // the share of each band left empty around its box
const MEDIAN_WIDTH = 2; // pixels; the median's tick, thicker than the whiskers

/**
 * Draw `rows` into `body`, one box per series of `colours.series` (a Map from series name to colour, in legend order)
 * the rows hold, leaving out the series in `hidden`, and return the chart. Its named parameters:
 * - `x`: the box axis's options `{ label, tickRotate }`, `tickRotate` slanting the series' names.
 * - `y`: the card's axis options `{ label, log, domain, ticks, tickFormat }`; on a log y axis, a box with a statistic
 *   at or below zero is not drawn.
 * - `labels`: each series' label on the axis and in the tooltip where it is written otherwise than its name.
 * - `valueLabel`: what a value is, the tooltip's heading; `valueFormat`: how a statistic is written there.
 * - `margins`: Plot margins in place of the frame's.
 * Required: `valueLabel` and `valueFormat`.
 */
export async function drawBoxes(rows, body, colours, parameters, hidden) {
  const { x: xAxis = {}, y: yAxis = {}, labels = {}, margins } = parameters;
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const boxes = drawnBoxes(rows, colours.series, parameters, hidden);
  const names = boxes.map((box) => box[SERIES_COLUMN]);
  const yTicks = axisTicks(yAxis, [...boxes.map((box) => box.low), ...boxes.map((box) => box.high)]);
  const chart = Plot.plot({
    ...titledFrame(body, yAxis.label ?? null, margins),
    x: { type: "band", domain: names, padding: BOX_PADDING },
    y: axisScale(yAxis),
    color: colourScale(colours.series, names),
    marks: [
      gridMark(Plot, "y", yTicks),
      bandAxisMark(Plot, xAxis, (name) => seriesLabel(name, labels)),
      axisMark(Plot, "y", yAxis, yTicks),
      Plot.ruleX(boxes, { x: SERIES_COLUMN, y1: "low", y2: "high", stroke: SERIES_COLUMN }),
      Plot.barY(boxes, { x: SERIES_COLUMN, y1: "q1", y2: "q3", fill: SERIES_COLUMN, fillOpacity: BOX_OPACITY }),
      Plot.tickY(boxes, { x: SERIES_COLUMN, y: "median", stroke: "currentColor", strokeWidth: MEDIAN_WIDTH }),
      Plot.tip(boxes, Plot.pointerX({ x: SERIES_COLUMN, y: "median", title: (box) => boxTipText(box, parameters) })),
    ],
  });
  body.replaceChildren(chart);
  return chart;
}

/**
 * The boxes drawn, in the order of `colours` (a Map from series name to colour): the rows of the series it names that
 * are not in `hidden`, less, on a log y axis (`parameters.y.log`), those with a statistic at or below zero.
 */
export function drawnBoxes(rows, colours, { y: yAxis = {} }, hidden) {
  const shown = shownRows(rows, SERIES_COLUMN, hidden);
  const placed = positiveRows(shown, logColumns({ y: yAxis }, [], STATISTICS.map((statistic) => statistic.column)));
  const boxes = [];
  for (const name of colours.keys()) {
    boxes.push(...placed.filter((row) => row[SERIES_COLUMN] === name));
  }
  return boxes;
}

/** A series' label: `labels[name]` where it has one there, else its name. */
export function seriesLabel(name, labels) {
  return Object.hasOwn(labels, name) ? labels[name] : name;
}

/** A box's tooltip: its series' label, `valueLabel`, its five statistics from the high whisker down, and its count. */
export function boxTipText(box, { valueLabel, valueFormat, labels = {} }) {
  const lines = [seriesLabel(box[SERIES_COLUMN], labels), valueLabel];
  for (const { column, label } of STATISTICS) {
    lines.push(`${label}: ${valueFormat(box[column])}`);
  }
  lines.push(`Count: ${formatCount(box.count)}`);
  return lines.join("\n");
}
