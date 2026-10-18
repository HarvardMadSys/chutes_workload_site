/**
 * The stacked-bars kind: one stacked bar per value of a named x column, a day, a month or a bin, a segment per series,
 * every series its colours do not name folded into one "Other" segment.
 *
 * Its rows hold a column naming the row's bar, a column naming its series and a column of the segment's value, all
 * three named by the figure; a series may have several rows in one bar, which are summed once folded.
 */

import { AXIS_STYLE, BAR_INSET, colourScale, titledFrame } from "../plot/frame.js";
import { axisMark, axisValueText, bandAxisMark, gridMark } from "../plot/axes.js";
import { nameChart } from "../shared/figure.js";
import { distinct } from "../shared/rows.js";
import { OTHER_NAME } from "../theme/colours.js";
import { seriesLabel, seriesLegend, shownRows } from "../shared/series.js";

// Joins a bar's x value and series name into one key when summing folded rows.
const KEY_SEPARATOR = "\u0000";

/** Every parameter stacked bars read: the shared ones (`ChartParameters` of `plot/frame.js`), then their own. */
export const STACKED_BARS_PARAMETERS = Object.freeze([
  "x", "y", "valueLabel", "valueFormat", "labels", "height", "margins", "name",
  "xColumn", "seriesColumn", "valueColumn", "barInset", "segmentInset",
]);

/**
 * Reads `STACKED_BARS_PARAMETERS`; the shared ones are `ChartParameters`'.
 * Draw `rows` into `body` as one stacked bar per x value of the series not in `hidden`, bottom up in the order of
 * `seriesColours`, by the draw contract of `plot/frame.js`. A series `seriesColours` does not name is folded into
 * "Other" (`foldedRows`), so a figure card's `series` cannot leave one out of its bars; a figure whose legend names
 * every series, as the monthly shares' does, folds none. The x axis is a band axis, of the bars:
 * - its `domain` is every bar's x value, in order, each keeping its place where no shown row falls on it; the shown
 *   rows' own x values when not given;
 * - its `ticks` are every bar's x value when not given;
 * - its `tickFormat` writes "" for an unlabelled tick.
 * The y axis is the value axis, untitled where the card's title says what the bars count. Its own parameters:
 * - `xColumn`, `seriesColumn` and `valueColumn`: the columns holding a row's bar, its series and its value, a
 *   segment's height.
 * - `barInset`: the pixels taken off the left and the right of a bar, `BAR_INSET` when not given; 0 where a bar is a
 *   pixel or two wide, as a day's is over a year.
 * - `segmentInset`: the pixels taken off the top and the bottom of each segment, `BAR_INSET` when not given; 0 where
 *   thin segments would vanish into their gaps, as a share's do.
 * Required: the three columns, `valueLabel` and `valueFormat`.
 * Needs the figure's legend: its colours are `seriesColours`.
 */
export async function drawStackedBars(rows, body, seriesColours, parameters, hidden) {
  const { xColumn, seriesColumn, valueColumn, x = {}, y = {}, margins } = parameters;
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const folded = foldedRows(rows, seriesColours, { xColumn, seriesColumn, valueColumn });
  const shown = shownRows(folded, seriesColumn, hidden);
  const stacked = [...seriesColours.keys()].filter((name) => shown.some((row) => row[seriesColumn] === name));
  body.replaceChildren(Plot.plot({
    ...titledFrame(body, y.label ?? null, margins, parameters.height),
    x: { type: "band", domain: x.domain ?? distinct(shown.map((row) => row[xColumn])), inset: x.inset ?? 0 },
    color: colourScale(seriesColours, stacked),
    marks: [
      gridMark(Plot, "y"),
      bandAxisMark(Plot, x),
      axisMark(Plot, "y", y),
      Plot.barY(shown, {
        x: xColumn,
        y: valueColumn,
        fill: seriesColumn,
        order: stacked, // the stacking order, bottom up
        ...segmentInsets(parameters),
        title: (row) => stackedBarTipText(row, parameters),
        tip: true,
      }),
      Plot.ruleY([0], AXIS_STYLE),
    ],
  }));
  nameChart(body, parameters.name);
}

/**
 * The legend of stacked bars: `{ series, colours }`, the series of `seriesColours`, in its order, that the rows hold
 * once folded, "Other" among them, each labelled by `labels` where it has a label there, else by its name.
 */
export function stackedBarsLegend(rows, seriesColours, { seriesColumn, labels = {} }) {
  const folded = foldToOther(rows, seriesColumn, [...seriesColours.keys()]);
  return seriesLegend(folded, seriesColumn, seriesColours, labels);
}

/**
 * The rows with each series `seriesColours` does not name renamed "Other", and the rows sharing a bar and a
 * series summed into one on `valueColumn`, in order of first appearance.
 */
export function foldedRows(rows, seriesColours, { xColumn, seriesColumn, valueColumn }) {
  const folded = foldToOther(rows, seriesColumn, [...seriesColours.keys()]);
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
 * Plot's insets of each segment for the parameters `barInset` (off a bar's left and right) and `segmentInset` (off a
 * segment's top and bottom), each `BAR_INSET` when not given: `{ insetLeft, insetRight, insetTop, insetBottom }`.
 */
export function segmentInsets({ barInset = BAR_INSET, segmentInset = BAR_INSET }) {
  return { insetLeft: barInset, insetRight: barInset, insetTop: segmentInset, insetBottom: segmentInset };
}

/**
 * A segment's tooltip, three lines: its series, by its label in `labels` where it has one there, its bar's x value as
 * the x axis writes it in a tooltip (`axisValueText` of `plot/axes.js`), "Month: Apr '25", and its value,
 * "Requests: 412".
 */
export function stackedBarTipText(row, parameters) {
  const { xColumn, seriesColumn, valueColumn, valueLabel, valueFormat, labels = {}, x = {} } = parameters;
  const series = seriesLabel(labels, row[seriesColumn]);
  const bar = axisValueText(x, row[xColumn]);
  return `${series}\n${bar}\n${valueLabel}: ${valueFormat(row[valueColumn])}`;
}
