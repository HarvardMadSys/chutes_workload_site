import assert from "node:assert/strict";
import { test } from "node:test";

import { drawnPoints, drawnSeries, lineTipText, lineYAxis, yColumn } from "../site/js/charts/lines.js";
import { formatPercent } from "../site/js/shared/format.js";
import { assignColours } from "../site/js/theme/colours.js";

const COLOURS = assignColours(["DeepSeek V3.2", "DeepSeek R1", "Global"]);
// An output-token CDF: its first point is at zero tokens.
const CDF_ROWS = [
  { series: "DeepSeek V3.2", x: 0, cdf: 0 },
  { series: "DeepSeek V3.2", x: 2, cdf: 0.01 },
  { series: "DeepSeek R1", x: 0, cdf: 0 },
  { series: "DeepSeek R1", x: 40, cdf: 0.5 },
  { series: "Unlisted", x: 5, cdf: 0.2 },
];
// A two-panel lines answer.
const PANEL_ROWS = [
  { series: "Global", x: 1, y: 10, panel: "a" },
  { series: "Global", x: 2, y: 12, panel: "a" },
  { series: "Global", x: 1, y: 0.5, panel: "b" },
];

test("a CDF's y is its cdf column; a lines answer's is y", () => {
  assert.equal(yColumn(true), "cdf");
  assert.equal(yColumn(false), "y");
});

test("on a log x axis the points at zero are not drawn, nor a series without a colour", () => {
  const drawn = drawnPoints(CDF_ROWS, COLOURS, { cdf: true, x: { log: true } }, new Set());
  assert.deepEqual(drawn, [{ series: "DeepSeek V3.2", x: 2, cdf: 0.01 }, { series: "DeepSeek R1", x: 40, cdf: 0.5 }]);
});

test("on a linear axis every coloured point is drawn, a hidden series left out", () => {
  const drawn = drawnPoints(CDF_ROWS, COLOURS, { cdf: true }, new Set(["DeepSeek R1"]));
  assert.deepEqual(drawn.map((row) => [row.series, row.x]), [["DeepSeek V3.2", 0], ["DeepSeek V3.2", 2]]);
});

test("a panel's points are drawn alone, and a log y axis drops a y at or below zero", () => {
  assert.equal(drawnPoints(PANEL_ROWS, COLOURS, { panel: "a" }, new Set()).length, 2);
  const rows = [{ series: "Global", x: 1, y: 0 }, { series: "Global", x: 2, y: 3 }];
  assert.deepEqual(drawnPoints(rows, COLOURS, { y: { log: true } }, new Set()), [{ series: "Global", x: 2, y: 3 }]);
});

test("the series drawn are those the points hold, in the legend's colour order", () => {
  const points = [{ series: "Global" }, { series: "DeepSeek V3.2" }, { series: "Global" }];
  assert.deepEqual(drawnSeries(points, COLOURS), ["DeepSeek V3.2", "Global"]);
});

test("a point's tooltip names its series by its label, its x as the axis writes it and its value", () => {
  const parameters = {
    x: { tickFormat: (day) => `Day ${day}` },
    valueLabel: "Requests",
    valueFormat: (value) => value.toLocaleString("en-US"),
    labels: { Global: "All models" },
  };
  assert.equal(lineTipText({ series: "Global", x: 120, y: 5313409 }, parameters), "All models\nDay 120\nRequests: 5,313,409");
  assert.equal(lineTipText({ series: "DeepSeek R1", x: 3, y: 7 }, { ...parameters, x: {} }), "DeepSeek R1\n3\nRequests: 7");
});

test("a CDF point's tooltip gives its value and the share at or below it", () => {
  const parameters = { cdf: true, valueLabel: "Input tokens", valueFormat: (value) => `${value}` };
  assert.equal(lineTipText({ series: "DeepSeek R1", x: 1200, cdf: 0.45 }, parameters),
    "DeepSeek R1\nInput tokens: 1200\n45.0% at or below");
});

test("a CDF's y axis is a share from 0 to 1 in percent, keeping the card's title; a lines answer's is the card's", () => {
  const cdfAxis = lineYAxis({ cdf: true, y: { label: "Share of requests", domain: [0, 2] } });
  assert.deepEqual(cdfAxis, { tickFormat: formatPercent, label: "Share of requests", domain: [0, 1] });
  assert.deepEqual(lineYAxis({ cdf: true }), { tickFormat: formatPercent, domain: [0, 1] });
  const linear = { label: "Requests", log: true };
  assert.equal(lineYAxis({ y: linear }), linear);
  assert.deepEqual(lineYAxis({}), {});
});
