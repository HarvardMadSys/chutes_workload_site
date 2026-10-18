/**
 * The lines kind: one line per series, in its legend's colour, over a linear or a log axis on either side; a CDF is a
 * lines chart of the share of a series' rows at or below each value, its points joined by straight lines (an answer's
 * points are percentiles, which the paper joins so), its y axis in percent.
 *
 * Its rows are a lines answer's, `series` (the series' name), `x` and `y`, or a CDF answer's, `series`, `x` (a value)
 * and `cdf` (the share at or below it), each series' points in order of `x`; a multi-panel figure's rows also name
 * their `panel`.
 */

import { colourScale, DASH, titledFrame } from "../plot/frame.js";
import { axisMark, axisScale, axisTicks, axisValueText, gridMark } from "../plot/axes.js";
import { nameChart } from "../shared/figure.js";
import { logColumns, positiveRows } from "../shared/rows.js";
import { formatPercent, formatShare } from "../shared/format.js";
import { SERIES_COLUMN, seriesLabel, shownSeriesRows } from "../shared/series.js";

const CDF_COLUMN = "cdf"; // the column of a CDF answer holding the share at or below each value

/** Every parameter a lines chart reads: the shared ones (`ChartParameters` of `plot/frame.js`), then its own. */
export const LINES_PARAMETERS = Object.freeze([
  "x", "y", "valueLabel", "valueFormat", "labels", "panel", "height", "margins", "name",
  "cdf", "series", "tipAllSeries", "markers", "dashed", "gap",
]);

/**
 * Reads `LINES_PARAMETERS`; the shared ones are `ChartParameters`'.
 * Draw `rows` into `body`, one line per series of `seriesColours` the rows hold, leaving out the series in `hidden`,
 * by the draw contract of `plot/frame.js`. On a log axis a row with a value at or below zero is not drawn, and a line
 * is cut at a given domain's ends. Its own parameters:
 * - `cdf`: true for a CDF answer, its `cdf` column drawn as y from 0 to 1, the axis in percent; its tooltip names the
 *   point nearest the pointer in x and y (`Plot.pointer`), another chart's the point nearest in x (`Plot.pointerX`);
 *   a CDF's value, in its tooltip, is its x.
 * - `series`: the names of the series drawn, a list, such as a panel's own (`chartParameters` of
 *   `insights/figure_card.js`); every series of `seriesColours` when not given. `hidden` still applies.
 * - `tipAllSeries`: true for a tooltip at the hovered x that lists every drawn series' value there, highest first
 *   (`allSeriesTipText`), for a lines answer (not a CDF) of few x values whose lines lie on one another.
 * - `markers`: true to mark each point with a dot.
 * - `dashed`: the names of the series drawn dashed, a list.
 * - `gap`: the largest step in x a line is drawn across; a series' line is broken between two points farther apart,
 *   where the answer has no row, as hours missing from an hourly line. Every step is drawn when not given.
 * Required: `valueLabel` and `valueFormat`.
 */
export async function drawLines(rows, body, seriesColours, parameters, hidden) {
  // The parameters with both axes as drawn, worked out once; every helper reads them.
  const chart = { ...parameters, x: parameters.x ?? {}, y: lineYAxis(parameters) };
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const drawn = drawnPoints(linePoints(rows, chart.cdf), seriesColours, chart, hidden);
  const names = drawnSeries(drawn, seriesColours);
  const xValues = drawn.map((row) => row.x);
  const xTicks = axisTicks(chart.x, xValues);
  const yTicks = axisTicks(chart.y, drawn.map((row) => row.y));
  const broken = brokenAtGaps(drawn, chart.gap);
  body.replaceChildren(Plot.plot({
    ...titledFrame(body, chart.y.label ?? null, chart.margins, chart.height),
    x: axisScale(chart.x, xValues),
    y: axisScale(chart.y),
    color: colourScale(seriesColours, names),
    marks: [
      gridMark(Plot, "x", xTicks),
      gridMark(Plot, "y", yTicks),
      axisMark(Plot, "x", chart.x, xTicks),
      axisMark(Plot, "y", chart.y, yTicks),
      ...names.map((name) => seriesLine(Plot, broken, name, chart)),
      lineTip(Plot, framedPoints(drawn, chart.x, chart.y), chart),
    ],
  }));
  nameChart(body, parameters.name);
}

/**
 * The rows a lines chart draws, each holding its value in `y`:
 * - a CDF answer's rows (`cdf`), each with its `cdf` copied to `y`;
 * - any other answer's rows, as they are.
 */
export function linePoints(rows, cdf = false) {
  if (!cdf) {
    return rows;
  }
  return rows.map((row) => ({ ...row, y: row[CDF_COLUMN] }));
}

/**
 * The y axis options a lines chart draws:
 * - for a CDF (`cdf`), the card's `y` over a share from 0 to 1, its ticks in percent unless `y.tickFormat` is given;
 * - for any other answer, the card's `y`.
 */
export function lineYAxis({ y: yAxis = {}, cdf = false }) {
  if (!cdf) {
    return yAxis;
  }
  return { tickFormat: formatPercent, ...yAxis, domain: [0, 1] };
}

/**
 * The line mark of the series `name` among `points` (the drawn points, broken at gaps): its points joined by straight
 * lines, a CDF's too, dashed where `chart.dashed` names it, a dot at each point where `chart.markers`, and clipped to
 * the frame where either of `chart`'s axes, as drawn, gives a domain.
 */
export function seriesLine(Plot, points, name, chart) {
  const { x: xAxis, y: yAxis, markers = false, dashed = [] } = chart;
  return Plot.line(points.filter((row) => row[SERIES_COLUMN] === name), {
    x: "x",
    y: "y",
    stroke: SERIES_COLUMN,
    strokeDasharray: seriesDash(name, dashed),
    curve: "linear",
    marker: markers,
    clip: xAxis.domain !== undefined || yAxis.domain !== undefined,
  });
}

/**
 * The tooltip mark of a lines chart over the `framed` points (`framedPoints`): one listing every series at the hovered
 * x where `chart.tipAllSeries` (`allSeriesTips`); else a point's own (`lineTipText`), the nearest in x and y for a CDF,
 * whose curves cross, and the nearest in x for any other.
 */
export function lineTip(Plot, framed, chart) {
  const { cdf = false, tipAllSeries = false } = chart;
  if (tipAllSeries) {
    return Plot.tip(allSeriesTips(framed, chart), Plot.pointerX({ x: "x", y: "y", title: "text" }));
  }
  const pointer = cdf ? Plot.pointer : Plot.pointerX;
  return Plot.tip(framed, pointer({ x: "x", y: "y", title: (row) => lineTipText(row, chart) }));
}

/** The dash pattern of the series `name`: `DASH` where `dashed`, a list of names, holds it, else none, a solid line. */
export function seriesDash(name, dashed) {
  return dashed.includes(name) ? DASH.join(",") : undefined;
}

/**
 * The points a lines chart draws, each holding its value in `y` (`linePoints`). A row is drawn when it is:
 * - of `chart.panel`, any panel when not given;
 * - of a series `seriesColours` names, in `chart.series` where given, and not in `hidden`;
 * - above zero in each column drawn on a log axis (`x` where `chart.x.log`, `y` where `chart.y.log`).
 */
export function drawnPoints(rows, seriesColours, { panel, series, x: xAxis = {}, y: yAxis = {} }, hidden) {
  const shown = shownSeriesRows(rows, seriesColours, panel, hidden);
  const named = series === undefined ? shown : shown.filter((row) => series.includes(row[SERIES_COLUMN]));
  return positiveRows(named, logColumns({ x: xAxis, y: yAxis }, ["x"], ["y"]));
}

/**
 * The tooltips of a chart whose tooltip lists every series (`tipAllSeries`): one per x value of `points`, in the order
 * of their first appearance, `{ x, y, text }`, `y` the highest value there, where the tooltip points, and `text` its
 * lines (`allSeriesTipText`).
 */
export function allSeriesTips(points, parameters) {
  const pointsByX = new Map();
  for (const point of points) {
    if (!pointsByX.has(point.x)) {
      pointsByX.set(point.x, []);
    }
    pointsByX.get(point.x).push(point);
  }
  const tips = [];
  for (const [x, pointsAtX] of pointsByX) {
    const highest = Math.max(...pointsAtX.map((point) => point.y));
    tips.push({ x, y: highest, text: allSeriesTipText(x, pointsAtX, parameters) });
  }
  return tips;
}

/**
 * The tooltip at `x` of a chart that lists every series there: `x` as `axisValueText` writes it, then one line per
 * point of `points` (the points at `x`), highest value first, its series' label (from `labels` where it has
 * one there) and its value: "Cache size: 315.4k", "Belady 0.923", "LRU 0.871".
 */
export function allSeriesTipText(x, points, { x: xAxis = {}, valueFormat, labels = {} }) {
  const highestFirst = [...points].sort((first, second) => second.y - first.y);
  const lines = [axisValueText(xAxis, x)];
  for (const point of highestFirst) {
    lines.push(`${seriesLabel(labels, point[SERIES_COLUMN])} ${valueFormat(point.y)}`);
  }
  return lines.join("\n");
}

/**
 * The points a tooltip may name: those of `points` within the x axis's `domain` and, by their `y`, the y axis's, where
 * the axis gives one: the part of the lines the frame shows, the rest being clipped.
 */
export function framedPoints(points, xAxis, yAxis) {
  return points.filter((point) => isWithin(point.x, xAxis.domain) && isWithin(point.y, yAxis.domain));
}

/**
 * The `points` with, between two neighbouring points of one series whose x values are more than `gap` apart, a point
 * of the first's series and x whose `y` is NaN, where Plot breaks the line; `points` as they are when `gap` is not
 * given. The points are read in their order, each series' in order of x, as an answer holds them.
 */
export function brokenAtGaps(points, gap) {
  if (gap === undefined) {
    return points;
  }
  const broken = [];
  for (const [index, point] of points.entries()) {
    const previous = points[index - 1];
    const isSameSeries = previous !== undefined && previous[SERIES_COLUMN] === point[SERIES_COLUMN];
    if (isSameSeries && point.x - previous.x > gap) {
      broken.push({ [SERIES_COLUMN]: previous[SERIES_COLUMN], x: previous.x, y: NaN });
    }
    broken.push(point);
  }
  return broken;
}

/** The series of `seriesColours` that `points` hold, in its order. */
export function drawnSeries(points, seriesColours) {
  const present = new Set(points.map((point) => point[SERIES_COLUMN]));
  return [...seriesColours.keys()].filter((name) => present.has(name));
}

/**
 * A point's tooltip, three lines: its series' label (from `labels` where it has one there, else its name), then its x
 * as `axisValueText` writes it, and its value, "Requests: 4.9M"; for a CDF, its value and the share
 * at or below it, "Input tokens: 1.2k", "45.0% at or below".
 */
export function lineTipText(row, { x: xAxis = {}, cdf = false, valueLabel, valueFormat, labels = {} }) {
  const series = seriesLabel(labels, row[SERIES_COLUMN]);
  if (cdf) {
    return `${series}\n${valueLabel}: ${valueFormat(row.x)}\n${formatShare(row.y)} at or below`;
  }
  return `${series}\n${axisValueText(xAxis, row.x)}\n${valueLabel}: ${valueFormat(row.y)}`;
}

// True when `value` lies within `domain`, `[low, high]`, both ends included, or when there is no domain.
function isWithin(value, domain) {
  return domain === undefined || (value >= domain[0] && value <= domain[1]);
}
