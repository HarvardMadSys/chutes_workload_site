// The Request shape and latency topic's cards (`insights/tokens.js`) drawn from their shipped answers as the
// `landing-page` spec describes them: the input-tokens CDF's log axis, its legend's dashed global series, a series
// hidden through that legend, its straight lines and its tooltip kept within the axis, and the hit-ratio grid's
// all-cached row. Each reads a card as its topic lists it and its answer as the page reads it.

import assert from "node:assert/strict";
import { test } from "node:test";

import { drawnPoints, framedPoints, linePoints, lineYAxis, seriesLine } from "../site/js/charts/lines.js";
import { cellTipText } from "../site/js/charts/cells.js";
import { axisTicks } from "../site/js/plot/axes.js";
import { drawWithLegend } from "../site/js/shared/legend.js";
import { legendPlace, renderFigure } from "../site/js/shared/figure.js";
import { cardColours, figureLegend } from "../site/js/insights/card_series.js";
import { chartParameters } from "../site/js/insights/figure_card.js";
import { SERIES_COLUMN } from "../site/js/shared/series.js";
import { FakeElement, settled, shippedAnswer, useFakePage } from "./fake_page.js";
import { cardOf } from "./insights_fixtures.js";

// A stand-in for Plot's line mark, returning its name and the arguments it was given.
const FAKE_LINE_PLOT = { line: (...args) => ["line", ...args] };

test("the input-tokens card's x axis is logarithmic from 10 to 1,000,000 tokens, ticked 100 to 100k", () => {
  const { x: xAxis } = chartParameters(cardOf("fig_token_length_input_cdf_by_model"));
  assert.equal(xAxis.log, true);
  assert.deepEqual(xAxis.domain, [10, 1000000]);
  assert.deepEqual(axisTicks(xAxis, []).map(xAxis.tickFormat), ["100", "1k", "10k", "100k"]);
});

test("the hit-ratio grid labels its all-cached top row 100% at its centre, and its tooltip says 100% once", () => {
  const card = cardOf("fig_ttft_heatmap_input_cached");
  const parameters = chartParameters(card);
  const { y: yAxis } = parameters;
  assert.deepEqual(axisTicks(yAxis, []).map(yAxis.tickFormat), ["0%", "20%", "40%", "60%", "80%", "100%"]);
  const allCached = shippedAnswer(`figures/${card.figure}`).find((cell) => cell.y_low === 1);
  assert.equal(yAxis.ticks.at(-1), (allCached.y_low + allCached.y_high) / 2);
  assert.equal(cellTipText(allCached, parameters).split("\n")[1], "Token hit ratio: 100%");
});

test("hiding DeepSeek R1 in the input-tokens card's legend leaves the other lines as drawn", async (context) => {
  const hiddenSeries = "Deepseek R1"; // the answer's spelling, which the legend labels "DeepSeek R1"
  useFakePage(context);
  const card = cardOf("fig_token_length_input_cdf_by_model");
  const rows = shippedAnswer(`figures/${card.figure}`);
  const colours = cardColours(card, rows, null);
  const drawings = [];
  const drawChart = (hidden) => drawings.push(drawnPoints(rows, colours, chartParameters(card), hidden));
  const body = renderFigure(new FakeElement("div"), card);
  await drawWithLegend(body, { ...figureLegend(card, rows, colours), swatch: "line" }, drawChart);
  const button = legendPlace(body).children.find((entry) => entry.children.includes("DeepSeek R1"));
  button.dispatch("click");
  await settled();
  const [before, after] = drawings;
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.ok(before.some((point) => point[SERIES_COLUMN] === hiddenSeries));
  assert.deepEqual(after, before.filter((point) => point[SERIES_COLUMN] !== hiddenSeries));
});

test("a CDF card's legend draws its global series' swatch dashed, as its line", () => {
  const card = cardOf("fig_token_length_input_cdf_by_model");
  const rows = shippedAnswer(`figures/${card.figure}`);
  const legend = figureLegend(card, rows, cardColours(card, rows, null));
  assert.deepEqual(legend.dashed, ["Global"]);
  assert.ok(legend.series.some((entry) => entry.name === "Global"));
});

test("the input-tokens CDF joins its percentile points with straight lines", () => {
  const card = cardOf("fig_token_length_input_cdf_by_model");
  const points = linePoints(shippedAnswer(`figures/${card.figure}`), true);
  const parameters = chartParameters(card);
  const [, drawn, options] = seriesLine(FAKE_LINE_PLOT, points, "Global", { ...parameters, y: lineYAxis(parameters) });
  assert.equal(options.curve, "linear");
  assert.ok(drawn.length > 2);
});

test("the input-tokens card's tooltip names no point outside its axis's 10 to 1,000,000 tokens", () => {
  const card = cardOf("fig_token_length_input_cdf_by_model");
  const rows = shippedAnswer(`figures/${card.figure}`);
  const parameters = chartParameters(card);
  const drawn = drawnPoints(linePoints(rows, true), cardColours(card, rows, null), parameters, new Set());
  const tipped = framedPoints(drawn, parameters.x, lineYAxis(parameters));
  assert.ok(drawn.some((point) => point.x < 10 || point.x > 1000000), "the answer runs past the axis");
  assert.ok(tipped.length > 0 && tipped.every((point) => point.x >= 10 && point.x <= 1000000));
});
