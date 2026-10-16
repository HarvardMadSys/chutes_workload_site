/**
 * The cells kind: a grid of rectangles, each shaded by its value on a sequential colour scale with its legend, over a
 * linear or a log axis on either side, or an axis of named categories.
 *
 * Its rows are a cells answer's, one per cell drawn: its edges `x_low`, `x_high`, `y_low` and `y_high`, and its
 * `value`. An axis of named categories has integer edges, the cell from i to i + 1 being the category i.
 */

import { logColumns, positiveRows, sequentialColour, titledFrame } from "../shared/charts.js";
import { afterAxisTitle, axisMark, axisScale, axisText, axisTicks, extent } from "../axes/ticks.js";

const DEFAULT_SCHEME = "YlOrRd"; // the paper's heatmaps' colour scheme, low values light
const CATEGORY_CENTRE = 0.5; // a category's tick sits halfway between its cell's integer edges
const DIAGONAL_DASH = "4,3"; // the dash and gap, in pixels, of the line where y equals x

/**
 * Draw `rows` into `body` as one rectangle per row, filled by its value, and return the chart. It has no series:
 * `colours` and `hidden` are not read. Its named parameters:
 * - `x`, `y`: the card's axis options `{ label, log, domain, ticks, tickFormat }`; on a log axis, a cell with an edge
 *   at or below zero is not drawn.
 * - `xTicks`, `yTicks`: an axis's category names, in place of its ticks and their format, the cell from i to i + 1
 *   named by the i-th, "Mon"; every category is labelled, or, where the axis gives `ticks`, those of its indices.
 * - `scheme`: the colour scheme, "YlOrRd" when not given; `schemeStart`: the point of it, from 0 to 1, the lowest
 *   value takes, its first colour when not given; `colourLog`: true for a log colour scale, on which a cell of value
 *   zero is not drawn; `colourScale`: Plot's colour scale type otherwise, linear when not given.
 * - `diagonal`: true to draw a dashed line where y equals x, as a figure of input against output tokens marks them
 *   equal.
 * - `valueLabel`: what a value is, the colour legend's title and the tooltip's; `valueFormat`: how it is written there.
 * - `margins`: Plot margins in place of the frame's.
 * Required: `valueLabel` and `valueFormat`.
 */
export async function drawCells(rows, body, colours, parameters) {
  const { margins } = parameters;
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const xAxis = categoryAxis(parameters.x ?? {}, parameters.xTicks);
  const yAxis = categoryAxis(parameters.y ?? {}, parameters.yTicks);
  const drawn = drawnCells(rows, { ...parameters, x: xAxis, y: yAxis });
  const xEdges = [...drawn.map((cell) => cell.x_low), ...drawn.map((cell) => cell.x_high)];
  const yEdges = [...drawn.map((cell) => cell.y_low), ...drawn.map((cell) => cell.y_high)];
  const xSpan = xAxis.domain ?? extent(xEdges);
  const ySpan = yAxis.domain ?? extent(yEdges);
  const diagonal = parameters.diagonal ? diagonalEnds(xSpan, ySpan) : [];
  const tipParameters = { ...parameters, x: xAxis, y: yAxis };
  const chart = Plot.plot({
    ...titledFrame(body, yAxis.label ?? null, margins),
    x: axisScale(xAxis),
    y: axisScale(yAxis),
    color: sequentialColour(parameters, DEFAULT_SCHEME),
    marks: [
      Plot.rect(drawn, {
        x1: "x_low", x2: "x_high", y1: "y_low", y2: "y_high", fill: "value",
        shapeRendering: "crispEdges", // neighbouring cells meet without a seam of the card's colour between them
      }),
      Plot.line(diagonal, { x: "x", y: "y", stroke: "currentColor", strokeDasharray: DIAGONAL_DASH, clip: true }),
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
 * The card's axis options `axis`, or, given category names `names`, an axis ticked at the middle of each category's
 * cell, of every category or of those whose indices `axis.ticks` lists, each tick written by its category's name;
 * `names` as the axis's `names`, for the tooltip.
 */
export function categoryAxis(axis, names) {
  if (names === undefined) {
    return axis;
  }
  const labelled = axis.ticks ?? names.map((name, index) => index);
  const ticks = labelled.map((index) => index + CATEGORY_CENTRE);
  return { ...axis, names, ticks, tickFormat: (tick) => names[Math.floor(tick)] };
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
 * A cell's tooltip: its x and its y, each a category's name on an axis of names, else its range as its axis writes
 * it, "1k–2k", after the axis's title where it has one, "Input tokens: 1k–2k"; then its value, "Requests: 12.4k".
 */
export function cellTipText(cell, { x: xAxis = {}, y: yAxis = {}, valueLabel, valueFormat }) {
  const xText = edgesText(xAxis, cell.x_low, cell.x_high);
  const yText = edgesText(yAxis, cell.y_low, cell.y_high);
  return `${xText}\n${yText}\n${valueLabel}: ${valueFormat(cell.value)}`;
}

// An axis's part of a cell's tooltip: the category's name or the cell's range, after the axis's title where it has one.
function edgesText(axis, low, high) {
  const text = axis.names === undefined ? `${axisText(axis, low)}–${axisText(axis, high)}` : axis.names[low];
  return afterAxisTitle(axis, text);
}
