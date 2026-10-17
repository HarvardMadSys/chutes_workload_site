import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CHART_HEIGHT, chartFrame, chartName, chartWidth, colourScale, columnTotal, DASH, haloedReferenceRule, logColumns,
  nameChart, panelRows, positiveRows, REFERENCE_HALO, REFERENCE_STYLE, referenceRule, sequentialColour, SURFACE_INK, titledFrame,
} from "../site/js/shared/charts.js";
import { assignColours } from "../site/js/theme/colours.js";
import { FakeElement } from "./fake_page.js";

test("every chart starts from the same frame, as wide as its body", () => {
  const frame = chartFrame({ clientWidth: 300 });
  assert.equal(frame.width, 300);
  assert.equal(frame.height, chartFrame({ clientWidth: 600 }).height);
  assert.equal(chartFrame({ clientWidth: 0 }).width, 480); // a body not yet laid out gets the fallback width
});

test("a chart's width is its body's, or the fallback width before the body is laid out", () => {
  assert.equal(chartWidth({ clientWidth: 286 }), 286);
  assert.equal(chartWidth({ clientWidth: 0 }), chartFrame({ clientWidth: 0 }).width);
});

test("a colour scale keeps each shown name's colour from the map, in the order shown", () => {
  const colours = assignColours(["m1", "m2", "m3"]);
  assert.deepEqual(colourScale(colours, ["m3", "m1"]), {
    type: "ordinal",
    domain: ["m3", "m1"],
    range: ["var(--series-3)", "var(--series-1)"],
  });
});

test("a chart's margins hold its 14.6 px tick labels and axis titles", () => {
  const frame = chartFrame({ clientWidth: 600 });
  assert.equal(frame.marginLeft, 72); // a count of six digits with its separator, as "150,000"
  assert.equal(frame.marginBottom, 48); // the x tick labels, and the axis title on a line below them
  assert.equal(frame.marginTop, 32); // the y axis title above the chart
});

test("a column's total sums it over the rows, and is 0 for no rows", () => {
  assert.equal(columnTotal([{ requests: 3 }, { requests: 4 }], "requests"), 7);
  assert.equal(columnTotal([], "requests"), 0);
});

/** A figure's body as `renderFigure` lays it out, its card holding the elements `parts` names by class. */
function bodyOfFigure(parts) {
  const figure = { querySelector: (selector) => parts[selector] ?? null };
  return { closest: () => figure };
}

test("a chart is named by its card's title and insight, or its caption where the card has no insight", () => {
  const title = { textContent: "Tokens per request" };
  const insight = { textContent: "Each request adds little to a large context." };
  const caption = { textContent: "Input, uncached input and output tokens of each request." };
  const withInsight = bodyOfFigure({ ".figure-title": title, ".figure-insight": insight, ".figure-caption": caption });
  assert.equal(chartName(withInsight), "Tokens per request: Each request adds little to a large context.");
  const withCaption = bodyOfFigure({ ".figure-title": title, ".figure-caption": caption });
  assert.equal(chartName(withCaption), "Tokens per request: Input, uncached input and output tokens of each request.");
});

test("a chart is named as one image by the name given, else by its card's", () => {
  const caption = { textContent: "Each family's share of the requests." };
  const chart = new FakeElement("svg");
  const body = bodyOfFigure({ ".figure-title": { textContent: "Family mix" }, ".figure-caption": caption });
  body.querySelectorAll = () => [chart];
  nameChart(body);
  assert.deepEqual([...chart.attributes], [
    ["role", "img"], ["aria-label", "Family mix: Each family's share of the requests."],
  ]);
  nameChart({ querySelectorAll: () => [chart] }, "Input tokens distribution");
  assert.equal(chart.getAttribute("aria-label"), "Input tokens distribution");
});

test("a chart whose y axis has no title has a small top margin, and a card's margins are kept", () => {
  assert.equal(titledFrame({ clientWidth: 600 }, "Requests", undefined).marginTop, 32);
  assert.equal(titledFrame({ clientWidth: 600 }, null, undefined).marginTop, 12);
  assert.equal(titledFrame({ clientWidth: 600 }, "Requests", { marginLeft: 40 }).marginLeft, 40);
});

test("a chart is as tall as its card's height, and CHART_HEIGHT where the card gives none", () => {
  assert.equal(CHART_HEIGHT, 240);
  assert.equal(titledFrame({ clientWidth: 600 }, "Requests", undefined).height, CHART_HEIGHT);
  assert.equal(titledFrame({ clientWidth: 600 }, "Requests", undefined, undefined).height, CHART_HEIGHT);
  assert.equal(titledFrame({ clientWidth: 600 }, null, { marginLeft: 40 }, 340).height, 340);
  assert.equal(chartFrame({ clientWidth: 600 }, 400).height, 400);
});

test("a sequential colour scale takes the card's scheme and type, a log one where asked, with its legend in its format", () => {
  assert.deepEqual(sequentialColour({ valueLabel: "Requests" }, "YlOrRd"), {
    type: "linear", scheme: "YlOrRd", legend: true, label: "Requests", tickFormat: undefined,
  });
  assert.equal(sequentialColour({ valueLabel: "Users", valueFormat: String }, "Blues").tickFormat, String);
  assert.equal(sequentialColour({ colourLog: true, valueLabel: "Users", valueFormat: String }, "Blues").tickFormat, undefined);
  assert.equal(sequentialColour({ scheme: "Viridis", valueLabel: "Users" }, "YlOrRd").scheme, "Viridis");
  assert.equal(sequentialColour({ colourLog: true, valueLabel: "Users" }, "Blues").type, "log");
  assert.equal(sequentialColour({ colourScale: "sqrt", valueLabel: "Users" }, "Blues").type, "sqrt");
  assert.equal(sequentialColour({ valueLabel: "Users" }, "Blues").range, undefined);
  assert.deepEqual(sequentialColour({ schemeStart: 0.25, valueLabel: "Users" }, "Blues").range, [0.25, 1]);
  const clipped = sequentialColour({ colourDomain: [36, 80], valueLabel: "Requests" }, "Blues");
  assert.deepEqual([clipped.domain, clipped.clamp], [[36, 80], true]);
  assert.equal(sequentialColour({ valueLabel: "Requests" }, "Blues").domain, undefined);
});

test("a sequential colour legend is ticked where given, else at Plot's own ticks", () => {
  const ticked = sequentialColour({ colourLog: true, valueLabel: "Users" }, "Blues", [1, 10, 100]);
  assert.deepEqual(ticked.ticks, [1, 10, 100]);
  assert.equal(Object.hasOwn(sequentialColour({ colourLog: true, valueLabel: "Users" }, "Blues"), "ticks"), false);
});

test("a dashed line is dashes of four pixels and gaps of three", () => {
  assert.deepEqual(DASH, [4, 3]);
  assert.ok(Object.isFrozen(DASH));
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

test("a reference rule is a dashed horizontal rule at its value in the label ink, haloed over cells, or nothing", () => {
  const fakePlot = { ruleY: (...args) => ["ruleY", ...args] };
  assert.deepEqual(referenceRule(fakePlot, 1), ["ruleY", [1], REFERENCE_STYLE]);
  assert.deepEqual(referenceRule(fakePlot, undefined), ["ruleY", [], REFERENCE_STYLE]);
  assert.equal(REFERENCE_STYLE.strokeDasharray, DASH.join(","));
  assert.equal(REFERENCE_STYLE.stroke, "currentColor");
  // Over cells, the same rule on a solid halo in the card's colour, drawn under it.
  const haloed = haloedReferenceRule(fakePlot, 1);
  assert.deepEqual(haloed, [["ruleY", [1], REFERENCE_HALO], ["ruleY", [1], REFERENCE_STYLE]]);
  assert.equal(REFERENCE_HALO.stroke, SURFACE_INK);
  const nothing = haloedReferenceRule(fakePlot, undefined);
  assert.deepEqual(nothing, [["ruleY", [], REFERENCE_HALO], ["ruleY", [], REFERENCE_STYLE]]);
});
