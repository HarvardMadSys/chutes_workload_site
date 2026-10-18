// What the Insights' cards of more than one topic share, as the `landing-page` spec describes it: the colour of a
// count, which cards of the users' and the caching topics take, and the trace's day axis, which the workload topic's
// daily lines and the balancing topic's hourly lines take. A card of one topic is checked in its topic's file,
// insights_<topic>.test.js.

import assert from "node:assert/strict";
import { test } from "node:test";

import { COUNT_COLOUR } from "../site/js/insights/card_series.js";
import { TRACE_DAY_AXIS } from "../site/js/plot/trace_axes.js";
import { sequentialColour } from "../site/js/plot/frame.js";
import { shippedAnswer } from "./fake_page.js";
import { cardOf } from "./insights_fixtures.js";

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
  const hourly = shippedAnswer("figures/fig_lb_request_rate")[0];
  assert.match(TRACE_DAY_AXIS.tipFormat(hourly.x), /^Day 305 · Feb 10, 2026, \d\d:\d\d UTC$/);
});
