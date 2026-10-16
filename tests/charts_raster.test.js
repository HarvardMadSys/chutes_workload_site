import assert from "node:assert/strict";
import { test } from "node:test";

import { pooledGrid, rasterGrid } from "../site/js/charts/raster.js";

test("a raster is as wide as its largest column plus one and as tall as its largest row plus one", () => {
  const rows = [{ x: 0, y: 0, value: 26 }, { x: 743, y: 0, value: 3 }, { x: 5, y: 219, value: 1 }];
  const grid = rasterGrid(rows);
  assert.equal(grid.width, 744);
  assert.equal(grid.height, 220);
  assert.equal(grid.values.length, 744 * 220);
});

test("each cell holds its row's value, row by row from row 0, and a cell no row names is NaN", () => {
  const grid = rasterGrid([{ x: 0, y: 0, value: 1 }, { x: 2, y: 1, value: 4 }]);
  assert.equal(grid.width, 3);
  assert.equal(grid.height, 2);
  assert.deepEqual([...grid.values], [1, NaN, NaN, NaN, NaN, 4]);
});

test("a raster of no rows is empty", () => {
  const grid = rasterGrid([]);
  assert.deepEqual([grid.width, grid.height, grid.values.length], [0, 0, 0]);
});

test("a grid that fits its plot is drawn as it is", () => {
  const grid = rasterGrid([{ x: 0, y: 0, value: 1 }, { x: 2, y: 1, value: 4 }]);
  const pooled = pooledGrid(grid, 300, 160);
  assert.deepEqual([pooled.width, pooled.height, pooled.columnStep, pooled.rowStep], [3, 2, 1, 1]);
  assert.deepEqual([...pooled.values], [...grid.values]);
});

test("a grid wider or taller than its plot pools neighbouring cells, each the largest value among them", () => {
  // Five columns by three rows into a plot two pixels by two: three columns and two rows to a pool.
  const rows = [{ x: 0, y: 0, value: 1 }, { x: 2, y: 1, value: 7 }, { x: 4, y: 2, value: 3 }, { x: 1, y: 0, value: 5 }];
  const pooled = pooledGrid(rasterGrid(rows), 2, 2);
  assert.deepEqual([pooled.width, pooled.height, pooled.columnStep, pooled.rowStep], [2, 2, 3, 2]);
  assert.deepEqual([...pooled.values], [7, NaN, NaN, 3]);
});

test("a window of 744 hours in a plot 424 pixels wide is drawn two hours to a column, losing none", () => {
  const rows = [{ x: 0, y: 0, value: 1 }, { x: 743, y: 0, value: 2 }, { x: 101, y: 539, value: 9 }];
  const pooled = pooledGrid(rasterGrid(rows), 424, 160);
  assert.deepEqual([pooled.width, pooled.columnStep, pooled.height, pooled.rowStep], [372, 2, 135, 4]);
  assert.equal([...pooled.values].filter((value) => !Number.isNaN(value)).length, rows.length);
});
