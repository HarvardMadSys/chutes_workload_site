import assert from "node:assert/strict";
import { test } from "node:test";

import { drawnScatterPoints, pointDots, pointTipText } from "../site/js/charts/scatter.js";
import { AXIS_STYLE } from "../site/js/plot/frame.js";

const ROWS = [{ x: 0, y: 1.2, value: 0.3 }, { x: 30, y: 0, value: -0.4 }, { x: 870, y: 1.1, value: 0.55 }];

test("a point at or below zero on a log axis is not drawn; on linear axes every point is", () => {
  assert.deepEqual(drawnScatterPoints(ROWS, { x: { log: true } }), [ROWS[1], ROWS[2]]);
  assert.deepEqual(drawnScatterPoints(ROWS, { x: { log: true }, y: { log: true } }), [ROWS[2]]);
  assert.deepEqual(drawnScatterPoints(ROWS, {}), ROWS);
});

test("a point's tooltip gives its x and y after their axes' titles, and its value", () => {
  const parameters = {
    x: { label: "Requests per hour", tickFormat: (value) => `${value}` },
    y: {},
    valueLabel: "Autocorrelation",
    valueFormat: (value) => value.toFixed(2),
  };
  assert.equal(pointTipText(ROWS[2], parameters), "Requests per hour: 870\n1.1\nAutocorrelation: 0.55");
  const titled = { ...parameters, y: { label: "Mean CV(IAT)", tickFormat: String } };
  assert.equal(pointTipText(ROWS[2], titled), "Requests per hour: 870\nMean CV(IAT): 1.1\nAutocorrelation: 0.55");
});

test("each dot is filled by its value, a little transparent, and outlined thinly in the axis ink", () => {
  const fakePlot = { dot: (...args) => ["dot", ...args] };
  const [, points, options] = pointDots(fakePlot, ROWS);
  assert.equal(points, ROWS);
  assert.equal(options.fill, "value");
  assert.equal(options.fillOpacity, 0.7);
  assert.equal(options.stroke, AXIS_STYLE.stroke);
  assert.equal(options.strokeWidth, 0.5);
});
