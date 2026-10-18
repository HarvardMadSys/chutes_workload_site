// The Insights' cards (the topics of `insights/`) drawn from their shipped answers by the chart kinds of `charts/`, as
// the `landing-page` spec describes them: the value under the pointer, a log axis, a raster, a hidden series of a CDF
// card, a CDF's straight lines, the hourly lines' gaps, the routing card's rows of panels and its policy legend, a
// bands card's key, the hit-ratio grid's all-cached row, and the colour and the day axis the cards share. Each reads
// a card as its topic lists it and its answer as the page reads it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  brokenAtGaps, drawnPoints, framedPoints, linePoints, lineTipText, lineYAxis, seriesLine,
} from "../site/js/charts/lines.js";
import { bandKey, bandsColour } from "../site/js/charts/bands.js";
import {
  pooledGrid, rasterColourDomain, rasterGrid, rasterYDomain, rowBoundaries, rowRules,
} from "../site/js/charts/raster.js";
import { axisTicks } from "../site/js/plot/axes.js";
import { cellTipText } from "../site/js/charts/cells.js";
import { drawWithLegend, hasLegend } from "../site/js/shared/legend.js";
import { cardColours, COUNT_COLOUR, figureLegend } from "../site/js/insights/card_series.js";
import { chartParameters } from "../site/js/insights/figure_card.js";
import { TRACE_DAY_AXIS } from "../site/js/plot/trace_axes.js";
import { TOPICS, topicCards } from "../site/js/page/topics.js";
import { sequentialColour, titledFrame } from "../site/js/plot/frame.js";
import { SERIES_SLOTS } from "../site/js/theme/colours.js";
import { SERIES_COLUMN } from "../site/js/shared/series.js";
import { FakeElement, FakeFigureBody, settled, useFakeDocument } from "./fake_page.js";

const HOURS_IN_WINDOW = 31 * 24; // a raster's window: thirty-one days of hours
// A stand-in for Plot's line mark, returning its name and the arguments it was given.
const FAKE_LINE_PLOT = { line: (...args) => ["line", ...args] };

// The card that draws `figure`, as its topic lists it.
function cardOf(figure) {
  return TOPICS.flatMap(topicCards).find((card) => card.figure === figure);
}

// A shipped answer's rows, read from its file as the page reads it over HTTP.
function shippedAnswer(figure) {
  return JSON.parse(readFileSync(new URL(`../site/data/all/figures/${figure}.json`, import.meta.url), "utf8"));
}

test("the requests-per-day card's tooltip at day 120 gives the day with its date and its requests", () => {
  const card = cardOf("fig_request_rate_day");
  const row = shippedAnswer(card.figure).find((point) => point.x === 120);
  const [, day, requests] = lineTipText(row, chartParameters(card)).split("\n");
  assert.equal(day, "Day 120 · Aug 9, 2025");
  assert.match(requests, /^Requests: \d+(\.\d)?[kM]?$/);
});

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
  const allCached = shippedAnswer(card.figure).find((cell) => cell.y_low === 1);
  assert.equal(yAxis.ticks.at(-1), (allCached.y_low + allCached.y_high) / 2);
  assert.equal(cellTipText(allCached, parameters).split("\n")[1], "Token hit ratio: 100%");
});

test("the Qwen3-Next-80B raster shades each user row's hours by requests, days on x, pooled past its pixels", () => {
  const card = cardOf("fig_model_raster_qwen3_next_80b");
  const rows = shippedAnswer(card.figure);
  const grid = rasterGrid(rows);
  assert.equal(card.kind, "raster");
  assert.equal(grid.columnCount, HOURS_IN_WINDOW);
  assert.equal(grid.rowCount, Math.max(...rows.map((row) => row.y)) + 1);
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

test("the periodic user's raster ticks its model rows on their centres and parts them by rules", () => {
  const card = cardOf("fig_user_raster_periodic");
  const grid = rasterGrid(shippedAnswer(card.figure));
  const [low, high] = rasterYDomain(grid.rowCount);
  assert.deepEqual([low, high], [-0.5, grid.rowCount - 0.5]);
  assert.equal(rowBoundaries(grid.rowCount).length, grid.rowCount - 1);
  assert.ok(rowBoundaries(grid.rowCount).every((boundary) => boundary > low && boundary < high));
  // At the card's own plot height its rows are tall enough to be parted: a rule at every boundary.
  const frame = titledFrame(new FakeFigureBody(), card.chart.y.label, card.chart.margins, card.chart.height);
  const plotHeight = frame.height - frame.marginTop - frame.marginBottom;
  assert.deepEqual(rowRules({ ruleY: (values) => values }, grid.rowCount, plotHeight), rowBoundaries(grid.rowCount));
});

test("a bands card's key names its two bands and its median in the card's colour, with no legend of buttons", (context) => {
  useFakeDocument(context);
  const card = cardOf("fig_monthly_input_token_intervals");
  const rows = shippedAnswer(card.figure);
  assert.equal(card.kind, "bands");
  assert.ok(!hasLegend(figureLegend(card, rows, cardColours(card, rows, null)).series));
  const key = bandKey(bandsColour(chartParameters(card)));
  assert.equal(key.className, "band-key");
  const labels = key.children.map((entry) => entry.children[1]);
  assert.deepEqual(labels, ["10th–90th percentile", "25th–75th", "Median"]);
  const swatches = key.children.map((entry) => entry.children[0]);
  assert.ok(swatches.every((swatch) => swatch.style.background === SERIES_SLOTS[0]));
  assert.deepEqual(swatches.map((swatch) => swatch.className), ["legend-swatch", "legend-swatch", "legend-swatch is-line"]);
  assert.ok(key.children.every((entry) => entry.tag !== "button"));
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
  await drawWithLegend(body, { ...figureLegend(card, rows, colours), swatch: "line" }, drawChart);
  const button = body.legendPlace.children.find((entry) => entry.children.includes("DeepSeek R1"));
  button.dispatch("click");
  await settled();
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
    breaks[figure] = brokenAtGaps(rows, gap).length - rows.length;
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

test("the workload topic's four daily lines and the three hourly lines share the trace's day axis", () => {
  const figures = [
    "fig_request_rate_day", "fig_token_rate_day", "fig_daily_unique_models", "fig_function_name_daily_requests",
    "fig_lb_request_rate", "fig_lb_active_instances", "fig_lb_maxmean_tokens",
  ];
  for (const figure of figures) {
    assert.equal(cardOf(figure).chart.x, TRACE_DAY_AXIS, figure);
  }
  assert.equal(TRACE_DAY_AXIS.label, "Day of the trace");
  const hourly = shippedAnswer("fig_lb_request_rate")[0];
  assert.match(TRACE_DAY_AXIS.tipFormat(hourly.x), /^Day 305 · Feb 10, 2026, \d\d:\d\d UTC$/);
});

test("the input-tokens CDF joins its percentile points with straight lines", () => {
  const card = cardOf("fig_token_length_input_cdf_by_model");
  const points = linePoints(shippedAnswer(card.figure), true);
  const parameters = chartParameters(card);
  const [, drawn, options] = seriesLine(FAKE_LINE_PLOT, points, "Global", { ...parameters, y: lineYAxis(parameters) });
  assert.equal(options.curve, "linear");
  assert.ok(drawn.length > 2);
});

// The routing card's models, as its answer names them, in the order of its rows of panels.
const ROUTING_MODELS = ["DeepSeek V3.2", "MiniMax M2.5"];
const ROUTING_PANELS_PER_MODEL = 4; // hit ratio and replication against cache size, replication and imbalance

// The points every panel of `card` draws from `rows` with the series of `hidden` hidden, panel after panel.
function everyPanelsPoints(card, rows, colours, hidden) {
  const points = [];
  for (const entry of card.panels) {
    points.push(...drawnPoints(rows, colours, chartParameters(card, entry), hidden));
  }
  return points;
}

// The distinct series of `points`, sorted.
function seriesOf(points) {
  return [...new Set(points.map((point) => point[SERIES_COLUMN]))].sort();
}

test("the routing card draws eight panels, a row of four per model, each its model's lines only, under its top", () => {
  const card = cardOf("fig_routing_tradeoff");
  const rows = shippedAnswer(card.figure);
  const colours = cardColours(card, rows, null);
  assert.equal(card.panels.length, ROUTING_MODELS.length * ROUTING_PANELS_PER_MODEL);
  for (const [index, entry] of card.panels.entries()) {
    const model = ROUTING_MODELS[Math.floor(index / ROUTING_PANELS_PER_MODEL)];
    const parameters = chartParameters(card, entry);
    const drawn = drawnPoints(rows, colours, parameters, new Set());
    // Every line of the model that the answer holds for the panel: panel d's answer has no Sticky line.
    const panelRows = rows.filter((row) => row.panel === entry.panel && row[SERIES_COLUMN].startsWith(`${model}, `));
    assert.ok(seriesOf(panelRows).length >= 3, entry.title);
    assert.deepEqual(seriesOf(drawn), seriesOf(panelRows), entry.title);
    assert.ok(drawn.every((point) => point.panel === entry.panel), entry.title);
    const [low, high] = parameters.y.domain;
    assert.ok(drawn.every((point) => point.y < high), `${entry.title}: a line reaches its axis's top`);
    // (a) from zero, as the paper's, its lowest lines just over the axis line; the others clear of their axis lines.
    const isClear = entry.panel === "a" ? low === 0 : drawn.every((point) => point.y > low);
    assert.ok(isClear, `${entry.title}: ${entry.panel === "a" ? "not from zero" : "a line lies on the axis line"}`);
  }
});

test("the routing card's legend lists each policy once, and hiding Sticky hides its line in both rows", async (context) => {
  useFakeDocument(context);
  const card = cardOf("fig_routing_tradeoff");
  const rows = shippedAnswer(card.figure);
  const colours = cardColours(card, rows, null);
  const drawings = [];
  const drawChart = (hidden) => drawings.push(everyPanelsPoints(card, rows, colours, hidden));
  const body = new FakeFigureBody();
  await drawWithLegend(body, { ...figureLegend(card, rows, colours), swatch: "line" }, drawChart);
  const labels = body.legendPlace.children.map((button) => button.children[1]);
  assert.deepEqual(labels, ["Round-robin", "Load-first", "Cache-first", "Sticky"]);
  const button = body.legendPlace.children.find((entry) => entry.children.includes("Sticky"));
  button.dispatch("click");
  await settled();
  const [before, after] = drawings;
  const isSticky = (point) => point[SERIES_COLUMN].endsWith(", Sticky");
  assert.deepEqual(seriesOf(before.filter(isSticky)), ["DeepSeek V3.2, Sticky", "MiniMax M2.5, Sticky"]);
  assert.deepEqual(after, before.filter((point) => !isSticky(point)));
});

test("the input-tokens card's tooltip names no point outside its axis's 10 to 1,000,000 tokens", () => {
  const card = cardOf("fig_token_length_input_cdf_by_model");
  const rows = shippedAnswer(card.figure);
  const parameters = chartParameters(card);
  const drawn = drawnPoints(linePoints(rows, true), cardColours(card, rows, null), parameters, new Set());
  const tipped = framedPoints(drawn, parameters.x, lineYAxis(parameters));
  assert.ok(drawn.some((point) => point.x < 10 || point.x > 1000000), "the answer runs past the axis");
  assert.ok(tipped.length > 0 && tipped.every((point) => point.x >= 10 && point.x <= 1000000));
});

test("the two user zooms have no legend: each of their panels holds one series, which its title names", () => {
  for (const figure of ["fig_lb_user_zoom_top", "fig_lb_user_zoom_min"]) {
    const card = cardOf(figure);
    const rows = shippedAnswer(figure);
    assert.deepEqual(figureLegend(card, rows, cardColours(card, rows, null)).series, [], figure);
  }
  const routing = cardOf("fig_routing_tradeoff");
  const rows = shippedAnswer(routing.figure);
  assert.equal(figureLegend(routing, rows, cardColours(routing, rows, null)).series.length, 4);
});
