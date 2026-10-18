// The A year of change topic's cards (`insights/evolution.js`) drawn from their shipped answers as the `landing-page`
// spec describes them: a bands card's key. It reads the card as its topic lists it and its answer as the page reads
// it.

import assert from "node:assert/strict";
import { test } from "node:test";

import { bandKey, bandsColour } from "../site/js/charts/bands.js";
import { hasLegend } from "../site/js/shared/legend.js";
import { cardColours, figureLegend } from "../site/js/insights/card_series.js";
import { chartParameters } from "../site/js/insights/figure_card.js";
import { SERIES_SLOTS } from "../site/js/theme/colours.js";
import { shippedAnswer, useFakePage } from "./fake_page.js";
import { cardOf } from "./insights_fixtures.js";

test("a bands card's key names its two bands and its median in the card's colour, with no legend of buttons", (context) => {
  useFakePage(context);
  const card = cardOf("fig_monthly_input_token_intervals");
  const rows = shippedAnswer(`figures/${card.figure}`);
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
