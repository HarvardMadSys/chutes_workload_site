// The workload at a glance topic's cards (`insights/workload.js`) drawn from their shipped answers as the
// `landing-page` spec describes them: the requests-per-day card's tooltip. It reads the card as its topic lists it and
// its answer as the page reads it.

import assert from "node:assert/strict";
import { test } from "node:test";

import { lineTipText } from "../site/js/charts/lines.js";
import { chartParameters } from "../site/js/insights/figure_card.js";
import { shippedAnswer } from "./fake_page.js";
import { cardOf } from "./insights_fixtures.js";

test("the requests-per-day card's tooltip at day 120 gives the day with its date and its requests", () => {
  const card = cardOf("fig_request_rate_day");
  const row = shippedAnswer(`figures/${card.figure}`).find((point) => point.x === 120);
  const [, day, requests] = lineTipText(row, chartParameters(card)).split("\n");
  assert.equal(day, "Day 120 · Aug 9, 2025");
  assert.match(requests, /^Requests: \d+(\.\d)?[kM]?$/);
});
