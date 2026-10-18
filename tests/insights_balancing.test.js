// The Load balancing topic's cards (`insights/balancing.js`) read as the paper's figures: the hourly lines' gaps, the
// occupancy's hours on its ticks and in its tooltip, the user zooms' even split and their panels of one series, and
// the routing card's rows of panels and its policy legend. Each reads a card as its topic lists it and, where it needs
// one, its answer as the page reads it.

import assert from "node:assert/strict";
import { test } from "node:test";

import { cellTipText } from "../site/js/charts/cells.js";
import { brokenAtGaps, drawnPoints } from "../site/js/charts/lines.js";
import { drawWithLegend } from "../site/js/shared/legend.js";
import { legendPlace, renderFigure } from "../site/js/shared/figure.js";
import { cardColours, figureLegend } from "../site/js/insights/card_series.js";
import { chartParameters } from "../site/js/insights/figure_card.js";
import { SERIES_COLUMN } from "../site/js/shared/series.js";
import { FakeElement, settled, shippedAnswer, useFakePage } from "./fake_page.js";
import { cardOf, tickLabels } from "./insights_fixtures.js";

const USER_ZOOMS = ["fig_lb_user_zoom_top", "fig_lb_user_zoom_min"];

test("the hourly lines break where an hour is missing from their answers, and nowhere else", () => {
  const breaks = {};
  for (const figure of ["fig_lb_request_rate", "fig_lb_active_instances", "fig_lb_maxmean_tokens"]) {
    const { gap } = cardOf(figure).chart;
    const rows = shippedAnswer(`figures/${figure}`);
    breaks[figure] = brokenAtGaps(rows, gap).length - rows.length;
  }
  // Counted from the answers: the steps between neighbouring hours longer than an hour.
  assert.deepEqual(breaks, { fig_lb_request_rate: 0, fig_lb_active_instances: 3, fig_lb_maxmean_tokens: 18 });
});

test("the occupancy's window is ticked in hours elapsed, from 0 h to 24 h", () => {
  assert.deepEqual(tickLabels("fig_lb_concurrency", "x"), ["0 h", "6 h", "12 h", "18 h", "24 h"]);
});

test("the occupancy's tooltip writes a cell's minute in hours to a tenth, once where its two edges read alike", () => {
  const parameters = chartParameters(cardOf("fig_lb_concurrency"));
  const minute = shippedAnswer("figures/fig_lb_concurrency").find((cell) => cell.x_low === 832);
  assert.equal(cellTipText(minute, parameters).split("\n")[0], "Hours into the window: 13.9 h");
  const sixHours = { ...minute, x_low: 0, x_high: 360 };
  assert.equal(cellTipText(sixHours, parameters).split("\n")[0], "Hours into the window: 0.0 h–6.0 h");
});

test("a user zoom's request-share panel marks an even split over the instances of its answer", () => {
  for (const figure of USER_ZOOMS) {
    const card = cardOf(figure);
    const instances = shippedAnswer(`figures/${figure}`).filter((row) => row.panel === "request_share").length;
    const [requestShare, tokenHit] = card.panels.map((entry) => chartParameters(card, entry));
    assert.deepEqual(requestShare.reference, { value: 100 / instances, label: "even split" }, figure);
    assert.equal(tokenHit.reference, undefined, figure);
  }
});

test("the two user zooms have no legend: each of their panels holds one series, which its title names", () => {
  for (const figure of ["fig_lb_user_zoom_top", "fig_lb_user_zoom_min"]) {
    const card = cardOf(figure);
    const rows = shippedAnswer(`figures/${figure}`);
    assert.deepEqual(figureLegend(card, rows, cardColours(card, rows, null)).series, [], figure);
  }
  const routing = cardOf("fig_routing_tradeoff");
  const rows = shippedAnswer(`figures/${routing.figure}`);
  assert.equal(figureLegend(routing, rows, cardColours(routing, rows, null)).series.length, 4);
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
  const rows = shippedAnswer(`figures/${card.figure}`);
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
  useFakePage(context);
  const card = cardOf("fig_routing_tradeoff");
  const rows = shippedAnswer(`figures/${card.figure}`);
  const colours = cardColours(card, rows, null);
  const drawings = [];
  const drawChart = (hidden) => drawings.push(everyPanelsPoints(card, rows, colours, hidden));
  const body = renderFigure(new FakeElement("div"), card);
  await drawWithLegend(body, { ...figureLegend(card, rows, colours), swatch: "line" }, drawChart);
  const labels = legendPlace(body).children.map((button) => button.children[1]);
  assert.deepEqual(labels, ["Round-robin", "Load-first", "Cache-first", "Sticky"]);
  const button = legendPlace(body).children.find((entry) => entry.children.includes("Sticky"));
  button.dispatch("click");
  await settled();
  const [before, after] = drawings;
  const isSticky = (point) => point[SERIES_COLUMN].endsWith(", Sticky");
  assert.deepEqual(seriesOf(before.filter(isSticky)), ["DeepSeek V3.2, Sticky", "MiniMax M2.5, Sticky"]);
  assert.deepEqual(after, before.filter((point) => !isSticky(point)));
});
