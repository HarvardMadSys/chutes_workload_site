/**
 * The scatter kind: one dot per row at its x and y, over a linear or a log axis on either side, filled by its value on
 * a diverging colour scale centred on zero, with its legend; each dot is outlined, so a value near zero, which the
 * scheme draws near white, is seen on either scheme's card.
 *
 * Its rows are a scatter answer's, one per point: `x`, `y` and its `value`, as a correlation from -1 to 1.
 */

import { AXIS_STYLE, logColumns, positiveRows, referenceRule, titledFrame } from "../shared/charts.js";
import { axisMark, axisScale, axisTicks, axisValueText, gridMark } from "../axes/ticks.js";

const DEFAULT_SCHEME = "RdBu"; // a scatter's diverging colour scheme when the card names none
const DOT_RADIUS = 2; // pixels; small, so that thousands of points overlap little
const DOT_OUTLINE_WIDTH = 0.5; // pixels of axis ink around a dot, so a near-white dot shows on a white card
const DOT_OPACITY = 0.7; // a dot's fill opacity, so that dots lying on one another show through

/**
 * Draw `rows` into `body` as one dot per row, and return the chart. It has no series: `colours` and `hidden` are not
 * read. Its named parameters:
 * - `x`, `y`: the card's axis options (`axes/ticks.js`); on a log axis, a point at or below zero is not drawn.
 * - `scheme`: the diverging colour scheme, "RdBu" when not given; `colourDomain`: the values at its two ends, as
 *   `[-1, 1]`, else the values' own, centred on zero.
 * - `yReference`: a y value at which a dashed horizontal rule is drawn under the dots (`referenceRule` of
 *   `shared/charts.js`); none when not given.
 * - `valueLabel`: what a value is, the colour legend's title and the tooltip's; `valueFormat`: how it is written there.
 * - `margins`: Plot margins in place of the frame's.
 * - `height`: the chart's height in pixels, as every kind takes it (`titledFrame` of `shared/charts.js`).
 * Required: `valueLabel` and `valueFormat`.
 */
export async function drawScatter(rows, body, colours, parameters) {
  const { x: xAxis = {}, y: yAxis = {}, margins } = parameters;
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const drawn = drawnPoints(rows, parameters);
  const xTicks = axisTicks(xAxis, drawn.map((point) => point.x));
  const yTicks = axisTicks(yAxis, drawn.map((point) => point.y));
  const chart = Plot.plot({
    ...titledFrame(body, yAxis.label ?? null, margins, parameters.height),
    x: axisScale(xAxis),
    y: axisScale(yAxis),
    color: divergingColour(parameters),
    marks: [
      gridMark(Plot, "x", xTicks),
      gridMark(Plot, "y", yTicks),
      axisMark(Plot, "x", xAxis, xTicks),
      axisMark(Plot, "y", yAxis, yTicks),
      referenceRule(Plot, parameters.yReference),
      pointDots(Plot, drawn),
      Plot.tip(drawn, Plot.pointer({ x: "x", y: "y", title: (point) => pointTipText(point, parameters) })),
    ],
  });
  body.replaceChildren(chart);
  return chart;
}

/**
 * The dot mark of the `points` drawn: each at its x and y, filled by its value at `DOT_OPACITY`, outlined in the axis
 * ink, `DOT_OUTLINE_WIDTH` pixels wide.
 */
export function pointDots(Plot, points) {
  return Plot.dot(points, {
    x: "x",
    y: "y",
    fill: "value",
    fillOpacity: DOT_OPACITY,
    stroke: AXIS_STYLE.stroke,
    strokeWidth: DOT_OUTLINE_WIDTH,
    r: DOT_RADIUS,
  });
}

/** The points drawn: every row, less those at or below zero on a log axis (`x.log`, `y.log`). */
export function drawnPoints(rows, { x: xAxis = {}, y: yAxis = {} }) {
  return positiveRows(rows, logColumns({ x: xAxis, y: yAxis }, ["x"], ["y"]));
}

/**
 * Plot's diverging colour scale for the card's parameters: the scheme `scheme` ("RdBu" when not given) centred on
 * zero, from `colourDomain` where given, with its legend titled `valueLabel` and its ticks written by `valueFormat`.
 */
export function divergingColour({ scheme = DEFAULT_SCHEME, colourDomain, valueLabel, valueFormat }) {
  return {
    type: "diverging",
    scheme,
    pivot: 0,
    domain: colourDomain,
    legend: true,
    label: valueLabel,
    tickFormat: valueFormat,
  };
}

/** A point's tooltip: its x and its y as their axes write them, after each axis's title, and its value. */
export function pointTipText(point, { x: xAxis = {}, y: yAxis = {}, valueLabel, valueFormat }) {
  const value = `${valueLabel}: ${valueFormat(point.value)}`;
  return `${axisValueText(xAxis, point.x)}\n${axisValueText(yAxis, point.y)}\n${value}`;
}
