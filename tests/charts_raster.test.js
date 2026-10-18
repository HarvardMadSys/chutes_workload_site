import assert from "node:assert/strict";
import { test } from "node:test";

import {
  pooledGrid, rasterColourDomain, rasterGrid, rasterYDomain, rowBoundaries, rowRules,
} from "../site/js/charts/raster.js";

// A stand-in for Plot's rule mark, returning its name and the arguments it was given.
const FAKE_RULE_PLOT = { ruleY: (...args) => ["ruleY", ...args] };

test("a raster is as wide as its largest column plus one and as tall as its largest row plus one", () => {
  const rows = [{ x: 0, y: 0, value: 26 }, { x: 743, y: 0, value: 3 }, { x: 5, y: 219, value: 1 }];
  const grid = rasterGrid(rows);
  assert.equal(grid.columnCount, 744);
  assert.equal(grid.rowCount, 220);
  assert.equal(grid.values.length, 744 * 220);
});

test("each cell holds its row's value, row by row from row 0, and a cell no row names is NaN", () => {
  const grid = rasterGrid([{ x: 0, y: 0, value: 1 }, { x: 2, y: 1, value: 4 }]);
  assert.equal(grid.columnCount, 3);
  assert.equal(grid.rowCount, 2);
  assert.deepEqual([...grid.values], [1, NaN, NaN, NaN, NaN, 4]);
});

test("a raster of no rows is empty", () => {
  const grid = rasterGrid([]);
  assert.deepEqual([grid.columnCount, grid.rowCount, grid.values.length], [0, 0, 0]);
});

test("a grid that fits its plot is drawn as it is", () => {
  const grid = rasterGrid([{ x: 0, y: 0, value: 1 }, { x: 2, y: 1, value: 4 }]);
  const pooled = pooledGrid(grid, 300, 160);
  assert.deepEqual([pooled.columnCount, pooled.rowCount, pooled.columnStep, pooled.rowStep], [3, 2, 1, 1]);
  assert.deepEqual([...pooled.values], [...grid.values]);
});

test("a grid wider or taller than its plot pools neighbouring cells, each the largest value among them", () => {
  // Five columns by three rows into a plot two pixels by two: three columns and two rows to a pool.
  const rows = [{ x: 0, y: 0, value: 1 }, { x: 2, y: 1, value: 7 }, { x: 4, y: 2, value: 3 }, { x: 1, y: 0, value: 5 }];
  const pooled = pooledGrid(rasterGrid(rows), 2, 2);
  assert.deepEqual([pooled.columnCount, pooled.rowCount, pooled.columnStep, pooled.rowStep], [2, 2, 3, 2]);
  assert.deepEqual([...pooled.values], [7, NaN, NaN, 3]);
});

test("a window of 744 hours in a plot 424 pixels wide is drawn two hours to a column, losing none", () => {
  const rows = [{ x: 0, y: 0, value: 1 }, { x: 743, y: 0, value: 2 }, { x: 101, y: 539, value: 9 }];
  const pooled = pooledGrid(rasterGrid(rows), 424, 160);
  assert.deepEqual([pooled.columnCount, pooled.columnStep, pooled.rowCount, pooled.rowStep], [372, 2, 135, 4]);
  assert.equal([...pooled.values].filter((value) => !Number.isNaN(value)).length, rows.length);
});

test("a raster's colour scale spans its rows' own values, or the card's colourDomain where given", () => {
  const rows = [{ x: 0, y: 0, value: 3 }, { x: 1, y: 0, value: 1 }, { x: 1, y: 1, value: 40 }];
  assert.deepEqual(rasterColourDomain({}, rows), [1, 40]);
  assert.deepEqual(rasterColourDomain({ colourDomain: [36, 80] }, rows), [36, 80]);
});

test("a raster's rows each span half a row about their index, so a row's tick sits on its centre", () => {
  assert.deepEqual(rasterYDomain(4), [-0.5, 3.5]);
  assert.deepEqual(rasterYDomain(1), [-0.5, 0.5]);
});

test("a raster's row boundaries lie between each pair of neighbouring rows, none outside them", () => {
  assert.deepEqual(rowBoundaries(4), [0.5, 1.5, 2.5]);
  assert.deepEqual(rowBoundaries(1), []);
  assert.deepEqual(rowBoundaries(0), []);
});

test("rows at least six pixels tall are parted by 2px rules in the card's colour; thinner rows by none", () => {
  const [, boundaries, options] = rowRules(FAKE_RULE_PLOT, 4, 24);
  assert.deepEqual(boundaries, [0.5, 1.5, 2.5]);
  assert.deepEqual(options, { stroke: "var(--color-surface)", strokeWidth: 2 });
  assert.deepEqual(rowRules(FAKE_RULE_PLOT, 5, 24)[1], []);
});
