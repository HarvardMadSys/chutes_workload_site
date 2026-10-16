/**
 * The raster kind: a dense grid of cells, one per column and row, each shaded by its value on a sequential colour
 * scale with its legend, drawn as one image on a canvas; a cell no row names is left empty. It has no tooltip. A grid
 * of more columns or rows than the plot has pixels is drawn pooled (`pooledGrid`), so that no cell falls between two
 * pixels and vanishes.
 *
 * Its rows are a raster answer's, one per cell holding a value: `x` and `y`, the cell's column and row (integers from
 * 0, as an hour of a window and a user's or a model's rank), and its `value`. Row 0 is drawn at the bottom.
 */

import { sequentialColour, titledFrame } from "../shared/charts.js";
import { axisMark, axisTicks, colourLegendTicks, extent } from "../axes/ticks.js";

const DEFAULT_SCHEME = "Blues"; // a raster's colour scheme when the card names none: few requests light, many dark

/**
 * Draw `rows` into `body` as a raster `width` columns by `height` rows (`rasterGrid`), pooled to the plot's pixels
 * (`pooledGrid`), and return the chart. It has no series: `colours` and `hidden` are not read. Its named parameters:
 * - `x`, `y`: the card's axis options `{ label, ticks, tickFormat }`; the x axis's `tickFormat` writes a column, an
 *   hour of the window, as a day, and `y.label` names what a row is, "User".
 * - `scheme`: the colour scheme, "Blues" when not given; `schemeStart`: the point of it, from 0 to 1, the lowest
 *   value takes, its first colour when not given; `colourLog`: true for a log colour scale; `colourDomain`:
 *   the values at the scale's two ends, the rows' own (`rasterColourDomain`) when not given.
 * - `valueLabel`: what a value is, the colour legend's title. `margins`: Plot margins in place of the frame's.
 * Required: `valueLabel`.
 */
export async function drawRaster(rows, body, colours, parameters) {
  const { x: xAxis = {}, y: yAxis = {}, margins } = parameters;
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const { width, height, values } = rasterGrid(rows);
  const frame = titledFrame(body, yAxis.label ?? null, margins);
  const plotWidth = frame.width - frame.marginLeft - frame.marginRight;
  const plotHeight = frame.height - frame.marginTop - frame.marginBottom;
  const pooled = pooledGrid({ width, height, values }, plotWidth, plotHeight);
  const xTicks = axisTicks(xAxis, [0, width]);
  const yTicks = axisTicks(yAxis, [0, height]);
  // The colour scale spans the cells' own values, whatever pooling keeps of them.
  const colourParameters = { ...parameters, colourDomain: rasterColourDomain(parameters, rows) };
  const legendTicks = colourLegendTicks(colourParameters, rows.map((row) => row.value));
  const chart = Plot.plot({
    ...frame,
    x: { domain: [0, width] },
    y: { domain: [0, height] },
    color: sequentialColour(colourParameters, DEFAULT_SCHEME, legendTicks),
    marks: [
      // Row 0 is drawn at the bottom: y rises with the row index, as the paper's rasters draw a rank. A pooled grid
      // may reach past the last column or row by part of a pool, which the frame's edge cuts off.
      Plot.raster(pooled.values, {
        width: pooled.width,
        height: pooled.height,
        x1: 0,
        x2: pooled.width * pooled.columnStep,
        y1: 0,
        y2: pooled.height * pooled.rowStep,
        fill: Plot.identity,
        imageRendering: "pixelated",
        clip: true,
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

/**
 * The values a raster's colour scale spans: the card's `colourDomain` where given, else the smallest and the largest
 * of its rows' values, the cells' own rather than the pooled grid's.
 */
export function rasterColourDomain({ colourDomain }, rows) {
  return colourDomain ?? extent(rows.map((row) => row.value));
}

/**
 * The grid of `grid` (`rasterGrid`'s `{ width, height, values }`) as drawn in a plot `plotWidth` by `plotHeight`
 * pixels: `{ width, height, values, columnStep, rowStep }`, each cell the largest value among `columnStep`
 * neighbouring columns by `rowStep` neighbouring rows of `grid`, from column and row 0, NaN where none of them has a
 * value. The steps are the fewest that leave no more columns than `plotWidth` and no more rows than `plotHeight`, 1
 * where the grid already fits, so that each cell drawn takes a pixel at least and a request in any hour stays
 * visible.
 */
export function pooledGrid(grid, plotWidth, plotHeight) {
  const columnStep = Math.max(1, Math.ceil(grid.width / plotWidth));
  const rowStep = Math.max(1, Math.ceil(grid.height / plotHeight));
  const width = Math.ceil(grid.width / columnStep);
  const height = Math.ceil(grid.height / rowStep);
  const values = new Float64Array(width * height).fill(NaN);
  for (let row = 0; row < grid.height; row += 1) {
    for (let column = 0; column < grid.width; column += 1) {
      const value = grid.values[row * grid.width + column];
      const pool = Math.floor(row / rowStep) * width + Math.floor(column / columnStep);
      if (Number.isNaN(values[pool]) || value > values[pool]) {
        values[pool] = value;
      }
    }
  }
  return { width, height, values, columnStep, rowStep };
}
