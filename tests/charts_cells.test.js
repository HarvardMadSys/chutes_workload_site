import assert from "node:assert/strict";
import { test } from "node:test";

import { categoryAxis, cellTipText, drawnCells } from "../site/js/charts/cells.js";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Three cells of a log-grid density: the first starts at zero, the third holds no rows.
const ROWS = [
  { x_low: 0, x_high: 10, y_low: 1, y_high: 2, value: 4 },
  { x_low: 10, x_high: 100, y_low: 1, y_high: 2, value: 7 },
  { x_low: 10, x_high: 100, y_low: 2, y_high: 4, value: 0 },
];

test("every cell is drawn on linear axes, as many rectangles as rows", () => {
  const rows = [];
  for (let index = 0; index < 697; index += 1) {
    rows.push({ x_low: index, x_high: index + 1, y_low: 0, y_high: 200, value: index });
  }
  assert.equal(drawnCells(rows, {}).length, 697);
});

test("a cell with an edge at zero is not drawn on a log axis, nor a cell of value zero on a log colour scale", () => {
  assert.deepEqual(drawnCells(ROWS, { x: { log: true } }), [ROWS[1], ROWS[2]]);
  assert.deepEqual(drawnCells(ROWS, { x: { log: true }, colourLog: true }), [ROWS[1]]);
  assert.deepEqual(drawnCells(ROWS, { y: { log: true } }), ROWS);
});

test("an axis of category names is ticked at the middle of each cell, each tick written by its name", () => {
  const axis = categoryAxis({ label: "Weekday" }, WEEKDAYS);
  assert.deepEqual(axis.ticks, [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5]);
  assert.equal(axis.tickFormat(2.5), "Wed");
  assert.equal(axis.label, "Weekday");
  const plain = { label: "Hour" };
  assert.equal(categoryAxis(plain, undefined), plain);
});

test("a cell's tooltip gives its ranges, after each axis's title, and its value", () => {
  const parameters = {
    x: { label: "Requests", tickFormat: (value) => `${value}` },
    y: {},
    valueLabel: "Models",
    valueFormat: (value) => `${value}`,
  };
  assert.equal(cellTipText(ROWS[1], parameters), "Requests: 10–100\n1–2\nModels: 7");
});

test("a cell of a category axis is named by its category in the tooltip", () => {
  const cell = { x_low: 13, x_high: 14, y_low: 3, y_high: 4, value: 738900 };
  const parameters = {
    x: { label: "Hour" },
    y: categoryAxis({}, WEEKDAYS),
    valueLabel: "Requests per hour",
    valueFormat: (value) => value.toLocaleString("en-US"),
  };
  assert.equal(cellTipText(cell, parameters), "Hour: 13–14\nThu\nRequests per hour: 738,900");
});
