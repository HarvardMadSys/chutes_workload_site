/**
 * The raster kind: a dense grid of cells, one per column and row, each shaded by its value on a sequential colour
 * scale with its legend, drawn as one image on a canvas; a cell no row names is left empty. It has no tooltip.
 *
 * Its rows are a raster answer's, one per cell holding a value: `x` and `y`, the cell's column and row (integers from
 * 0, as an hour of a window and a user's or a model's rank), and its `value`. Row 0 is drawn at the bottom.
 */

import { sequentialColour, titledFrame } from "../shared/charts.js";
import { axisMark, axisTicks } from "../axes/ticks.js";

const DEFAULT_SCHEME = "Blues"; // a raster's colour scheme when the card names none: few requests light, many dark

/**
 * Draw `rows` into `body` as a raster `width` columns by `height` rows (`rasterGrid`), and return the chart. It has no
 * series: `colours` and `hidden` are not read. Its named parameters:
 * - `x`, `y`: the card's axis options `{ label, ticks, tickFormat }`; the x axis's `tickFormat` writes a column, an
 *   hour of the window, as a day, and `y.label` names what a row is, "User".
 * - `scheme`: the colour scheme, "Blues" when not given; `schemeStart`: the point of it, from 0 to 1, the lowest
 *   value takes, its first colour when not given; `colourLog`: true for a log colour scale.
 * - `valueLabel`: what a value is, the colour legend's title. `margins`: Plot margins in place of the frame's.
 * Required: `valueLabel`.
 */
export async function drawRaster(rows, body, colours, parameters) {
  const { x: xAxis = {}, y: yAxis = {}, margins } = parameters;
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const { width, height, values } = rasterGrid(rows);
  const xTicks = axisTicks(xAxis, [0, width]);
  const yTicks = axisTicks(yAxis, [0, height]);
  const chart = Plot.plot({
    ...titledFrame(body, yAxis.label ?? null, margins),
    x: { domain: [0, width] },
    y: { domain: [0, height] },
    color: sequentialColour(parameters, DEFAULT_SCHEME),
    marks: [
      // Row 0 is drawn at the bottom: y rises with the row index, as the paper's rasters draw a rank.
      Plot.raster(values, {
        width, height, x1: 0, x2: width, y1: 0, y2: height, fill: Plot.identity, imageRendering: "pixelated",
      }),
      axisMark(Plot, "x", xAxis, xTicks),
      axisMark(Plot, "y", yAxis, yTicks),
    ],
  });
  body.replaceChildren(chart);
  return chart;
}

/**
 * The dense grid of a raster's rows: `{ width, height, values }`, `width` the largest `x` plus one, `height` the
 * largest `y` plus one, and `values` a Float64Array of `width * height` cells, row by row from row 0, each the value of
 * the row naming its `x` and `y`, NaN (drawn empty) where none does.
 */
export function rasterGrid(rows) {
  let width = 0;
  let height = 0;
  for (const row of rows) {
    width = Math.max(width, row.x + 1);
    height = Math.max(height, row.y + 1);
  }
  const values = new Float64Array(width * height).fill(NaN);
  for (const row of rows) {
    values[row.y * width + row.x] = row.value;
  }
  return { width, height, values };
}
