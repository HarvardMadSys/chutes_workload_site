// Every Insights card against its shipped answer (the cards of `insights/`, as `page/topics.js` lists them, and the
// figure answers `make data` wrote): its kind's columns, its panels, its series, its palette, its legend answer, and
// the figure answers' index.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CHART_KINDS } from "../site/js/insights/figure_card.js";
import { PALETTES } from "../site/js/insights/card_series.js";
import { shippedAnswer } from "./fake_page.js";
import { everyCard } from "./insights_fixtures.js";

// The columns a figure answer of each chart kind holds: the plot-ready tables' contract.
const KIND_COLUMNS = Object.freeze({
  lines: ["series", "x", "y"],
  cdf: ["series", "x", "cdf"],
  bands: ["x", "p10", "p25", "p50", "p75", "p90"],
  cells: ["x_low", "x_high", "y_low", "y_high", "value"],
  raster: ["x", "y", "value"],
  scatter: ["x", "y", "value"],
  boxes: ["series", "low", "q1", "median", "q3", "high", "count"],
  bars: ["series", "x", "value"],
  stacked_bars: ["series", "x", "value"],
});

// The columns of a legend answer, which gives the share cards their series' order.
const LEGEND_COLUMNS = ["series", "rank"];

// The columns of `rows` missing from at least one row: none for an answer of the kind's columns.
function missingColumns(rows, columns) {
  return columns.filter((column) => !rows.every((row) => Object.hasOwn(row, column)));
}

test("every card names one of the nine kinds, and every kind has its columns", () => {
  assert.deepEqual(Object.keys(CHART_KINDS).sort(), Object.keys(KIND_COLUMNS).sort());
  for (const card of everyCard()) {
    assert.ok(Object.hasOwn(CHART_KINDS, card.kind), `${card.figure}: ${card.kind}`);
  }
});

test("every card's shipped answer has its kind's columns", () => {
  for (const card of everyCard()) {
    const missing = missingColumns(shippedAnswer(`figures/${card.figure}`), KIND_COLUMNS[card.kind]);
    assert.deepEqual(missing, [], `${card.figure} is drawn as ${card.kind} but lacks ${missing}`);
  }
});

test("a card of panels has an answer whose panel column holds every panel it lists", () => {
  for (const card of everyCard().filter((one) => one.panels !== undefined)) {
    const panels = new Set(shippedAnswer(`figures/${card.figure}`).map((row) => row.panel));
    for (const entry of card.panels) {
      assert.ok(panels.has(entry.panel), `${card.figure} has no rows of the panel ${entry.panel}`);
    }
  }
});

test("a card listing its series names only series its answer holds, each once", () => {
  const withSeries = everyCard().filter((card) => card.series !== undefined);
  assert.ok(withSeries.length > 0);
  for (const card of withSeries) {
    const answerSeries = new Set(shippedAnswer(`figures/${card.figure}`).map((row) => row.series));
    assert.equal(new Set(card.series).size, card.series.length, card.figure);
    for (const name of card.series) {
      assert.ok(answerSeries.has(name), `${card.figure} lists ${name}, which its answer does not hold`);
    }
  }
});

test("a card naming a palette names one of the palettes", () => {
  for (const card of everyCard().filter((one) => one.palette !== undefined)) {
    assert.ok(Object.hasOwn(PALETTES, card.palette), `${card.figure}: ${card.palette}`);
  }
});

test("a card naming a legend has a legend answer of series and ranks", () => {
  const withLegend = everyCard().filter((card) => card.legend !== undefined);
  assert.ok(withLegend.length > 0);
  for (const card of withLegend) {
    assert.deepEqual(missingColumns(shippedAnswer(`figures/${card.legend}`), LEGEND_COLUMNS), [], card.legend);
  }
});

test("the figure answers' index lists every card's figure and legend", () => {
  const index = shippedAnswer("figures");
  for (const card of everyCard()) {
    assert.ok(Object.hasOwn(index, card.figure), card.figure);
    if (card.legend !== undefined) {
      assert.ok(Object.hasOwn(index, card.legend), card.legend);
    }
  }
});
