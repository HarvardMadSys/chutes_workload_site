// The Prefix caching and Load balancing topics' cards read as the paper's figures: the TTL card's ticks at 1 ms and
// at the thresholds the paper quotes, its axis starting under 1 ms, the eviction pair on one 0-to-1 axis with every
// algorithm in its tooltip, the cache profiles' request axes, the occupancy's hours on its ticks and in its tooltip,
// and the user zooms' even split. Each reads a card as its topic lists it and, where it needs one, its answer as the
// page reads it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { axisTicks } from "../site/js/axes/ticks.js";
import { cellTipText } from "../site/js/charts/cells.js";
import { allSeriesTips, drawnPoints } from "../site/js/charts/lines.js";
import { cardColours } from "../site/js/insights/card_series.js";
import { chartParameters } from "../site/js/insights/figure_card.js";
import { FIGURE_SECTIONS } from "../site/js/insights/figure_sections.js";

const EVICTION_CARDS = ["fig_hit_ratio_minimax_m25", "fig_hit_ratio_deepseek_v32"];
const USER_ZOOMS = ["fig_lb_user_zoom_top", "fig_lb_user_zoom_min"];

// The card that draws `figure`, as its topic lists it.
function cardOf(figure) {
  return FIGURE_SECTIONS.flatMap((topic) => topic.cards).find((card) => card.figure === figure);
}

// A shipped answer's rows, read from its file as the page reads it over HTTP.
function shippedAnswer(figure) {
  return JSON.parse(readFileSync(new URL(`../site/data/all/figures/${figure}.json`, import.meta.url), "utf8"));
}

// The tick labels of the axis `axis` ("x" or "y") of the chart of `figure`, as the axis writes them.
function tickLabels(figure, axis) {
  const options = chartParameters(cardOf(figure))[axis];
  return axisTicks(options, []).map(options.tickFormat);
}

test("the TTL card's axis is ticked at 1 ms and at the paper's thresholds, 0.1 s, 10 s and 15 min, from under 1 ms", () => {
  assert.deepEqual(tickLabels("fig_iat_pair_ttl_coverage", "x"), ["1 ms", "0.1 s", "10 s", "15 min"]);
  // "1 ms" sits off the axis's left end, so it clears the y axis's lowest label, "0%".
  const { x: xAxis } = chartParameters(cardOf("fig_iat_pair_ttl_coverage"));
  assert.ok(xAxis.domain[0] < xAxis.ticks[0]);
});

test("the eviction pair shares a row after the wide TTL card, on one hit-ratio axis from 0 to 1", () => {
  const cards = FIGURE_SECTIONS.find((topic) => topic.selector === "#insights-caching").cards;
  assert.deepEqual(cards.slice(-3).map((card) => card.figure), ["fig_iat_pair_ttl_coverage", ...EVICTION_CARDS]);
  assert.equal(cards.at(-3).isWide, true);
  for (const figure of EVICTION_CARDS) {
    assert.equal(cardOf(figure).isWide, undefined, figure);
    assert.deepEqual(chartParameters(cardOf(figure)).y.domain, [0, 1], figure);
    assert.deepEqual(tickLabels(figure, "y"), ["0", "0.2", "0.4", "0.6", "0.8", "1"], figure);
  }
});

test("an eviction card's tooltip lists all seven algorithms at a cache size, LRU beside the LRB that covers it", () => {
  for (const figure of EVICTION_CARDS) {
    const card = cardOf(figure);
    const rows = shippedAnswer(figure);
    const parameters = chartParameters(card);
    const tips = allSeriesTips(drawnPoints(rows, cardColours(card, rows, null), parameters, new Set()), parameters);
    // A tip at each cache size of the answer, so the loop below cannot pass on no tips at all.
    assert.equal(tips.length, new Set(rows.map((row) => row.x)).size, figure);
    assert.ok(tips.length > 0, figure);
    for (const tip of tips) {
      const lines = tip.text.split("\n");
      assert.match(lines[0], /^Cache size \(tokens\): /);
      assert.equal(lines.length, 1 + card.series.length, figure);
    }
  }
});

test("the cache profiles' request axes run every second decade from their left edges", () => {
  assert.deepEqual(tickLabels("fig_model_nreq_vs_avg_hitratio_hexbin", "x"), ["100", "10k", "1M", "100M"]);
  assert.deepEqual(tickLabels("fig_user_nreq_vs_avg_hitratio_hexbin", "x"), ["10", "1k", "100k", "10M"]);
});

test("the occupancy's window is ticked in hours elapsed, from 0 h to 24 h", () => {
  assert.deepEqual(tickLabels("fig_lb_concurrency", "x"), ["0 h", "6 h", "12 h", "18 h", "24 h"]);
});

test("the occupancy's tooltip writes a cell's minute in hours to a tenth, once where its two edges read alike", () => {
  const parameters = chartParameters(cardOf("fig_lb_concurrency"));
  const minute = shippedAnswer("fig_lb_concurrency").find((cell) => cell.x_low === 832);
  assert.equal(cellTipText(minute, parameters).split("\n")[0], "Hours into the window: 13.9 h");
  const sixHours = { ...minute, x_low: 0, x_high: 360 };
  assert.equal(cellTipText(sixHours, parameters).split("\n")[0], "Hours into the window: 0.0 h–6.0 h");
});

test("a user zoom's request-share panel marks an even split over the instances of its answer", () => {
  for (const figure of USER_ZOOMS) {
    const card = cardOf(figure);
    const instances = shippedAnswer(figure).filter((row) => row.panel === "request_share").length;
    const [requestShare, tokenHit] = card.panels.map((entry) => chartParameters(card, entry));
    assert.deepEqual(requestShare.reference, { value: 100 / instances, label: "even split" }, figure);
    assert.equal(tokenHit.reference, undefined, figure);
  }
});
