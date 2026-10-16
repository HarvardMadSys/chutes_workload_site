import assert from "node:assert/strict";
import { test } from "node:test";

import {
  chartFrame, chartName, chartWidth, colourScale, columnTotal, logColumns, panelRows, positiveRows, titledFrame,
} from "../site/js/shared/charts.js";
import { assignColours } from "../site/js/theme/colours.js";

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

test("a chart whose y axis has no title has a small top margin, and a card's margins are kept", () => {
  assert.equal(titledFrame({ clientWidth: 600 }, "Requests", undefined).marginTop, 32);
  assert.equal(titledFrame({ clientWidth: 600 }, null, undefined).marginTop, 12);
  assert.equal(titledFrame({ clientWidth: 600 }, "Requests", { marginLeft: 40 }).marginLeft, 40);
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
