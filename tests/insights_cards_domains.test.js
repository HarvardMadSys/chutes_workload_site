// The Insights' fixed axes hold the shipped data: for every card and panel whose x or y axis has a numeric domain
// (`chartParameters` of `insights/figure_card.js`), the values its chart draws on that axis, from the figure's answer
// as `make data` wrote it, fall inside that domain, but for the clips the paper's axes intend, each with its reason.
// A rebuild that outgrows a domain fails here: the fix is a wider domain, with `make snapshots` and its diff reviewed,
// or a listed clip with its reason.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { chartParameters } from "../site/js/insights/figure_card.js";
import { TOPICS, topicCards } from "../site/js/page/topics.js";

// The columns each chart kind draws on each axis, as each kind's module of `js/charts/` names its rows' columns. An
// axis a kind does not list draws no number a domain bounds there, such as the boxes' and bars' axes of names. The
// stacked bars draw on y the sum of each bar's stack (`stackTotals`), not a column.
const AXIS_COLUMNS = Object.freeze({
  lines: Object.freeze({ x: ["x"], y: ["y"] }),
  cdf: Object.freeze({ x: ["x"], y: ["cdf"] }),
  bands: Object.freeze({ x: ["x"], y: ["p10", "p25", "p50", "p75", "p90"] }),
  cells: Object.freeze({ x: ["x_low", "x_high"], y: ["y_low", "y_high"] }),
  raster: Object.freeze({ x: ["x"], y: ["y"] }),
  scatter: Object.freeze({ x: ["x"], y: ["y"] }),
  boxes: Object.freeze({ y: ["low", "q1", "median", "q3", "high"] }),
  bars: Object.freeze({ y: ["value"] }),
  stacked_bars: Object.freeze({}),
});

// The domains the shipped data passes on purpose, by figure and axis, each with why the axis stops there.
const INTENDED_CLIPS = Object.freeze([
  Object.freeze({
    figure: "fig_token_length_input_cdf_by_model", axis: "x",
    reason: "the paper's axis stops at a million input tokens; the few longer inputs run off its right end",
  }),
  Object.freeze({
    figure: "fig_token_length_output_cdf_by_model", axis: "x",
    reason: "the paper's axis stops at 20,000 output tokens; the few longer outputs run off its right end",
  }),
  Object.freeze({
    figure: "fig_output_input_ratio_cdf_by_model", axis: "x",
    reason: "the paper's axis spans the ratios from 0.0005 to 100; the rarer ratios beyond run off its ends",
  }),
  Object.freeze({
    figure: "fig_latency_e2e_cdf_by_model", axis: "x",
    reason: "the paper's axis stops at 300 s; the few longer requests run off its right end",
  }),
  Object.freeze({
    figure: "fig_iat_monthly_per_user_band", axis: "y",
    reason: "the axis stops at IAT_CAP_SECONDS, so that a linear axis shows the median's move; the 90th percentile "
      + "is cut off where it passes it",
  }),
]);

/** The rows of a shipped answer, read from its file as the page reads it over HTTP. */
function shippedAnswer(figure) {
  return JSON.parse(readFileSync(new URL(`../site/data/all/figures/${figure}.json`, import.meta.url), "utf8"));
}

/**
 * Every chart of every card with a numeric domain on an axis: `{ card, entry, axis, parameters }`, `entry` the panel of
 * the card's `panels` the chart draws, or null for a card of one chart. A domain of anything but numbers, such as
 * categories, is left out.
 */
function chartsWithDomains() {
  const charts = [];
  for (const card of TOPICS.flatMap(topicCards)) {
    for (const entry of card.panels ?? [null]) {
      const parameters = chartParameters(card, entry);
      for (const axis of ["x", "y"]) {
        const domain = parameters[axis]?.domain;
        if (domain !== undefined && domain.every((end) => typeof end === "number")) {
          charts.push({ card, entry, axis, parameters });
        }
      }
    }
  }
  return charts;
}

/**
 * The rows of `rows` a chart of `card` with `parameters` draws: those of its panel, where it draws one, and of the
 * series it draws, the panel's `series` or else the card's, where either names them; the stacked bars draw every
 * series, folding the unnamed ones into "Other".
 */
function drawnRows(card, parameters, rows) {
  let drawn = rows;
  if (parameters.panel !== undefined) {
    drawn = drawn.filter((row) => row.panel === parameters.panel);
  }
  const series = parameters.series ?? card.series;
  if (series !== undefined && card.kind !== "stacked_bars") {
    drawn = drawn.filter((row) => series.includes(row.series));
  }
  return drawn;
}

/** The height of each stacked bar of `rows`: the sum of the values of its x, by the columns `parameters` names. */
function stackTotals(rows, parameters) {
  const totals = new Map();
  for (const row of rows) {
    const x = row[parameters.xColumn];
    totals.set(x, (totals.get(x) ?? 0) + row[parameters.valueColumn]);
  }
  return [...totals.values()];
}

/** The values a chart of `card` draws on `axis` from its `rows`, by `AXIS_COLUMNS`; a missing value left out. */
function axisValues(card, parameters, rows, axis) {
  if (card.kind === "stacked_bars" && axis === "y") {
    return stackTotals(rows, parameters);
  }
  const values = [];
  for (const row of rows) {
    for (const column of AXIS_COLUMNS[card.kind][axis] ?? []) {
      if (row[column] !== null && row[column] !== undefined) {
        values.push(row[column]);
      }
    }
  }
  return values;
}

/**
 * The value of `values` furthest outside `domain`, read in either order as its least and greatest ends, or null where
 * every value lies inside it. On a log axis a value at or below zero is left out, as the kinds leave it out.
 */
function valueOutside(values, domain, isLog) {
  const least = Math.min(...domain);
  const greatest = Math.max(...domain);
  let outside = null;
  let distance = 0;
  for (const value of values) {
    const beyond = Math.max(least - value, value - greatest);
    if (!(isLog && value <= 0) && beyond > distance) {
      outside = value;
      distance = beyond;
    }
  }
  return outside;
}

/** Each chart of `chartsWithDomains` whose shipped data passes its domain: `{ figure, axis, message }`. */
function clippedCharts() {
  const clipped = [];
  for (const { card, entry, axis, parameters } of chartsWithDomains()) {
    const rows = drawnRows(card, parameters, shippedAnswer(card.figure));
    const { domain, log } = parameters[axis];
    const value = valueOutside(axisValues(card, parameters, rows, axis), domain, log === true);
    if (value !== null) {
      const panel = entry === null ? "" : `, panel ${entry.panel} "${entry.title}"`;
      const message = `${card.figure}${panel}: the ${axis} axis's domain [${domain.join(", ")}] does not hold ${value}`;
      clipped.push({ figure: card.figure, axis, message });
    }
  }
  return clipped;
}

/** Whether `INTENDED_CLIPS` lists the axis `axis` of `figure`. */
function isIntended(figure, axis) {
  return INTENDED_CLIPS.some((clip) => clip.figure === figure && clip.axis === axis);
}

test("every fixed domain of a card or a panel holds the shipped data, but the intended clips", () => {
  const unintended = clippedCharts().filter((chart) => !isIntended(chart.figure, chart.axis));
  assert.deepEqual(unintended.map((chart) => chart.message), []);
});

test("each intended clip still clips the shipped data, and gives its reason", () => {
  const clipped = clippedCharts();
  for (const clip of INTENDED_CLIPS) {
    const isClipped = clipped.some((chart) => chart.figure === clip.figure && chart.axis === clip.axis);
    assert.ok(isClipped, `${clip.figure}: its ${clip.axis} axis holds the shipped data; the clip is no longer needed`);
    assert.ok(clip.reason.length > 0, clip.figure);
  }
});

test("the value furthest outside a domain in either order is found, none at or below zero on a log axis", () => {
  assert.equal(valueOutside([1, 5, 9], [0, 10], false), null);
  assert.equal(valueOutside([1, 12, 15], [10, 0], false), 15);
  assert.equal(valueOutside([-3, 0, 5], [1, 10], true), null);
  assert.equal(valueOutside([-3, 0, 5], [1, 10], false), -3);
});

test("a stacked bar's height is the sum of its stack", () => {
  const rows = [{ x: "a", value: 2 }, { x: "a", value: 3 }, { x: "b", value: 4 }];
  assert.deepEqual(stackTotals(rows, { xColumn: "x", valueColumn: "value" }), [5, 4]);
});
