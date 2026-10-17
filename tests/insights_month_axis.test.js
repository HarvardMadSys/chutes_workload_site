// The trace's month axis, which the monthly share, band and cohort cards share: its months named and the partial last
// starred, the star explained in the definition of every card on it, and its ends inset so that its first name clears
// the y axis's lowest label. Each reads a card as its topic lists it.

import assert from "node:assert/strict";
import { test } from "node:test";

import { axisScale } from "../site/js/axes/ticks.js";
import {
  chartParameters, PARTIAL_TRACE_MONTH, TRACE_MONTH_AXIS, TRACE_MONTH_NAMES, TRACE_MONTH_TICKS, traceMonthName,
} from "../site/js/insights/figure_card.js";
import { FIGURE_SECTIONS, topicCards } from "../site/js/explore/figure_sections.js";
import { TRACE_FIRST_DAY } from "../site/js/shared/format.js";

const TRACE_MONTHS = 13; // the trace's months, 1 to 13

// The cards whose x axis is the trace's months or the release cohorts, which share its names.
const MONTH_CARDS = [
  "fig_top10_model_monthly_request_share", "fig_top10_model_monthly_token_share", "fig_monthly_input_token_intervals",
  "fig_monthly_output_token_intervals", "fig_user_release_cohort_input_band", "fig_user_release_cohort_output_band",
  "fig_iat_monthly_per_user_band",
];

// Whether the x axis of `card` names the trace's months: a bands card's `x`, or a stacked-bars card's `xTickFormat`.
function isOnMonthAxis(card) {
  const parameters = chartParameters(card);
  return parameters.x?.tickFormat === traceMonthName || parameters.xTickFormat === traceMonthName;
}

// The pixels the x axis of `card` is inset by: its `x.inset`, or a stacked-bars card's `xInset`.
function xInset(card) {
  const parameters = chartParameters(card);
  return parameters.x?.inset ?? parameters.xInset;
}

// The cards on the trace's month axis, every topic's.
function monthCards() {
  return FIGURE_SECTIONS.flatMap(topicCards).filter(isOnMonthAxis);
}

test("the trace's month axis labels the first, the middle and the last month by name, the partial last starred", () => {
  assert.deepEqual(TRACE_MONTH_AXIS.ticks, TRACE_MONTH_TICKS);
  assert.deepEqual(TRACE_MONTH_TICKS.map(TRACE_MONTH_AXIS.tickFormat), ["Apr '25", "Oct '25", "Apr '26*"]);
  assert.equal(TRACE_MONTH_AXIS.label, "Month");
  assert.equal(TRACE_MONTH_TICKS.at(-1), TRACE_MONTHS);
  assert.equal(TRACE_MONTH_NAMES.length, TRACE_MONTHS);
  assert.equal(PARTIAL_TRACE_MONTH, TRACE_MONTHS);
  assert.equal(traceMonthName(12), "Mar '26");
  assert.ok(Object.isFrozen(TRACE_MONTH_AXIS) && Object.isFrozen(TRACE_MONTH_TICKS));
  assert.ok(Object.isFrozen(TRACE_MONTH_NAMES));
});

test("the trace's month names are the calendar months their first days fall in, counted from its first day", () => {
  // As `site_data/months.py` counts them: trace month m starts as many days after the trace's first day as the
  // m-th month of 1970 (1971 from the thirteenth) starts after 1970-01-01.
  const firstDay = Date.parse(`${TRACE_FIRST_DAY}T00:00:00Z`);
  const derived = [];
  for (let month = 1; month <= TRACE_MONTHS; month += 1) {
    const monthStart = Date.UTC(1970, month - 1, 1);
    const calendarDay = new Date(firstDay + monthStart);
    const name = calendarDay.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    const year = String(calendarDay.getUTCFullYear()).slice(-2);
    derived.push(`${name} '${year}`);
  }
  assert.deepEqual(TRACE_MONTH_NAMES, derived);
});

test("every card on the month or cohort axis says in its definition what the star of the partial last month means", () => {
  const cards = monthCards();
  assert.deepEqual(cards.map((card) => card.figure).sort(), [...MONTH_CARDS].sort());
  const starred = traceMonthName(PARTIAL_TRACE_MONTH);
  for (const card of cards) {
    assert.ok(card.definition.includes(` ${starred} `), `${card.figure}: its definition names ${starred}`);
    assert.ok(card.definition.endsWith(" the trace's last two days."), `${card.figure}: its definition says why`);
  }
});

test("the month axis is inset from the plot's edges on every card on it, the share bars' included", () => {
  assert.ok(TRACE_MONTH_AXIS.inset > 0);
  assert.equal(axisScale(TRACE_MONTH_AXIS, [1, TRACE_MONTHS]).inset, TRACE_MONTH_AXIS.inset);
  for (const card of monthCards()) {
    assert.equal(xInset(card), TRACE_MONTH_AXIS.inset, card.figure);
  }
});
