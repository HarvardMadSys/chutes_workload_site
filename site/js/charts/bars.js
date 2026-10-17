/**
 * The bars kind: one bar per x of a panel, from zero to its value, in its series' colour; every panel of this site's
 * cards holds one series, so a panel's bars never stack.
 *
 * Its rows are a bars answer's, one per bar: `series` (the series' name), `x` (the bar's label, as a user's rank) and
 * `value`; a multi-panel figure's rows also name their `panel`.
 */

import { AXIS_STYLE, BAR_INSET, colourScale, distinct, referenceRule, titledFrame } from "../shared/charts.js";
import { axisMark, axisValueText, bandAxisMark, gridMark } from "../axes/ticks.js";
import { SERIES_COLUMN, shownSeriesRows } from "../shared/series.js";

const REFERENCE_LABEL_RISE = -4; // pixels a reference's label sits above its rule, so the dashes do not cross it
const LABEL_HALO_WIDTH = 3; // pixels of the card's colour around a reference's label, so a bar under it does not cross it

/**
 * Draw `rows` into `body`, one bar per row of the series of `colours.series` (a Map from series name to colour, in
 * legend order) not in `hidden`, and return the chart. Its named parameters:
 * - `x`: the bar axis's options `{ label, ticks, tickFormat, tickRotate }`, `tickRotate` slanting its labels.
 * - `y`: the value axis's options `{ label, domain, ticks, tickFormat }`, never a log one, since a bar starts at zero.
 * - `panel`: the panel drawn, of a multi-panel answer.
 * - `reference`: `{ value, label }`, a level the bars are read against, as an even split of requests: a dashed
 *   horizontal rule at `value`, its `label` in small text at the rule's right end, inside the plot; none when not given.
 * - `valueLabel`: what a value is, in the tooltip, "Share of requests: 12.4%"; `valueFormat`: how it is written there.
 * - `margins`: Plot margins in place of the frame's.
 * - `height`: the chart's height in pixels, as every kind takes it (`titledFrame` of `shared/charts.js`).
 * Required: `valueLabel` and `valueFormat`.
 */
export async function drawBars(rows, body, colours, parameters, hidden) {
  const { x: xAxis = {}, y: yAxis = {}, margins } = parameters;
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const bars = drawnBars(rows, colours.series, parameters, hidden);
  const names = distinct(bars.map((bar) => bar[SERIES_COLUMN]));
  const chart = Plot.plot({
    ...titledFrame(body, yAxis.label ?? null, margins, parameters.height),
    x: { type: "band", domain: distinct(bars.map((bar) => bar.x)) },
    y: { domain: yAxis.domain },
    color: colourScale(colours.series, names),
    marks: [
      gridMark(Plot, "y", yAxis.ticks),
      bandAxisMark(Plot, xAxis),
      axisMark(Plot, "y", yAxis, yAxis.ticks),
      Plot.barY(bars, { x: "x", y: "value", fill: SERIES_COLUMN, inset: BAR_INSET }),
      Plot.ruleY([0], AXIS_STYLE),
      ...referenceMarks(Plot, parameters.reference),
      Plot.tip(bars, Plot.pointerX({ x: "x", y: "value", title: (bar) => barTipText(bar, parameters) })),
    ],
  });
  body.replaceChildren(chart);
  return chart;
}

/**
 * The bars drawn, in their order: the rows of `parameters.panel` (all when not given), of the series `colours` names
 * (a Map from series name to colour) that are not in `hidden`.
 */
export function drawnBars(rows, colours, { panel }, hidden) {
  return shownSeriesRows(rows, colours, panel, hidden);
}

/**
 * The marks of a bars chart's `reference`, `{ value, label }`: its dashed rule (`referenceRule` of `shared/charts.js`)
 * and its label, right-aligned at the plot's right edge just above the rule, in the chart's label ink on a halo of the
 * card's colour; none where `reference` is not given.
 */
export function referenceMarks(Plot, reference) {
  if (reference === undefined) {
    return [];
  }
  const label = Plot.text([reference.label], {
    y: reference.value,
    text: Plot.identity,
    frameAnchor: "right",
    textAnchor: "end",
    dy: REFERENCE_LABEL_RISE,
    fill: "currentColor",
    stroke: "var(--color-surface)",
    strokeWidth: LABEL_HALO_WIDTH,
    paintOrder: "stroke",
  });
  return [referenceRule(Plot, reference.value), label];
}

/**
 * A bar's tooltip: its x as the x axis writes it, after the axis's title, and its value, "Share of requests: 12.4%".
 */
export function barTipText(bar, { x: xAxis = {}, valueLabel, valueFormat }) {
  return `${axisValueText(xAxis, bar.x)}\n${valueLabel}: ${valueFormat(bar.value)}`;
}
