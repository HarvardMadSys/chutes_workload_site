/**
 * The lines kind: one line per series, in its legend's colour, over a linear or a log axis on either side; a CDF is a
 * lines chart of the share of a series' rows at or below each value, stepped, its y axis in percent.
 *
 * Its rows are a lines answer's, `series` (the series' name), `x` and `y`, or a CDF answer's, `series`, `x` (a value)
 * and `cdf` (the share at or below it), each series' points in order of `x`; a multi-panel figure's rows also name
 * their `panel`.
 */

import { colourScale, logColumns, positiveRows, titledFrame } from "../shared/charts.js";
import { formatPercent, formatShare } from "../shared/format.js";
import { axisMark, axisScale, axisText, axisTicks, gridMark } from "../axes/ticks.js";
import { SERIES_COLUMN, seriesLabel, shownSeriesRows } from "../shared/series.js";

const CDF_COLUMN = "cdf"; // the column of a CDF answer holding the share at or below each value
const DASH = "4,3"; // the dash and gap, in pixels, of a series drawn dashed

/**
 * Draw `rows` into `body`, one line per series of `colours.series` (a Map from series name to colour, in legend order)
 * the rows hold, leaving out the series in `hidden`, and return the chart. Its named parameters:
 * - `x`, `y`: the card's axis options `{ label, log, domain, ticks, tickFormat }`; a row with a value at or below zero
 *   on a log axis is not drawn, and a line is cut at a given domain's ends.
 * - `cdf`: true for a CDF answer, its `cdf` column drawn as y from 0 to 1, stepped, the axis in percent.
 * - `markers`: true to mark each point with a dot.
 * - `dashed`: the names of the series drawn dashed, a list.
 * - `valueLabel`, `valueFormat`: what a value is and how it is written in the tooltip, "Requests: 4.9M"; a CDF's value
 *   is its x.
 * - `labels`: each series' label in the tooltip where it is written otherwise than its name.
 * - `panel`: the panel drawn, of a multi-panel answer. `margins`: Plot margins in place of the frame's.
 * Required: `valueLabel` and `valueFormat`.
 */
export async function drawLines(rows, body, colours, parameters, hidden) {
  const { x: xAxis = {}, cdf = false, markers = false, dashed = [], margins } = parameters;
  const yAxis = lineYAxis(parameters);
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const drawn = drawnPoints(rows, colours.series, { ...parameters, x: xAxis, y: yAxis }, hidden);
  const names = drawnSeries(drawn, colours.series);
  const xValues = drawn.map((row) => row.x);
  const xTicks = axisTicks(xAxis, xValues);
  const yTicks = axisTicks(yAxis, drawn.map((row) => row[yColumn(cdf)]));
  const lines = names.map((name) => Plot.line(drawn.filter((row) => row[SERIES_COLUMN] === name), {
    x: "x",
    y: yColumn(cdf),
    stroke: SERIES_COLUMN,
    strokeDasharray: seriesDash(name, dashed),
    curve: cdf ? "step-after" : "linear",
    marker: markers,
    clip: xAxis.domain !== undefined || yAxis.domain !== undefined,
  }));
  const chart = Plot.plot({
    ...titledFrame(body, yAxis.label ?? null, margins),
    x: axisScale(xAxis, xValues),
    y: axisScale(yAxis),
    color: colourScale(colours.series, names),
    marks: [
      gridMark(Plot, "x", xTicks),
      gridMark(Plot, "y", yTicks),
      axisMark(Plot, "x", xAxis, xTicks),
      axisMark(Plot, "y", yAxis, yTicks),
      ...lines,
      Plot.tip(drawn, Plot.pointerX({ x: "x", y: yColumn(cdf), title: (row) => lineTipText(row, parameters) })),
    ],
  });
  body.replaceChildren(chart);
  return chart;
}

/**
 * The y axis options a lines chart draws: the card's `y`; for a CDF (`cdf`), a share from 0 to 1, its ticks in percent
 * unless the card writes them otherwise.
 */
export function lineYAxis({ y: yAxis = {}, cdf = false }) {
  if (!cdf) {
    return yAxis;
  }
  return { tickFormat: formatPercent, ...yAxis, domain: [0, 1] };
}

/** The dash pattern of the series `name`: `DASH` where `dashed`, a list of names, holds it, else none, a solid line. */
export function seriesDash(name, dashed) {
  return dashed.includes(name) ? DASH : undefined;
}

/** The column a lines answer holds its y in: `cdf` for a CDF answer, else `y`. */
export function yColumn(cdf) {
  return cdf ? CDF_COLUMN : "y";
}

/**
 * The points drawn: the rows of `parameters.panel` (all when not given), of the series `colours` names (a Map from
 * series name to colour) that are not in `hidden`, with a value above zero in every column drawn on a log axis (`x`
 * where `parameters.x.log`, the y column where `parameters.y.log`).
 */
export function drawnPoints(rows, colours, { panel, x: xAxis = {}, y: yAxis = {}, cdf = false }, hidden) {
  const shown = shownSeriesRows(rows, colours, panel, hidden);
  return positiveRows(shown, logColumns({ x: xAxis, y: yAxis }, ["x"], [yColumn(cdf)]));
}

/** The series of `colours` (a Map from series name to colour, in legend order) that `points` hold, in that order. */
export function drawnSeries(points, colours) {
  const present = new Set(points.map((point) => point[SERIES_COLUMN]));
  return [...colours.keys()].filter((name) => present.has(name));
}

/**
 * A point's tooltip, three lines: its series' label (from `labels` where it has one there, else its name), then its x
 * as the x axis writes it and its value, "Requests: 4.9M"; for a CDF, its value and the share at or below it,
 * "Input tokens: 1.2k", "45.0% at or below".
 */
export function lineTipText(row, { x: xAxis = {}, cdf = false, valueLabel, valueFormat, labels = {} }) {
  const series = seriesLabel(labels, row[SERIES_COLUMN]);
  if (cdf) {
    return `${series}\n${valueLabel}: ${valueFormat(row.x)}\n${formatShare(row[CDF_COLUMN])} at or below`;
  }
  return `${series}\n${axisText(xAxis, row.x)}\n${valueLabel}: ${valueFormat(row.y)}`;
}
