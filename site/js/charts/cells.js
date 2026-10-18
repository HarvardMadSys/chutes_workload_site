/**
 * The cells kind: a grid of rectangles, each shaded by its value on a sequential colour scale with its legend, over a
 * linear or a log axis on either side, or an axis of named categories.
 *
 * Its rows are a cells answer's, one per cell drawn: its edges `x_low`, `x_high`, `y_low` and `y_high`, and its
 * `value`. An axis of named categories has integer edges, the cell from i to i + 1 being the category i.
 */

import { haloedReferenceRule, REFERENCE_STYLE, sequentialColour, titledFrame } from "../plot/frame.js";
import { afterAxisTitle, axisMark, axisScale, axisText, axisTicks, colourLegendTicks, extent } from "../plot/axes.js";
import { logColumns, positiveRows } from "../shared/rows.js";

const DEFAULT_SCHEME = "YlOrRd"; // the paper's heatmaps' colour scheme, low values light
const CATEGORY_CENTRE = 0.5; // a category's tick sits halfway between its cell's integer edges

/**
 * Draw `rows` into `body` as one rectangle per row, filled by its value, and return the chart. It has no series:
 * `colours` and `hidden` are not read. Its named parameters:
 * - `x`, `y`: the card's axis options (`AxisOptions` of `plot/axes.js`); on a log axis, a cell with an edge at or
 *   below zero is not drawn. An axis's `categories` are its category names, in place of its ticks and their format,
 *   the cell from i to i + 1 named by the i-th, "Mon"; every category is labelled, or, where the axis gives `ticks`,
 *   those of its indices.
 * - `scheme`: the colour scheme, "YlOrRd" when not given; `schemeStart`: the point of it, from 0 to 1, the lowest
 *   value takes, its first colour when not given; `colourDomain`: the values at the scale's two ends, a cell beyond
 *   either taking that end's colour, the values' own when not given; `colourLog`: true for a log colour scale, on
 *   which a cell of value zero is not drawn; `colourScale`: Plot's colour scale type otherwise, linear when not given.
 * - `diagonal`: true to draw a dashed line where y equals x, as a figure of input against output tokens marks them
 *   equal.
 * - `yReference`: a y value at which a dashed horizontal rule is drawn across the cells, on a halo in the card's
 *   colour (`haloedReferenceRule` of `plot/frame.js`), as a coefficient of variation of 1 parts bursty from evenly
 *   spaced; none when not given.
 * - `valueLabel`: what a value is, the colour legend's title and the tooltip's; `valueFormat`: how it is written there.
 * - `margins`: Plot margins in place of the frame's.
 * - `height`: the chart's height in pixels, as every kind takes it (`titledFrame` of `plot/frame.js`).
 * Required: `valueLabel` and `valueFormat`.
 */
export async function drawCells(rows, body, colours, parameters) {
  const { margins } = parameters;
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const xAxis = categoryAxis(parameters.x ?? {});
  const yAxis = categoryAxis(parameters.y ?? {});
  const drawn = drawnCells(rows, { ...parameters, x: xAxis, y: yAxis });
  const xEdges = [...drawn.map((cell) => cell.x_low), ...drawn.map((cell) => cell.x_high)];
  const yEdges = [...drawn.map((cell) => cell.y_low), ...drawn.map((cell) => cell.y_high)];
  const xSpan = xAxis.domain ?? extent(xEdges);
  const ySpan = yAxis.domain ?? extent(yEdges);
  const diagonal = parameters.diagonal ? diagonalEnds(xSpan, ySpan) : [];
  const tipParameters = { ...parameters, x: xAxis, y: yAxis };
  const legendTicks = colourLegendTicks(parameters, drawn.map((cell) => cell.value));
  const chart = Plot.plot({
    ...titledFrame(body, yAxis.label ?? null, margins, parameters.height),
    x: axisScale(xAxis),
    y: axisScale(yAxis),
    color: sequentialColour(parameters, DEFAULT_SCHEME, legendTicks),
    marks: [
      Plot.rect(drawn, {
        x1: "x_low", x2: "x_high", y1: "y_low", y2: "y_high", fill: "value",
        shapeRendering: "crispEdges", // neighbouring cells meet without a seam of the card's colour between them
      }),
      Plot.line(diagonal, { x: "x", y: "y", ...REFERENCE_STYLE, clip: true }),
      haloedReferenceRule(Plot, parameters.yReference),
      axisMark(Plot, "x", xAxis, axisTicks(xAxis, xEdges)),
      axisMark(Plot, "y", yAxis, axisTicks(yAxis, yEdges)),
      Plot.tip(drawn, Plot.pointer({
        x1: "x_low", x2: "x_high", y1: "y_low", y2: "y_high", title: (cell) => cellTipText(cell, tipParameters),
      })),
    ],
  });
  body.replaceChildren(chart);
  return chart;
}

/**
 * The card's axis options `axis`, or, where it gives category names, `axis.categories`, the axis ticked at the middle
 * of each category's cell, of every category or of those whose indices `axis.ticks` lists, each tick written by its
 * category's name.
 */
export function categoryAxis(axis) {
  const { categories } = axis;
  if (categories === undefined) {
    return axis;
  }
  const labelled = axis.ticks ?? categories.map((category, index) => index);
  const ticks = labelled.map((index) => index + CATEGORY_CENTRE);
  return { ...axis, ticks, tickFormat: (tick) => categories[Math.floor(tick)] };
}

/**
 * The ends of the line where y equals x over an x axis spanning `[xLow, xHigh]` and a y axis spanning `[yLow, yHigh]`:
 * `[{ x, y }, { x, y }]`, from the higher of the two lows to the lower of the two highs.
 */
export function diagonalEnds([xLow, xHigh], [yLow, yHigh]) {
  const low = Math.max(xLow, yLow);
  const high = Math.min(xHigh, yHigh);
  return [{ x: low, y: low }, { x: high, y: high }];
}

/**
 * The cells drawn: every row, less those with an edge at or below zero on a log axis (`x.log`, `y.log`) and, on a log
 * colour scale (`colourLog`), those of value zero.
 */
export function drawnCells(rows, { x: xAxis = {}, y: yAxis = {}, colourLog = false }) {
  const columns = logColumns({ x: xAxis, y: yAxis }, ["x_low", "x_high"], ["y_low", "y_high"]);
  if (colourLog) {
    columns.push("value");
  }
  return positiveRows(rows, columns);
}

/**
 * A cell's tooltip: its x and its y, each a category's name on an axis of names, else its range, each edge written by
 * the axis's `tipFormat` where it gives one, else as its ticks are, "1k–2k", or its one value where both edges are
 * written alike, "100%"; each after the axis's title where it has one, "Input tokens: 1k–2k", since a range of two
 * values does not name itself; then its value, "Requests: 12.4k".
 */
export function cellTipText(cell, { x: xAxis = {}, y: yAxis = {}, valueLabel, valueFormat }) {
  const xText = edgesText(xAxis, cell.x_low, cell.x_high);
  const yText = edgesText(yAxis, cell.y_low, cell.y_high);
  return `${xText}\n${yText}\n${valueLabel}: ${valueFormat(cell.value)}`;
}

// An axis's part of a cell's tooltip: the category's name or the cell's range, after the axis's title where it has one.
function edgesText(axis, low, high) {
  const text = axis.categories === undefined ? rangeText(axis, low, high) : axis.categories[low];
  return afterAxisTitle(axis, text);
}

// The range from `low` to `high` as `axis` writes them in a tooltip, "30%–40%"; one value where the two read alike,
// "100%", since a range from a value to itself says nothing more.
function rangeText(axis, low, high) {
  const lowText = edgeText(axis, low);
  const highText = edgeText(axis, high);
  return lowText === highText ? lowText : `${lowText}–${highText}`;
}

// A cell's edge `value` as `axis` writes it in a tooltip: by its `tipFormat` where it gives one, else as its ticks.
function edgeText(axis, value) {
  return axis.tipFormat === undefined ? axisText(axis, value) : axis.tipFormat(value);
}
