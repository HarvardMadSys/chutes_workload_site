import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DISTRIBUTION_CHARTS, drawDistributionCharts, drawDistributionCurves, formatTtftTick, placeDistributionCharts,
  showChartsError, showChartsLoading,
} from "../site/js/traffic/traffic_distribution_charts.js";
import { FakeElement, useFakeDocument } from "./fake_page.js";

// The bars' legend of two families, and their breakdown.
const LEGEND = {
  series: [{ name: "Kin", label: "Kin" }, { name: "Pi", label: "Pi" }],
  colours: new Map([["Kin", "var(--series-1)"], ["Pi", "var(--series-2)"]]),
};
const FAMILIES = { column: "family" };

// The three charts' places by metric, as `placeDistributionCharts` gives them.
function chartPlaces() {
  return { input_tokens: new FakeElement("div"), output_tokens: new FakeElement("div"), ttft: new FakeElement("div") };
}

// The metric whose place in `places` is the very element `element`, or undefined where none is.
function metricOf(places, element) {
  return Object.keys(places).find((metric) => places[metric] === element);
}

// The text of each place's note.
function placeTexts(places) {
  return Object.values(places).map((place) => place.querySelector(".note").textContent);
}

// A histogram row of the trace's first week, of the family `family`, of the metric `metric` in the bin `bin`.
function histogramRow(family, metric, bin) {
  return { week: 0, first_day: "2025-04-11", family, metric, bins: [bin], requests: [3] };
}

test("a TTFT tick is written as a duration under a minute and in seconds from a minute", () => {
  assert.deepEqual([0.01, 0.1, 1, 10, 100, 1000].map(formatTtftTick), [
    "10 ms", "0.1 s", "1 s", "10 s", "100 s", "1,000 s",
  ]);
});

test("the three charts are placed once in their row, each titled over its place, loading, keyed by metric",
  (context) => {
    useFakeDocument(context);
    const row = new FakeElement("div");
    const places = placeDistributionCharts(row);
    assert.deepEqual(Object.keys(places), ["input_tokens", "output_tokens", "ttft"]);
    const charts = row.querySelectorAll(".distribution-chart");
    const titles = charts.map((chart) => chart.querySelector("h3").textContent);
    assert.deepEqual(titles, ["Input tokens", "Output tokens", "Time to first token"]);
    const titleClasses = charts.map((chart) => chart.querySelector("h3").className);
    assert.deepEqual(titleClasses, Array(3).fill("figure-title"));
    const bodies = charts.map((chart) => chart.querySelector(".figure-body"));
    const metrics = bodies.map((body) => metricOf(places, body));
    assert.deepEqual(metrics, ["input_tokens", "output_tokens", "ttft"], "each place is its chart's figure body");
    const loading = bodies.map((body) => body.querySelector(".loading").className);
    assert.deepEqual(loading, Array(3).fill("loading"));
  });

test("the three charts draw the input tokens, output tokens and TTFT, each over its fixed domain", () => {
  const domains = DISTRIBUTION_CHARTS.map((chart) => [chart.metric, chart.x.domain]);
  assert.deepEqual(domains, [
    ["input_tokens", [1, 1_000_000]], ["output_tokens", [1, 100_000]], ["ttft", [0.01, 100]],
  ]);
  const names = DISTRIBUTION_CHARTS.map((chart) => chart.name);
  assert.deepEqual(names, [
    "Input tokens distribution", "Output tokens distribution", "Time to first token distribution",
  ]);
});

test("each chart's log x axis is ticked at its listed ticks, from its domain's start to its end", () => {
  const ticks = DISTRIBUTION_CHARTS.map((chart) => chart.x.ticks);
  assert.deepEqual(ticks, [[1, 100, 10_000, 1_000_000], [1, 1_000, 100_000], [0.01, 1, 100]]);
  for (const chart of DISTRIBUTION_CHARTS) {
    assert.ok(chart.x.log);
    assert.deepEqual([chart.x.ticks[0], chart.x.ticks.at(-1)], chart.x.domain, `${chart.metric}: both ends labelled`);
  }
  assert.deepEqual(DISTRIBUTION_CHARTS[1].x.ticks.map(DISTRIBUTION_CHARTS[1].x.tickFormat), ["1", "1k", "100k"]);
  assert.deepEqual(DISTRIBUTION_CHARTS[2].x.ticks.map(DISTRIBUTION_CHARTS[2].x.tickFormat), ["10 ms", "1 s", "100 s"]);
});

test("a chart's rows beyond its domain are kept, so its line leaves the chart at the edge", async (context) => {
  useFakeDocument(context);
  context.mock.method(console, "error", () => undefined); // node has no Plot: each chart shows an error instead
  // Bin 108 of a quarter-doubling holds 2^27 input tokens, about 1.3 × 10^8, beyond the input axis's 10^6.
  const rows = [histogramRow("Kin", "input_tokens", 0), histogramRow("Kin", "input_tokens", 108)];
  const drawn = await drawDistributionCharts(chartPlaces(), { rows, breakdown: FAMILIES, legend: LEGEND }, new Set());
  const values = drawn.charts[0].rows.map((row) => row.x);
  assert.equal(values.length, 2);
  assert.ok(values[1] > 1e8, "the row beyond the domain stays");
});

test("the charts' places show the loading state, then an error, each in its place, logged once", (context) => {
  useFakeDocument(context);
  context.mock.method(console, "error", () => undefined);
  const places = chartPlaces();
  showChartsLoading(places);
  const loading = Object.values(places).map((place) => place.querySelector(".loading").className);
  assert.deepEqual(loading, Array(3).fill("loading"));
  showChartsError(places, new Error("Could not fetch the histograms"));
  const errors = Object.values(places).map((place) => place.querySelector(".note").className);
  assert.deepEqual(errors, Array(3).fill("note is-error"));
  assert.deepEqual(placeTexts(places), Array(3).fill("Could not fetch the histograms"));
  assert.equal(console.error.mock.callCount(), 1);
});

test("a chart whose choice records no value says so in its place", async (context) => {
  useFakeDocument(context);
  const places = chartPlaces();
  const drawn = await drawDistributionCharts(places, { rows: [], breakdown: FAMILIES, legend: LEGEND }, new Set());
  assert.deepEqual(placeTexts(places), Array(3).fill("None of the chosen requests records this value."));
  assert.deepEqual(drawn.charts.map((chart) => chart.rows), [[], [], []]);
  const metrics = drawn.charts.map((chart) => metricOf(places, chart.body));
  assert.deepEqual(metrics, ["input_tokens", "output_tokens", "ttft"], "each chart drawn in its metric's place");
});

test("every series hidden in the bars' legend shows the legend's note in each chart", async (context) => {
  useFakeDocument(context);
  const places = chartPlaces();
  const drawn = await drawDistributionCharts(places, { rows: [], breakdown: FAMILIES, legend: LEGEND }, new Set());
  await drawDistributionCurves(drawn, new Set(["Kin", "Pi"]));
  assert.deepEqual(placeTexts(places), Array(3).fill("Every series is hidden: click one in the legend to show it."));
});

test("a chart draws the lines of the series the bars' legend lists, none of a series it has no button for",
  async (context) => {
    useFakeDocument(context);
    context.mock.method(console, "error", () => undefined); // node has no Plot: each chart shows an error instead
    const rows = [histogramRow("Kin", "ttft", 0), histogramRow("Rho", "ttft", 4)];
    const colours = new Map([...LEGEND.colours, ["Rho", "var(--series-3)"]]);
    const legend = { series: LEGEND.series, colours };
    const drawn = await drawDistributionCharts(chartPlaces(), { rows, breakdown: FAMILIES, legend }, new Set());
    assert.deepEqual(drawn.charts[2].rows.map((row) => row.series), ["Kin"]);
  });

test("a chart shows the no-value note where every series with a line is hidden and the others record no value",
  async (context) => {
    useFakeDocument(context);
    const places = chartPlaces();
    const rows = [histogramRow("Kin", "ttft", 0)];
    await drawDistributionCharts(places, { rows, breakdown: FAMILIES, legend: LEGEND }, new Set(["Kin"]));
    assert.deepEqual(placeTexts(places), Array(3).fill("None of the chosen requests records this value."));
  });
