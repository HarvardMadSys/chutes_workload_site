import assert from "node:assert/strict";
import { test } from "node:test";

import {
  drawTileCharts, drawTileCurves, formatTtftTick, showChartsError, showChartsLoading, TILE_CHARTS,
} from "../site/js/traffic/traffic_tile_charts.js";
import { FakeElement, useFakeDocument } from "./fake_page.js";

// The bars' legend of two families, and their kind of series.
const LEGEND = {
  series: [{ name: "Kin", label: "Kin" }, { name: "Pi", label: "Pi" }],
  colours: new Map([["Kin", "var(--series-1)"], ["Pi", "var(--series-2)"]]),
};
const FAMILIES = { column: "family" };

// The three charts' places, as the tiles hold them.
function chartPlaces() {
  return [new FakeElement("div"), new FakeElement("div"), new FakeElement("div")];
}

// The text of each place's first part: its note or its loading line.
function placeTexts(places) {
  return places.map((place) => place.children[0].textContent);
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

test("the three charts draw the input tokens, output tokens and TTFT, each over its fixed domain", () => {
  const domains = TILE_CHARTS.map((chart) => [chart.metric, chart.x.domain]);
  assert.deepEqual(domains, [
    ["input_tokens", [1, 1_000_000]], ["output_tokens", [1, 100_000]], ["ttft", [0.01, 100]],
  ]);
  const names = TILE_CHARTS.map((chart) => chart.name);
  assert.deepEqual(names, [
    "Input tokens distribution", "Output tokens distribution", "Time to first token distribution",
  ]);
});

test("each chart's log x axis is ticked at its listed ticks, from its domain's start to its end", () => {
  const ticks = TILE_CHARTS.map((chart) => chart.x.ticks);
  assert.deepEqual(ticks, [[1, 100, 10_000, 1_000_000], [1, 1_000, 100_000], [0.01, 1, 100]]);
  for (const chart of TILE_CHARTS) {
    assert.ok(chart.x.log);
    assert.deepEqual([chart.x.ticks[0], chart.x.ticks.at(-1)], chart.x.domain, `${chart.metric}: both ends labelled`);
  }
  assert.deepEqual(TILE_CHARTS[1].x.ticks.map(TILE_CHARTS[1].x.tickFormat), ["1", "1k", "100k"]);
  assert.deepEqual(TILE_CHARTS[2].x.ticks.map(TILE_CHARTS[2].x.tickFormat), ["10 ms", "1 s", "100 s"]);
});

test("a chart's rows beyond its domain are kept, so its line leaves the chart at the edge", async (context) => {
  useFakeDocument(context);
  context.mock.method(console, "error", () => undefined); // node has no Plot: each chart shows an error instead
  // Bin 108 of a quarter-doubling holds 2^27 input tokens, about 1.3 × 10^8, beyond the input axis's 10^6.
  const rows = [histogramRow("Kin", "input_tokens", 0), histogramRow("Kin", "input_tokens", 108)];
  const drawn = await drawTileCharts(chartPlaces(), { rows, series: FAMILIES, legend: LEGEND }, new Set());
  const values = drawn.charts[0].rows.map((row) => row.x);
  assert.equal(values.length, 2);
  assert.ok(values[1] > 1e8, "the row beyond the domain stays");
});

test("the charts' places show the loading state, then an error, each in its place, logged once", (context) => {
  useFakeDocument(context);
  context.mock.method(console, "error", () => undefined);
  const places = chartPlaces();
  showChartsLoading(places);
  assert.deepEqual(places.map((place) => place.children[0].className), ["loading", "loading", "loading"]);
  showChartsError(places, new Error("Could not fetch the histograms"));
  assert.deepEqual(places.map((place) => place.children[0].className), Array(3).fill("note is-error"));
  assert.deepEqual(placeTexts(places), Array(3).fill("Could not fetch the histograms"));
  assert.equal(console.error.mock.callCount(), 1);
});

test("a chart whose choice records no value says so in its place", async (context) => {
  useFakeDocument(context);
  const places = chartPlaces();
  const drawn = await drawTileCharts(places, { rows: [], series: FAMILIES, legend: LEGEND }, new Set());
  assert.deepEqual(placeTexts(places), Array(3).fill("None of the chosen requests records this value."));
  assert.deepEqual(drawn.charts.map((chart) => chart.rows), [[], [], []]);
});

test("every series hidden in the bars' legend shows the legend's note in each chart", async (context) => {
  useFakeDocument(context);
  const places = chartPlaces();
  const drawn = await drawTileCharts(places, { rows: [], series: FAMILIES, legend: LEGEND }, new Set());
  await drawTileCurves(drawn, new Set(["Kin", "Pi"]));
  assert.deepEqual(placeTexts(places), Array(3).fill("Every series is hidden: click one in the legend to show it."));
});

test("a chart draws the lines of the series the bars' legend lists, none of a series it has no button for",
  async (context) => {
    useFakeDocument(context);
    context.mock.method(console, "error", () => undefined); // node has no Plot: each chart shows an error instead
    const rows = [histogramRow("Kin", "ttft", 0), histogramRow("Rho", "ttft", 4)];
    const colours = new Map([...LEGEND.colours, ["Rho", "var(--series-3)"]]);
    const legend = { series: LEGEND.series, colours };
    const drawn = await drawTileCharts(chartPlaces(), { rows, series: FAMILIES, legend }, new Set());
    assert.deepEqual(drawn.charts[2].rows.map((row) => row.series), ["Kin"]);
  });

test("a chart shows the no-value note where every series with a line is hidden and the others record no value",
  async (context) => {
    useFakeDocument(context);
    const places = chartPlaces();
    const rows = [histogramRow("Kin", "ttft", 0)];
    await drawTileCharts(places, { rows, series: FAMILIES, legend: LEGEND }, new Set(["Kin"]));
    assert.deepEqual(placeTexts(places), Array(3).fill("None of the chosen requests records this value."));
  });
