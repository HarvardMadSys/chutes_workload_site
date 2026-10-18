// The rows a chart or a sum is taken from (`shared/rows.js`): totals, a panel's rows and a log axis's rows.
import assert from "node:assert/strict";
import { test } from "node:test";

import { columnTotal, logColumns, panelRows, positiveRows } from "../site/js/shared/rows.js";

test("a column's total sums it over the rows, and is 0 for no rows", () => {
  assert.equal(columnTotal([{ requests: 3 }, { requests: 4 }], "requests"), 7);
  assert.equal(columnTotal([], "requests"), 0);
});

test("a panel's rows are those naming it; every row when no panel is asked for", () => {
  const rows = [{ panel: "request_share", x: 1 }, { panel: "token_hit", x: 1 }];
  assert.deepEqual(panelRows(rows, "token_hit"), [{ panel: "token_hit", x: 1 }]);
  assert.equal(panelRows(rows, undefined), rows);
});

test("the columns on a log axis are the x columns where x is log and the y columns where y is log", () => {
  assert.deepEqual(logColumns({ x: { log: true }, y: {} }, ["x"], ["y"]), ["x"]);
  assert.deepEqual(logColumns({ x: { log: true }, y: { log: true } }, ["x_low", "x_high"], ["y"]), ["x_low", "x_high", "y"]);
  assert.deepEqual(logColumns({}, ["x"], ["y"]), []);
});

test("a log axis drops the rows at or below zero in its columns, an output-token CDF's first point among them", () => {
  const rows = [{ x: 0, cdf: 0 }, { x: 2, cdf: 0.01 }, { x: -1, cdf: 0.5 }];
  assert.deepEqual(positiveRows(rows, ["x"]), [{ x: 2, cdf: 0.01 }]);
  assert.equal(positiveRows(rows, []).length, 3);
});
