/**
 * The stacked-bars kind: one stacked bar per value of a named x column, a day, a month or a bin, a segment per series,
 * every series its colours do not name folded into one "Other" segment.
 *
 * Its rows hold a column naming the row's bar, a column naming its series and a column of the segment's value, all
 * three named by the figure; a series may have several rows in one bar, which are summed once folded.
 */

import { AXIS_STYLE, BAR_INSET, colourScale, GRID_STYLE, titledFrame } from "../plot/frame.js";
import { axisValueText, axisWithTicks, TICK_COUNT } from "../plot/axes.js";
import { distinct } from "../shared/rows.js";
import { OTHER_NAME } from "../theme/colours.js";
import { seriesLabel, seriesLegend, shownRows } from "../shared/series.js";

// Joins a bar's x value and series name into one key when summing folded rows.
const KEY_SEPARATOR = "\u0000";

/**
 * Draw `rows` into `body` as one stacked bar per x value of the series not in `hidden`, bottom up in the order of their
 * legend's colours, `colours.series` (a Map from series name to colour). A series `colours.series` does not name is
 * not dropped but folded into "Other" (`foldedRows`), so a figure card's `series` cannot leave one out of its bars; a
 * figure whose legend names every series, as the monthly shares' does, folds none. Its named parameters:
 * - `xColumn`, `seriesColumn` and `valueColumn`: the columns holding a row's bar, its series and its value, a
 *   segment's height.
 * - `valueLabel`: what a value is, named in the tooltip, "Requests: 412".
 * - `yLabel`: the value axis's title, none when null or not given, where the card's title already says what the bars
 *   count.
 * - `valueFormat`: how a value is written in the tooltip; `yTickFormat`: on the value axis.
 * - `xLabel`: the x axis's title, none when null or not given; `xTickFormat`: how a tick is written, "" for an
 *   unlabelled one, and a bar's x in the tooltip, "Apr '25"; `xTipFormat`: how a bar's x is written in the tooltip
 *   where that differs from a tick's, alone, without the axis's title; `xTickRotate`: the angle of its ticks' labels
 *   in degrees, 0 (level) when not given, so that a label at every bar keeps clear of its neighbours.
 * - `xDomain`: every bar's x value, in order, each keeping its place even where no shown row falls on it; the shown
 *   rows' own x values when not given. `xTicks`: the x values ticked, every bar's when not given. `xInset`: the pixels
 *   the first and last bars sit in from the plot's edges, as an axis's `inset` (`plot/axes.js`), none when not given.
 * - `inset`: the pixels taken off the left and the right of a bar, `BAR_INSET` when not given; 0 where a bar is a
 *   pixel or two wide, as a day's is over a year.
 * - `segmentInset`: the pixels taken off the top and the bottom of each segment, `BAR_INSET` when not given; 0 where
 *   thin segments would vanish into their gaps, as a share's do.
 * - `margins`: Plot margins in place of the frame's, where the bars should take more of the card's width.
 * - `height`: the chart's height in pixels, as every kind takes it (`titledFrame` of `plot/frame.js`).
 * - `labels`: each series' label in the tooltip where it is written otherwise than its name, as the legend's `labels`.
 * Required: the three columns, `valueLabel` and `valueFormat`.
 * Needs the figure's legend: its colours are `colours.series`.
 */
export async function drawStackedBars(rows, body, colours, parameters, hidden) {
  const { xColumn, seriesColumn, valueColumn } = parameters;
  const { xLabel = null, yLabel = null, xTickFormat, xTickRotate = 0, yTickFormat, margins } = parameters;
  const { xDomain, xTicks, xInset = 0 } = parameters;
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const folded = foldedRows(rows, colours.series, { xColumn, seriesColumn, valueColumn });
  const shown = shownRows(folded, seriesColumn, hidden);
  const stacked = [...colours.series.keys()].filter((name) => shown.some((row) => row[seriesColumn] === name));
  const chart = Plot.plot({
    ...titledFrame(body, yLabel, margins, parameters.height),
    x: { type: "band", domain: xDomain ?? distinct(shown.map((row) => row[xColumn])), inset: xInset },
    color: colourScale(colours.series, stacked),
    marks: [
      Plot.gridY({ ...GRID_STYLE, ticks: TICK_COUNT }),
      axisWithTicks(Plot.axisX, xTicks, {
        ...AXIS_STYLE, tickFormat: xTickFormat, tickRotate: xTickRotate, label: xLabel,
      }),
      Plot.axisY({ ...AXIS_STYLE, ticks: TICK_COUNT, tickFormat: yTickFormat, label: yLabel }),
      Plot.barY(shown, {
        x: xColumn,
        y: valueColumn,
        fill: seriesColumn,
        order: stacked, // the stacking order, bottom up
        ...segmentInsets(parameters),
        title: (row) => barTipText(row, parameters),
        tip: true,
      }),
      Plot.ruleY([0], AXIS_STYLE),
    ],
  });
  body.replaceChildren(chart);
}

/**
 * The legend of stacked bars: `{ series, colours }`, the series of `colours` (a Map from series name to colour, in the
 * order the legend lists them) that the rows hold once folded, "Other" among them, each labelled by `labels` where it
 * has a label there, else by its name.
 */
export function stackedBarsLegend(rows, colours, { seriesColumn, labels = {} }) {
  const folded = foldToOther(rows, seriesColumn, [...colours.keys()]);
  return seriesLegend(folded, seriesColumn, colours, labels);
}

/**
 * The rows with each series `colours` does not name renamed "Other", and the rows sharing a bar and a
 * series summed into one on `valueColumn`, in order of first appearance.
 */
export function foldedRows(rows, colours, { xColumn, seriesColumn, valueColumn }) {
  const folded = foldToOther(rows, seriesColumn, [...colours.keys()]);
  return sumFolded(folded, { xColumn, seriesColumn, valueColumn });
}

/**
 * A copy of `rows` with `row[key]` replaced by "Other" where it is not one of `names`; a chart's colours name at most
 * the eight series slots, or the ten family slots, so no other series is drawn on its own.
 */
export function foldToOther(rows, key, names) {
  return rows.map((row) => (names.includes(row[key]) ? row : { ...row, [key]: OTHER_NAME }));
}

/**
 * The rows with every row sharing `row[xColumn]` and `row[seriesColumn]` summed into one on `row[valueColumn]`, in
 * order of first appearance.
 */
export function sumFolded(rows, { xColumn, seriesColumn, valueColumn }) {
  const sums = new Map();
  for (const row of rows) {
    // Two rows belong together when both their bar and their series match; the separator cannot occur in either.
    const barAndSeries = `${row[xColumn]}${KEY_SEPARATOR}${row[seriesColumn]}`;
    const sum = sums.get(barAndSeries);
    if (sum === undefined) {
      sums.set(barAndSeries, { ...row });
    } else {
      sum[valueColumn] += row[valueColumn];
    }
  }
  return [...sums.values()];
}

/**
 * Plot's insets of each segment for the parameters `inset` (off a bar's left and right) and `segmentInset` (off a
 * segment's top and bottom), each `BAR_INSET` when not given: `{ insetLeft, insetRight, insetTop, insetBottom }`.
 */
export function segmentInsets({ inset = BAR_INSET, segmentInset = BAR_INSET }) {
  return { insetLeft: inset, insetRight: inset, insetTop: segmentInset, insetBottom: segmentInset };
}

/**
 * A segment's tooltip, three lines: its series, by its label in `labels` where it has one there, its bar's x value
 * (`barXText`), and its value, "Requests: 412".
 */
export function barTipText(row, parameters) {
  const { xColumn, seriesColumn, valueColumn, valueLabel, valueFormat, labels = {} } = parameters;
  const series = seriesLabel(labels, row[seriesColumn]);
  const bar = barXText(row[xColumn], parameters);
  return `${series}\n${bar}\n${valueLabel}: ${valueFormat(row[valueColumn])}`;
}

/**
 * A bar's x value `x` as the tooltip writes it, as the x axis would (`axisValueText` of `plot/axes.js`): by
 * `xTipFormat` alone where given; else by `xTickFormat` (the value as it is when not given), after the axis's title
 * `xLabel` where it has one, "Month: Apr '25".
 */
export function barXText(x, { xLabel = null, xTickFormat = String, xTipFormat }) {
  return axisValueText({ label: xLabel, tickFormat: xTickFormat, tipFormat: xTipFormat }, x);
}
