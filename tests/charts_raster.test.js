import assert from "node:assert/strict";
import { test } from "node:test";

import { rasterGrid } from "../site/js/charts/raster.js";

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
