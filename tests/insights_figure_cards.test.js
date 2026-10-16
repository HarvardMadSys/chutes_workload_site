import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  CHART_KINDS, chartParameters, drawFigureChart, frozenCard, newCardElement, PALETTES, plotdataAddress,
  renderFigureCard,
} from "../site/js/insights/figure_card.js";
import { FIGURE_SECTIONS } from "../site/js/insights/figure_sections.js";
import { URLS } from "../site/js/shared/layout.js";

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

// The shipped figure answers' index: each figure's row count, by name.
const FIGURE_INDEX = readJson("../site/data/all/figures.json");

// A shipped answer's rows, read from its file as the page reads it over HTTP.
function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
}

function shippedAnswer(figure) {
  return readJson(`../site/data/all/figures/${figure}.json`);
}

// Every card of every topic.
function everyCard() {
  return FIGURE_SECTIONS.flatMap((topic) => topic.cards);
}

// The columns of `rows` missing from at least one row: none for an answer of the kind's columns.
function missingColumns(rows, columns) {
  return columns.filter((column) => !rows.every((row) => Object.hasOwn(row, column)));
}

// An element of static markup, as `innerHTML` writes it: its tag, its class and its text.
const MARKUP_ELEMENT = /<(\w+)(?: class="([^"]*)")?>([^<]*)<\/\1>/g;

/**
 * A stand-in for a page element: its children, attributes and the properties a card sets. Its markup is read into
 * children, and `querySelector` finds a descendant by one class.
 */
class FakeElement {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.className = "";
    this.textContent = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  set innerHTML(markup) {
    this.children = [];
    for (const [, tag, className, text] of markup.matchAll(MARKUP_ELEMENT)) {
      const child = new FakeElement(tag);
      child.className = className ?? "";
      child.textContent = text;
      this.children.push(child);
    }
  }

  querySelector(selector) {
    for (const child of this.children) {
      if (typeof child === "string") {
        continue;
      }
      if (child.className.split(" ").includes(selector.slice(1))) {
        return child;
      }
      const found = child.querySelector(selector);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }
}

/** Make a stand-in the global document for the test of `context`, and keep the errors a card logs out of its output. */
function useFakeDocument(context) {
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  context.after(() => delete globalThis.document);
  context.mock.method(console, "error", () => undefined);
}

// A card as a topic lists it.
const CARD = Object.freeze({
  figure: "fig_a",
  title: "Daily request rate",
  insight: "Aggregate demand is non-stationary.",
  caption: "Requests rise, peak and decline.",
  definition: "Requests per day.",
  source: "https://github.com/HarvardMadSys/chutes_workload/blob/main/paper/01_workload_overview/README.md",
  kind: "lines",
  chart: { valueLabel: "Requests" },
});

test("every card names one of the nine kinds, and every kind has its columns", () => {
  assert.deepEqual(Object.keys(CHART_KINDS).sort(), Object.keys(KIND_COLUMNS).sort());
  for (const card of everyCard()) {
    assert.ok(Object.hasOwn(CHART_KINDS, card.kind), `${card.figure}: ${card.kind}`);
  }
});

test("every card's shipped answer has its kind's columns", () => {
  for (const card of everyCard()) {
    const missing = missingColumns(shippedAnswer(card.figure), KIND_COLUMNS[card.kind]);
    assert.deepEqual(missing, [], `${card.figure} is drawn as ${card.kind} but lacks ${missing}`);
  }
});

test("a card of panels has an answer whose panel column holds every panel it lists", () => {
  for (const card of everyCard().filter((one) => one.panels !== undefined)) {
    const panels = new Set(shippedAnswer(card.figure).map((row) => row.panel));
    for (const entry of card.panels) {
      assert.ok(panels.has(entry.panel), `${card.figure} has no rows of the panel ${entry.panel}`);
    }
  }
});

test("a card listing its series names only series its answer holds, each once", () => {
  const withSeries = everyCard().filter((card) => card.series !== undefined);
  assert.ok(withSeries.length > 0);
  for (const card of withSeries) {
    const answerSeries = new Set(shippedAnswer(card.figure).map((row) => row.series));
    assert.equal(new Set(card.series).size, card.series.length, card.figure);
    for (const name of card.series) {
      assert.ok(answerSeries.has(name), `${card.figure} lists ${name}, which its answer does not hold`);
    }
  }
});

test("a card naming a palette names one of the palettes", () => {
  assert.deepEqual(Object.keys(PALETTES), ["series", "families", "endpoints"]);
  for (const card of everyCard().filter((one) => one.palette !== undefined)) {
    assert.ok(Object.hasOwn(PALETTES, card.palette), `${card.figure}: ${card.palette}`);
  }
});

test("a card naming a legend has a legend answer of series and ranks", () => {
  const withLegend = everyCard().filter((card) => card.legend !== undefined);
  assert.ok(withLegend.length > 0);
  for (const card of withLegend) {
    assert.deepEqual(missingColumns(shippedAnswer(card.legend), LEGEND_COLUMNS), [], card.legend);
  }
});

test("the figure answers' index lists every card's figure and legend", () => {
  for (const card of everyCard()) {
    assert.ok(Object.hasOwn(FIGURE_INDEX, card.figure), card.figure);
    if (card.legend !== undefined) {
      assert.ok(Object.hasOwn(FIGURE_INDEX, card.legend), card.legend);
    }
  }
});

test("a card is an article, and a wide card is marked wide", (context) => {
  useFakeDocument(context);
  const element = newCardElement(CARD);
  assert.equal(element.tag, "article");
  assert.equal(element.className, "card");
  assert.equal(newCardElement({ ...CARD, isWide: true }).className, "card is-wide");
});

test("a card shows its title, insight, legend place, chart place, caption and Definition control in order", (context) => {
  useFakeDocument(context);
  const container = new FakeElement("article");
  const body = renderFigureCard(container, CARD);
  const [figure] = container.children;
  assert.deepEqual(figure.children.map((part) => part.className), [
    "figure-title", "figure-insight", "figure-legend legend", "figure-body", "figure-caption", "figure-definition",
  ]);
  const [title, insight, , place, caption] = figure.children;
  assert.deepEqual([title.tag, title.textContent], ["h3", CARD.title]);
  assert.equal(insight.textContent, CARD.insight);
  assert.equal(caption.textContent, CARD.caption);
  assert.equal(place, body);
  assert.equal(body.children[0].className, "loading");
});

test("the Definition control opens on the definition and the links to the plot-ready table and the README", (context) => {
  useFakeDocument(context);
  const container = new FakeElement("article");
  renderFigureCard(container, CARD);
  const details = container.children[0].children[5];
  assert.equal(details.tag, "details");
  assert.equal(details.querySelector(".figure-definition-text").textContent, CARD.definition);
  const [plotdata, separator, source] = details.querySelector(".figure-rows").children;
  assert.deepEqual([plotdata.href, plotdata.target, plotdata.textContent], [
    `${URLS.code}/blob/main/data/paper/plotdata/fig_a.parquet`, "_blank", "The plot-ready table · ",
  ]);
  assert.equal(plotdata.children[0].textContent, "data/paper/plotdata/fig_a.parquet");
  assert.equal(typeof separator, "string");
  assert.deepEqual([source.href, source.textContent], [CARD.source, "How it is computed · the artifact on GitHub"]);
});

test("a plot-ready table is linked in the artifact's repository on GitHub", () => {
  assert.equal(plotdataAddress("fig_seasonality"), `${URLS.code}/blob/main/data/paper/plotdata/fig_seasonality.parquet`);
});

test("a card of the endpoints' palette reads the endpoint groups' order with its answer", async (context) => {
  useFakeDocument(context);
  const read = [];
  context.mock.method(globalThis, "fetch", async (file) => {
    read.push(file);
    return { ok: false, status: 404, statusText: "Not Found" };
  });
  await drawFigureChart(new FakeElement("div"), { ...CARD, palette: "endpoints" });
  assert.deepEqual(read, ["data/all/figures/fig_a.json", "data/all/explore/endpoint_mix.json"]);
});

test("a frozen card holds only frozen objects and lists, and its functions as they were", () => {
  const tickFormat = (value) => `${value}`;
  const card = frozenCard({
    ...CARD,
    series: ["Global"],
    chart: { x: { label: "Day", domain: [0, 1], tickFormat }, dashed: ["Global"] },
    panels: [{ panel: "a", title: "(a)", chart: { y: { log: true } } }],
  });
  const parts = [card, card.series, card.chart, card.chart.x, card.chart.x.domain, card.chart.dashed, card.panels];
  parts.push(card.panels[0], card.panels[0].chart, card.panels[0].chart.y);
  assert.ok(parts.every((part) => Object.isFrozen(part)));
  assert.equal(card.chart.x.tickFormat, tickFormat);
  assert.ok(!Object.isFrozen(tickFormat));
});

test("a chart's parameters are its kind's, then the card's, then a panel's with the panel's name", () => {
  const card = { ...CARD, kind: "cdf", chart: { valueLabel: "Tokens", markers: true } };
  assert.deepEqual(chartParameters(card), { cdf: true, valueLabel: "Tokens", markers: true });
  const entry = { panel: "a", title: "(a)", chart: { valueLabel: "Hit ratio" } };
  assert.deepEqual(chartParameters(card, entry), { cdf: true, valueLabel: "Hit ratio", markers: true, panel: "a" });
  const shares = chartParameters({ ...CARD, kind: "stacked_bars" });
  assert.deepEqual([shares.xColumn, shares.seriesColumn, shares.valueColumn], ["x", "series", "value"]);
});

test("an answer that cannot be read shows its error in the chart's place", async (context) => {
  useFakeDocument(context);
  context.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 404, statusText: "Not Found" }));
  const body = new FakeElement("div");
  await drawFigureChart(body, CARD);
  const [note] = body.children;
  assert.equal(note.className, "note is-error");
  assert.match(note.textContent, /data\/all\/figures\/fig_a\.json: 404/);
});
