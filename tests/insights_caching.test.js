// The Prefix caching topic's cards (`insights/caching.js`) read as the paper's figures: the cache profiles' request
// axes, the per-user IAT band card's linear axis to 400 s, the TTL card's ticks at 1 ms and at the thresholds the paper
// quotes, its axis starting under 1 ms, and the eviction pair on one 0-to-1 axis with every algorithm in its tooltip.
// Each reads a card as its topic lists it and, where it needs one, its answer as the page reads it.

import assert from "node:assert/strict";
import { test } from "node:test";

import { allSeriesTips, drawnPoints } from "../site/js/charts/lines.js";
import { cardColours } from "../site/js/insights/card_series.js";
import { chartParameters } from "../site/js/insights/figure_card.js";
import { TOPICS } from "../site/js/page/topics.js";
import { shippedAnswer } from "./fake_page.js";
import { cardOf, tickLabels } from "./insights_fixtures.js";

const EVICTION_CARDS = ["fig_hit_ratio_minimax_m25", "fig_hit_ratio_deepseek_v32"];

test("the cache profiles' request axes run every second decade from their left edges", () => {
  assert.deepEqual(tickLabels("fig_model_nreq_vs_avg_hitratio_hexbin", "x"), ["100", "10k", "1M", "100M"]);
  assert.deepEqual(tickLabels("fig_user_nreq_vs_avg_hitratio_hexbin", "x"), ["10", "1k", "100k", "10M"]);
});

test("the per-user IAT band card's y axis is linear from 0 to 400 s, its median within it, its 90th past it late on", () => {
  const { y: yAxis } = chartParameters(cardOf("fig_iat_monthly_per_user_band"));
  assert.equal(yAxis.log, undefined);
  assert.deepEqual(yAxis.domain, [0, 400]);
  assert.equal(yAxis.label, "Inter-arrival time (s)");
  // The axis shows every month's median, and the 90th percentile, cut off at its top, passes it in some month.
  const rows = shippedAnswer("figures/fig_iat_monthly_per_user_band");
  assert.ok(rows.every((row) => row.p50 < yAxis.domain[1]));
  assert.ok(rows.some((row) => row.p90 > yAxis.domain[1]));
});

test("the TTL card's axis is ticked at 1 ms and at the paper's thresholds, 0.1 s, 10 s and 15 min, from under 1 ms", () => {
  assert.deepEqual(tickLabels("fig_iat_pair_ttl_coverage", "x"), ["1 ms", "0.1 s", "10 s", "15 min"]);
  // "1 ms" sits off the axis's left end, so it clears the y axis's lowest label, "0%".
  const { x: xAxis } = chartParameters(cardOf("fig_iat_pair_ttl_coverage"));
  assert.ok(xAxis.domain[0] < xAxis.ticks[0]);
});

test("the eviction pair, the caching topic's last group, shares its row on one hit-ratio axis from 0 to 1", () => {
  const groups = TOPICS.find((topic) => topic.id === "insights-caching").groups;
  assert.deepEqual(groups.at(-1).cards.map((card) => card.figure), EVICTION_CARDS);
  for (const figure of EVICTION_CARDS) {
    assert.equal(cardOf(figure).isWide, undefined, figure);
    assert.deepEqual(chartParameters(cardOf(figure)).y.domain, [0, 1], figure);
    assert.deepEqual(tickLabels(figure, "y"), ["0", "0.2", "0.4", "0.6", "0.8", "1"], figure);
  }
});

test("an eviction card's tooltip lists all seven algorithms at a cache size, LRU beside the LRB that covers it", () => {
  for (const figure of EVICTION_CARDS) {
    const card = cardOf(figure);
    const rows = shippedAnswer(`figures/${figure}`);
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
