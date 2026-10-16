// The Insights' cards drawn from their shipped answers, as the landing page's spec describes them: the value under the
// pointer, a log axis, a raster, a hidden series of a CDF card, the hourly lines' gaps, and the colour and the month
// axis the cards share. Each reads a card as its topic lists it and its answer as the page reads it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { brokenAtGaps, drawnPoints, lineTipText } from "../site/js/charts/lines.js";
import { pooledGrid, rasterColourDomain, rasterGrid } from "../site/js/charts/raster.js";
import { axisTicks } from "../site/js/axes/ticks.js";
import { drawWithLegend } from "../site/js/explore/legend.js";
import {
  cardColours, chartParameters, COUNT_COLOUR, figureLegend, TRACE_MONTH_AXIS, TRACE_MONTH_TICKS,
} from "../site/js/insights/figure_card.js";
import { FIGURE_SECTIONS } from "../site/js/insights/figure_sections.js";
import { sequentialColour } from "../site/js/shared/charts.js";
import { SERIES_COLUMN } from "../site/js/shared/series.js";
import { FakeElement, FakeFigureBody } from "./fake_page.js";

const HOURS_IN_WINDOW = 31 * 24; // a raster's window: thirty-one days of hours
const TRACE_MONTHS = 13; // the trace's months, 1 to 13

// The card that draws `figure`, as its topic lists it.
function cardOf(figure) {
  return FIGURE_SECTIONS.flatMap((topic) => topic.cards).find((card) => card.figure === figure);
}

// A shipped answer's rows, read from its file as the page reads it over HTTP.
function shippedAnswer(figure) {
  return JSON.parse(readFileSync(new URL(`../site/data/all/figures/${figure}.json`, import.meta.url), "utf8"));
}

/** Make a stand-in the global document for the test of `context`; node has none of its own. */
function useFakeDocument(context) {
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  context.after(() => delete globalThis.document);
}

/** Let a click's redraw, which runs after the click returns, settle. */
function settle() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("the requests-per-day card's tooltip at day 120 gives the day and its requests", () => {
  const card = cardOf("fig_request_rate_day");
  const row = shippedAnswer(card.figure).find((point) => point.x === 120);
  const [, day, requests] = lineTipText(row, chartParameters(card)).split("\n");
  assert.equal(day, "Day of the trace: 120");
  assert.match(requests, /^Requests: \d+(\.\d)?[kM]?$/);
});

test("the input-tokens card's x axis is logarithmic from 1 to 400,000 tokens, ticked in the site's format", () => {
  const { x: xAxis } = chartParameters(cardOf("fig_token_length_input_cdf_by_model"));
  assert.equal(xAxis.log, true);
  assert.deepEqual(xAxis.domain, [1, 400000]);
  assert.deepEqual(axisTicks(xAxis, []).map(xAxis.tickFormat), ["1", "100", "10k"]);
});

test("the Qwen3-Next-80B raster shades each user row's hours by requests, days on x, pooled past its pixels", () => {
  const card = cardOf("fig_model_raster_qwen3_next_80b");
  const rows = shippedAnswer(card.figure);
  const grid = rasterGrid(rows);
  assert.equal(card.kind, "raster");
  assert.equal(grid.width, HOURS_IN_WINDOW);
  assert.equal(grid.height, Math.max(...rows.map((row) => row.y)) + 1);
  assert.equal(card.chart.valueLabel, "Requests per hour");
  assert.equal(card.chart.x.label, "Day of the window");
  assert.deepEqual(card.chart.x.ticks.map(card.chart.x.tickFormat), ["0", "6", "12", "18", "24", "30"]);
  // At a desktop card's 424 pixels, two hours share a pixel, and every hour with requests stays shaded.
  const pooled = pooledGrid(grid, 424, 160);
  assert.equal(pooled.columnStep, 2);
  const shaded = (values) => values.filter((value) => !Number.isNaN(value));
  assert.equal(Math.max(...shaded(pooled.values)), Math.max(...shaded(grid.values)));
  assert.deepEqual(rasterColourDomain(card.chart, rows), [1, 13851]);
});

test("hiding DeepSeek R1 in the input-tokens card's legend leaves the other lines as drawn", async (context) => {
  const hiddenSeries = "Deepseek R1"; // the answer's spelling, which the legend labels "DeepSeek R1"
  useFakeDocument(context);
  const card = cardOf("fig_token_length_input_cdf_by_model");
  const rows = shippedAnswer(card.figure);
  const colours = cardColours(card, rows, null);
  const drawings = [];
  const drawChart = (hidden) => drawings.push(drawnPoints(rows, colours, chartParameters(card), hidden));
  const body = new FakeFigureBody();
  await drawWithLegend(body, figureLegend(card, rows, colours), drawChart, "line");
  const button = body.legendPlace.children.find((entry) => entry.children.includes("DeepSeek R1"));
  button.dispatch("click");
  await settle();
  const [before, after] = drawings;
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.ok(before.some((point) => point[SERIES_COLUMN] === hiddenSeries));
  assert.deepEqual(after, before.filter((point) => point[SERIES_COLUMN] !== hiddenSeries));
});

test("a CDF card's legend draws its global series' swatch dashed, as its line", () => {
  const card = cardOf("fig_token_length_input_cdf_by_model");
  const rows = shippedAnswer(card.figure);
  const legend = figureLegend(card, rows, cardColours(card, rows, null));
  assert.deepEqual(legend.dashed, ["Global"]);
  assert.ok(legend.series.some((entry) => entry.name === "Global"));
});

test("the hourly lines break where an hour is missing from their answers, and nowhere else", () => {
  const breaks = {};
  for (const figure of ["fig_lb_request_rate", "fig_lb_active_instances", "fig_lb_maxmean_tokens"]) {
    const { gap } = cardOf(figure).chart;
    const rows = shippedAnswer(figure);
    breaks[figure] = brokenAtGaps(rows, gap, "y").length - rows.length;
  }
  // Counted from the answers: the steps between neighbouring hours longer than an hour.
  assert.deepEqual(breaks, { fig_lb_request_rate: 0, fig_lb_active_instances: 3, fig_lb_maxmean_tokens: 18 });
});

test("a count's colour is viridis on a log scale from a quarter along it, ticked where the card's chart gives", () => {
  const colour = sequentialColour({ ...COUNT_COLOUR, valueLabel: "Models" }, "Blues", [1, 10, 100]);
  assert.deepEqual([colour.scheme, colour.type, colour.range], ["viridis", "log", [0.25, 1]]);
  assert.deepEqual(colour.ticks, [1, 10, 100]);
  assert.ok(Object.isFrozen(COUNT_COLOUR));
});

test("the trace's month axis labels every third month from the first to the thirteenth, as numbers", () => {
  assert.deepEqual(TRACE_MONTH_AXIS.ticks, TRACE_MONTH_TICKS);
  assert.deepEqual(TRACE_MONTH_TICKS.map(TRACE_MONTH_AXIS.tickFormat), ["1", "4", "7", "10", "13"]);
  assert.equal(TRACE_MONTH_TICKS.at(-1), TRACE_MONTHS);
  assert.match(TRACE_MONTH_AXIS.label, /1 = April 2025/);
  assert.ok(Object.isFrozen(TRACE_MONTH_AXIS) && Object.isFrozen(TRACE_MONTH_TICKS));
});
