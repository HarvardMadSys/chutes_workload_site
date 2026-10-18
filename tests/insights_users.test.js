// The Users and models topic's cards (`insights/users.js`) drawn from their shipped answers as the `landing-page` spec
// describes them: the Qwen3-Next-80B raster's rows, axes and pooling, and the periodic user's raster's row ticks and
// rules. Each reads a card as its topic lists it and its answer as the page reads it.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  pooledGrid, rasterColourDomain, rasterGrid, rasterYDomain, rowBoundaries, rowRules,
} from "../site/js/charts/raster.js";
import { titledFrame } from "../site/js/plot/frame.js";
import { FakeElement, shippedAnswer } from "./fake_page.js";
import { cardOf } from "./insights_fixtures.js";

const HOURS_IN_WINDOW = 31 * 24; // a raster's window: thirty-one days of hours

test("the Qwen3-Next-80B raster shades each user row's hours by requests, days on x, pooled past its pixels", () => {
  const card = cardOf("fig_model_raster_qwen3_next_80b");
  const rows = shippedAnswer(`figures/${card.figure}`);
  const grid = rasterGrid(rows);
  assert.equal(card.kind, "raster");
  assert.equal(grid.columnCount, HOURS_IN_WINDOW);
  assert.equal(grid.rowCount, Math.max(...rows.map((row) => row.y)) + 1);
  assert.equal(card.chart.valueLabel, "Requests per hour");
  assert.equal(card.chart.x.label, "Day of the window");
  assert.deepEqual(card.chart.x.ticks.map(card.chart.x.tickFormat), ["0", "6", "12", "18", "24", "30"]);
  // At a desktop card's 424 pixels, two hours share a pixel, and every hour with requests stays shaded.
  const pooled = pooledGrid(grid, 424, 160);
  assert.equal(pooled.columnStep, 2);
  const shaded = (values) => values.filter((value) => !Number.isNaN(value));
  assert.equal(Math.max(...shaded(pooled.values)), Math.max(...shaded(grid.values)));
  assert.deepEqual(rasterColourDomain(card.chart, rows), [1, 13851]);
});

test("the periodic user's raster ticks its model rows on their centres and parts them by rules", () => {
  const card = cardOf("fig_user_raster_periodic");
  const grid = rasterGrid(shippedAnswer(`figures/${card.figure}`));
  const [low, high] = rasterYDomain(grid.rowCount);
  assert.deepEqual([low, high], [-0.5, grid.rowCount - 0.5]);
  assert.equal(rowBoundaries(grid.rowCount).length, grid.rowCount - 1);
  assert.ok(rowBoundaries(grid.rowCount).every((boundary) => boundary > low && boundary < high));
  // At the card's own plot height its rows are tall enough to be parted: a rule at every boundary.
  const frame = titledFrame(new FakeElement("div"), card.chart.y.label, card.chart.margins, card.chart.height);
  const plotHeight = frame.height - frame.marginTop - frame.marginBottom;
  assert.deepEqual(rowRules({ ruleY: (values) => values }, grid.rowCount, plotHeight), rowBoundaries(grid.rowCount));
});
