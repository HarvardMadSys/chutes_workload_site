/**
 * The raster kind: a dense grid of cells, one per column and row, each shaded by its value on a sequential colour
 * scale with its legend, drawn as one image on a canvas; a cell no row names is left empty. It has no tooltip. A grid
 * of more columns or rows than the plot has pixels is drawn pooled (`pooledGrid`), so that no cell falls between two
 * pixels and vanishes.
 *
 * Its rows are a raster answer's, one per cell holding a value: `x` and `y`, the cell's column and row (integers from
 * 0, as an hour of a window and a user's or a model's rank), and its `value`. Row 0 is drawn at the bottom, each row
 * centred on its tick, and rows tall enough are parted by rules in the card's colour (`rowRules`).
 */

import { SURFACE_INK, sequentialColour, titledFrame } from "../plot/frame.js";
import { axisMark, axisTicks, colourLegendTicks, extent } from "../plot/axes.js";
import { nameChart } from "../shared/figure.js";

const DEFAULT_SCHEME = "Blues"; // a raster's colour scheme when the card names none: few requests light, many dark
const MIN_ROW_HEIGHT_FOR_RULES = 6; // pixels a row needs before rules part it from its neighbours; thinner, none
const ROW_RULE_WIDTH = 2; // pixels of the card's colour between two rows
const ROW_HALF = 0.5; // a row spans half a row on either side of its index, so its tick sits on its centre

/**
 * Draw `rows` into `body` as a raster of `columnCount` columns by `rowCount` rows (`rasterGrid`), pooled to the
 * plot's pixels (`pooledGrid`), by the draw contract of `plot/frame.js`. It has no series: `seriesColours` and
 * `hidden` are not read. Its named parameters:
 * - `x`, `y`: the card's axis options `{ label, ticks, tickFormat }`; the x axis's `tickFormat` writes a column, an
 *   hour of the window, as a day, and `y.label` names what a row is, "User"; a y tick sits on its row's centre.
 * - `scheme`: the colour scheme, "Blues" when not given; `schemeStart`: the point of it, from 0 to 1, the lowest
 *   value takes, its first colour when not given; `colourLog`: true for a log colour scale; `colourDomain`:
 *   the values at the scale's two ends, the rows' own (`rasterColourDomain`) when not given.
 * - `valueLabel`: what a value is, the colour legend's title. `margins`: Plot margins in place of the frame's.
 * - `height`: the chart's height in pixels, as every kind takes it (`titledFrame` of `plot/frame.js`).
 * Required: `valueLabel`.
 */
export async function drawRaster(rows, body, seriesColours, parameters, hidden) {
  const { x: xAxis = {}, y: yAxis = {}, margins } = parameters;
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  const grid = rasterGrid(rows);
  const frame = titledFrame(body, yAxis.label ?? null, margins, parameters.height);
  const plotWidth = frame.width - frame.marginLeft - frame.marginRight;
  const plotHeight = frame.height - frame.marginTop - frame.marginBottom;
  const pooled = pooledGrid(grid, plotWidth, plotHeight);
  const xTicks = axisTicks(xAxis, [0, grid.columnCount]);
  const yTicks = axisTicks(yAxis, [0, grid.rowCount - 1]);
  // The colour scale spans the cells' own values, whatever pooling keeps of them.
  const colourParameters = { ...parameters, colourDomain: rasterColourDomain(parameters, rows) };
  const legendTicks = colourLegendTicks(colourParameters, rows.map((row) => row.value));
  const chart = Plot.plot({
    ...frame,
    x: { domain: [0, grid.columnCount] },
    y: { domain: rasterYDomain(grid.rowCount) },
    color: sequentialColour(colourParameters, DEFAULT_SCHEME, legendTicks),
    marks: [
      // Row 0 is drawn at the bottom: y rises with the row index, as the paper's rasters draw a rank. A pooled grid
      // may reach past the last column or row by part of a pool, which the frame's edge cuts off.
      Plot.raster(pooled.values, {
        width: pooled.columnCount,
        height: pooled.rowCount,
        x1: 0,
        x2: pooled.columnCount * pooled.columnStep,
        y1: -ROW_HALF,
        y2: pooled.rowCount * pooled.rowStep - ROW_HALF,
        fill: Plot.identity,
        imageRendering: "pixelated",
        clip: true,
      }),
      rowRules(Plot, grid.rowCount, plotHeight),
      axisMark(Plot, "x", xAxis, xTicks),
      axisMark(Plot, "y", yAxis, yTicks),
    ],
  });
  body.replaceChildren(chart);
  nameChart(body, parameters.name);
}

/**
 * The y domain of a raster of `rowCount` rows: `[-0.5, rowCount - 0.5]`, each row spanning half a row about its index.
 */
export function rasterYDomain(rowCount) {
  return [-ROW_HALF, rowCount - ROW_HALF];
}

/**
 * The y values between a raster's `rowCount` rows, where one row ends and the next begins: 0.5, 1.5, …
 * `rowCount` - 1.5.
 */
export function rowBoundaries(rowCount) {
  const boundaries = [];
  for (let row = 1; row < rowCount; row += 1) {
    boundaries.push(row - ROW_HALF);
  }
  return boundaries;
}

/**
 * The rules parting a raster's `rowCount` rows drawn `plotHeight` pixels tall: one at each of `rowBoundaries`,
 * `ROW_RULE_WIDTH` pixels in the card's colour, where a row is at least `MIN_ROW_HEIGHT_FOR_RULES` pixels tall; none
 * (a rule of no values) where rows are thinner, as a pooled raster's are, since rules would hide them.
 */
export function rowRules(Plot, rowCount, plotHeight) {
  const isTallEnough = plotHeight / rowCount >= MIN_ROW_HEIGHT_FOR_RULES;
  const boundaries = isTallEnough ? rowBoundaries(rowCount) : [];
  return Plot.ruleY(boundaries, { stroke: SURFACE_INK, strokeWidth: ROW_RULE_WIDTH });
}

/**
 * The dense grid of a raster's rows: `{ columnCount, rowCount, values }`, `columnCount` the largest `x` plus one,
 * `rowCount` the largest `y` plus one, and `values` a Float64Array of `columnCount * rowCount` cells, row by row from
 * row 0, each the value of the row naming its `x` and `y`, NaN (drawn empty) where none does.
 */
export function rasterGrid(rows) {
  let columnCount = 0;
  let rowCount = 0;
  for (const row of rows) {
    columnCount = Math.max(columnCount, row.x + 1);
    rowCount = Math.max(rowCount, row.y + 1);
  }
  const values = new Float64Array(columnCount * rowCount).fill(NaN);
  for (const row of rows) {
    values[row.y * columnCount + row.x] = row.value;
  }
  return { columnCount, rowCount, values };
}

/**
 * The values a raster's colour scale spans: the card's `colourDomain` where given, else the smallest and the largest
 * of its rows' values, the cells' own rather than the pooled grid's.
 */
export function rasterColourDomain({ colourDomain }, rows) {
  return colourDomain ?? extent(rows.map((row) => row.value));
}

/**
 * The grid of `grid` (`rasterGrid`'s `{ columnCount, rowCount, values }`) as drawn in a plot `plotWidth` by
 * `plotHeight` pixels: `{ columnCount, rowCount, values, columnStep, rowStep }`, each cell the largest value among
 * `columnStep` neighbouring columns by `rowStep` neighbouring rows of `grid`, from column and row 0, NaN where none of
 * them has a value. The steps are the fewest that leave no more columns than `plotWidth` and no more rows than
 * `plotHeight`, 1 where the grid already fits, so that each cell drawn takes a pixel at least and a request in any hour
 * stays visible.
 */
export function pooledGrid(grid, plotWidth, plotHeight) {
  const columnStep = Math.max(1, Math.ceil(grid.columnCount / plotWidth));
  const rowStep = Math.max(1, Math.ceil(grid.rowCount / plotHeight));
  const columnCount = Math.ceil(grid.columnCount / columnStep);
  const rowCount = Math.ceil(grid.rowCount / rowStep);
  const values = new Float64Array(columnCount * rowCount).fill(NaN);
  for (let row = 0; row < grid.rowCount; row += 1) {
    for (let column = 0; column < grid.columnCount; column += 1) {
      const value = grid.values[row * grid.columnCount + column];
      const pool = Math.floor(row / rowStep) * columnCount + Math.floor(column / columnStep);
      if (Number.isNaN(values[pool]) || value > values[pool]) {
        values[pool] = value;
      }
    }
  }
  return { columnCount, rowCount, values, columnStep, rowStep };
}
