// The Plot options every chart kind starts from (`plot/frame.js`): frame, margins, reference rules, colour scales.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CHART_HEIGHT, chartFrame, chartWidth, colourScale, DASH, divergingColour, haloedReferenceRule, REFERENCE_HALO,
  REFERENCE_STYLE, referenceRule, sequentialColour, SURFACE_INK, titledFrame,
} from "../site/js/plot/frame.js";
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

test("a chart whose y axis has no title has a small top margin, and a card's margins are kept", () => {
  assert.equal(titledFrame({ clientWidth: 600 }, "Requests", undefined).marginTop, 32);
  assert.equal(titledFrame({ clientWidth: 600 }, null, undefined).marginTop, 12);
  assert.equal(titledFrame({ clientWidth: 600 }, "Requests", { marginLeft: 40 }).marginLeft, 40);
});

test("a chart is as tall as its card's height, and CHART_HEIGHT where the card gives none", () => {
  assert.equal(titledFrame({ clientWidth: 600 }, "Requests", undefined).height, CHART_HEIGHT);
  assert.equal(titledFrame({ clientWidth: 600 }, "Requests", undefined, undefined).height, CHART_HEIGHT);
  assert.equal(titledFrame({ clientWidth: 600 }, null, { marginLeft: 40 }, 340).height, 340);
  assert.equal(chartFrame({ clientWidth: 600 }, 400).height, 400);
});

test("a sequential colour scale takes the card's scheme, linear or a log one where asked, with its legend in its format", () => {
  assert.deepEqual(sequentialColour({ valueLabel: "Requests" }, "YlOrRd"), {
    type: "linear", scheme: "YlOrRd", legend: true, label: "Requests", tickFormat: undefined,
  });
  assert.equal(sequentialColour({ valueLabel: "Users", valueFormat: String }, "Blues").tickFormat, String);
  assert.equal(sequentialColour({ colourLog: true, valueLabel: "Users", valueFormat: String }, "Blues").tickFormat, undefined);
  assert.equal(sequentialColour({ scheme: "Viridis", valueLabel: "Users" }, "YlOrRd").scheme, "Viridis");
  assert.equal(sequentialColour({ colourLog: true, valueLabel: "Users" }, "Blues").type, "log");
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

test("the colour scale diverges from zero on the card's scheme and domain, RdBu when it names none", () => {
  const valueFormat = (value) => value.toFixed(2);
  assert.deepEqual(divergingColour({ colourDomain: [-1, 1], valueLabel: "Autocorrelation", valueFormat }), {
    type: "diverging", scheme: "RdBu", pivot: 0, domain: [-1, 1], legend: true, label: "Autocorrelation",
    tickFormat: valueFormat,
  });
  assert.equal(divergingColour({ scheme: "BuRd", valueLabel: "Autocorrelation" }).scheme, "BuRd");
  assert.equal(divergingColour({ valueLabel: "Autocorrelation" }).domain, undefined);
});
