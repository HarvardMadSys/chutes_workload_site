import assert from "node:assert/strict";
import { test } from "node:test";

import {
  allSeriesTips, allSeriesTipText, brokenAtGaps, drawnPoints, framedPoints, drawnSeries, lineTip, lineTipText,
  lineYAxis, seriesDash, seriesLine, yColumn,
} from "../site/js/charts/lines.js";
import { formatPercent } from "../site/js/shared/format.js";
import { assignColours } from "../site/js/theme/colours.js";

const SERIES_COLOURS = assignColours(["DeepSeek V3.2", "DeepSeek R1", "Global"]);
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
// A stand-in for Plot's line, tip and pointers, each returning its name and the arguments it was given.
const FAKE_PLOT = {
  line: (...args) => ["line", ...args],
  tip: (...args) => ["tip", ...args],
  pointer: (options) => ["pointer", options],
  pointerX: (options) => ["pointerX", options],
};
// Two cache policies' hit ratios at two cache sizes.
const POLICY_POINTS = [
  { series: "LRU", x: 1000, y: 0.4 }, { series: "Belady", x: 1000, y: 0.923 },
  { series: "LRU", x: 2000, y: 0.6 }, { series: "Belady", x: 2000, y: 0.95 },
];
const POLICY_PARAMETERS = {
  x: { label: "Cache size", tickFormat: (size) => `${size / 1000}k` },
  valueFormat: (value) => value.toFixed(3),
  labels: { LRU: "Least recently used" },
};

test("a series the card lists as dashed is drawn dashed, every other solid", () => {
  assert.equal(seriesDash("Global", ["Global"]), "4,3");
  assert.equal(seriesDash("DeepSeek R1", ["Global"]), undefined);
  assert.equal(seriesDash("Global", []), undefined);
});

test("a CDF's y is its cdf column; a lines answer's is y", () => {
  assert.equal(yColumn(true), "cdf");
  assert.equal(yColumn(false), "y");
});

test("on a log x axis the points at zero are not drawn, nor a series without a colour", () => {
  const drawn = drawnPoints(CDF_ROWS, SERIES_COLOURS, { cdf: true, x: { log: true } }, new Set());
  assert.deepEqual(drawn, [{ series: "DeepSeek V3.2", x: 2, cdf: 0.01 }, { series: "DeepSeek R1", x: 40, cdf: 0.5 }]);
});

test("on a linear axis every coloured point is drawn, a hidden series left out", () => {
  const drawn = drawnPoints(CDF_ROWS, SERIES_COLOURS, { cdf: true }, new Set(["DeepSeek R1"]));
  assert.deepEqual(drawn.map((row) => [row.series, row.x]), [["DeepSeek V3.2", 0], ["DeepSeek V3.2", 2]]);
});

test("a panel's points are drawn alone, and a log y axis drops a y at or below zero", () => {
  assert.equal(drawnPoints(PANEL_ROWS, SERIES_COLOURS, { panel: "a" }, new Set()).length, 2);
  const rows = [{ series: "Global", x: 1, y: 0 }, { series: "Global", x: 2, y: 3 }];
  assert.deepEqual(drawnPoints(rows, SERIES_COLOURS, { y: { log: true } }, new Set()), [{ series: "Global", x: 2, y: 3 }]);
});

test("the series drawn are those the points hold, in the legend's colour order", () => {
  const points = [{ series: "Global" }, { series: "DeepSeek V3.2" }, { series: "Global" }];
  assert.deepEqual(drawnSeries(points, SERIES_COLOURS), ["DeepSeek V3.2", "Global"]);
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
  const titled = { ...parameters, x: { label: "Day of the trace" } };
  assert.equal(lineTipText({ series: "DeepSeek R1", x: 3, y: 7 }, titled),
    "DeepSeek R1\nDay of the trace: 3\nRequests: 7");
});

test("a line is broken where two neighbouring points of a series are farther apart than the gap", () => {
  const points = [
    { series: "Requests", x: 1, y: 5 }, { series: "Requests", x: 2, y: 6 }, { series: "Requests", x: 5, y: 7 },
    { series: "Other", x: 9, y: 1 },
  ];
  const broken = brokenAtGaps(points, 1.5, "y");
  assert.deepEqual(broken.map((point) => [point.series, point.x]),
    [["Requests", 1], ["Requests", 2], ["Requests", 2], ["Requests", 5], ["Other", 9]]);
  assert.ok(Number.isNaN(broken[2].y));
  assert.equal(brokenAtGaps(points, undefined, "y"), points);
  assert.equal(brokenAtGaps(points, 4, "y").length, points.length);
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

test("a tooltip names only the points within the axes' domains, the part of the lines the frame shows", () => {
  const points = [
    { series: "Global", x: 1, y: 0.2 }, { series: "Global", x: 50, y: 0.9 }, { series: "Global", x: 9, y: 3 },
  ];
  assert.deepEqual(framedPoints(points, { domain: [1, 10] }, {}, "y"), [points[0], points[2]]);
  assert.deepEqual(framedPoints(points, {}, { domain: [0, 1] }, "y"), [points[0], points[1]]);
  assert.equal(framedPoints(points, {}, {}, "y").length, 3);
});

test("a CDF's points are joined by straight lines, as a lines chart's are", () => {
  const [, points, options] = seriesLine(FAKE_PLOT, CDF_ROWS, "DeepSeek R1", { cdf: true });
  assert.equal(options.curve, "linear");
  assert.equal(options.y, "cdf");
  assert.deepEqual(points.map((point) => point.x), [0, 40]);
  assert.equal(seriesLine(FAKE_PLOT, PANEL_ROWS, "Global", {})[2].curve, "linear");
});

test("a CDF's tooltip names the point nearest in x and y; a lines chart's the point nearest in x", () => {
  const [, , [cdfPointer, cdfOptions]] = lineTip(FAKE_PLOT, CDF_ROWS, { cdf: true, valueFormat: String });
  assert.equal(cdfPointer, "pointer");
  assert.equal(cdfOptions.y, "cdf");
  const [, , [linesPointer]] = lineTip(FAKE_PLOT, PANEL_ROWS, { valueFormat: String });
  assert.equal(linesPointer, "pointerX");
});

test("a tooltip of every series lists each value at the hovered x, highest first, after the x", () => {
  const atFirstSize = POLICY_POINTS.slice(0, 2);
  assert.equal(allSeriesTipText(1000, atFirstSize, POLICY_PARAMETERS),
    "Cache size: 1k\nBelady 0.923\nLeast recently used 0.400");
  const tips = allSeriesTips(POLICY_POINTS, POLICY_PARAMETERS);
  assert.deepEqual(tips.map((tip) => [tip.x, tip.y]), [[1000, 0.923], [2000, 0.95]]);
  const [, rows, [pointer, options]] = lineTip(FAKE_PLOT, POLICY_POINTS, { ...POLICY_PARAMETERS, tipAllSeries: true });
  assert.equal(rows.length, 2);
  assert.deepEqual([pointer, options.title], ["pointerX", "text"]);
});

test("a chart given its series draws only those, its legend's hidden ones still left out", () => {
  const named = drawnPoints(CDF_ROWS, SERIES_COLOURS, { series: ["DeepSeek R1", "Global"] }, new Set());
  assert.deepEqual(named.map((point) => [point.series, point.x]), [["DeepSeek R1", 0], ["DeepSeek R1", 40]]);
  const hidden = drawnPoints(CDF_ROWS, SERIES_COLOURS, { series: ["DeepSeek R1"] }, new Set(["DeepSeek R1"]));
  assert.deepEqual(hidden, []);
});
