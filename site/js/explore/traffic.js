/**
 * The Traffic Explorer: a row of controls (a model drop-down, an endpoint drop-down, period buttons) over one wide card
 * of four tiles (requests, average input and output tokens, average TTFT with the share of the requests that record
 * it) and the chosen requests per day as stacked bars, by model while no model is chosen and by endpoint group once one
 * is, with a legend that hides and shows a series (`explore/legend.js`). A bar takes no click.
 *
 * Its rows come from the `explore/daily_rollup` answer alone, read once, its colours from the Overview's orders
 * (`context.orders`): a change filters the rows once (`explore/traffic_filter.js`, which defines the choice) and draws
 * the tiles and bars again. The controls keep the choice in the URL (`explore/traffic_controls.js`).
 */

import { readAnswer } from "../shared/answers.js";
import { chartWidth, distinct, nameChart, renderFigure, showError, showLoading, showNote } from "../shared/charts.js";
import {
  formatCompactCount, formatCount, formatCountTick, formatPercent, formatQuantity, formatSeconds, formatWholeCount,
  MISSING_TEXT,
} from "../shared/format.js";
import { drawStackedBars, stackedBarsLegend } from "../charts/stacked_bars.js";
import { drawWithLegend } from "./legend.js";
import { mountTrafficControls } from "./traffic_controls.js";
import {
  choiceSeries, dailyRequests, modelChoices, periodDays, rowsInChoice, trafficSummary,
} from "./traffic_filter.js";

// The answer the explorer draws from: one row per calendar day, model and endpoint group.
const ROLLUP_QUERY = "explore/daily_rollup";

// The bars' margins, in pixels, as the monthly trends': room on the left for a count tick ("600M"), below for a
// slanted month ("2025-04"), and little on the right, so the bars take the card's width.
const DAILY_MARGINS = Object.freeze({ marginLeft: 52, marginRight: 8, marginBottom: 60 });

// The angle of the month labels under the bars, in degrees, as the trends slant theirs.
const MONTH_LABEL_ANGLE = -45;

// A plot narrower than this, in pixels, writes every other month under the whole trace's bars: on a phone its twelve
// slanted labels would overlap. A quarter's three or four months fit at any width.
const NARROW_PLOT_WIDTH = 400;

// No gap between the bars: over the whole trace a day's bar is a pixel or two wide, and a gap would take all of it.
const DAY_BAR_INSET = 0;

// The characters of a day before its day of the month, "2025-07-" of "2025-07-01", and of its month, "2025-07".
const DAY_OF_MONTH_START = "YYYY-MM-".length;
const MONTH_LENGTH = "YYYY-MM".length;

// The note in place of the bars when the choice keeps no request.
const NO_REQUESTS_NOTE = "No requests in this choice.";

// The card's words; the caption names what the bars are stacked by, by the series' order key.
const CHART_TITLE = "Requests per day";
const CHART_CAPTIONS = Object.freeze({
  models: "Requests each day, by model: the eight the model mix names, and Other.",
  endpoints: "Requests each day of the chosen model, by endpoint group.",
});
const CHART_DEFINITION = "Requests per calendar day of the chosen model, endpoint group and period, stacked by model "
  + "(the eight models the model mix names, the rest as Other) while no model is chosen, and by the endpoint group "
  + "they were sent to once one is. An average in the tiles divides by the requests that record its value.";

/** Show the loading state in `container`, then draw the explorer into it from the daily rollup, or the error. */
export async function runTraffic(container, context) {
  showLoading(container);
  await drawExplorer(container, context).catch((error) => showError(container, error));
}

/**
 * The four tiles' text for `summary` (as `trafficSummary` gives it): `[{ label, value, note }]`, the requests written
 * as the stats strip writes them, an average with no value "—", and under the TTFT the share that records it, "49%
 * record it"; `note` is "" for a tile with none.
 */
export function tileTexts(summary) {
  const share = summary.ttftShare === null ? MISSING_TEXT : formatPercent(summary.ttftShare);
  return [
    { label: "Requests", value: formatCompactCount(summary.requests), note: "" },
    { label: "Avg input tokens", value: averageText(summary.inputAverage, formatWholeCount), note: "" },
    { label: "Avg output tokens", value: averageText(summary.outputAverage, formatWholeCount), note: "" },
    { label: "Avg TTFT", value: averageText(summary.ttftAverage, formatSeconds), note: `${share} record it` },
  ];
}

/** Fill `list`, a `<ul>`, with one tile per entry of `tileTexts(summary)`: its value, its label and its note. */
export function renderTiles(list, summary) {
  const tiles = [];
  for (const { label, value, note } of tileTexts(summary)) {
    const tile = document.createElement("li");
    tile.append(textElement("strong", "", value), textElement("span", "", label));
    if (note !== "") {
      tile.append(textElement("span", "tile-note", note));
    }
    tiles.push(tile);
  }
  list.replaceChildren(...tiles);
}

/**
 * The days of `days` (a period's, in order) whose month is written under bars `plotWidth` pixels wide: each that opens
 * a month, and for a quarter (`period` not "") its first day too, so a quarter that starts mid-month names its first
 * month. All does not, as on a phone the trace's first day would crowd the next month's label; and All on a plot
 * narrower than `NARROW_PLOT_WIDTH` keeps every other month, from the first.
 */
export function monthTicks(days, period, plotWidth) {
  const ticks = [];
  for (const [index, day] of days.entries()) {
    const opensMonth = day.slice(DAY_OF_MONTH_START) === "01";
    const opensQuarter = index === 0 && period !== "";
    if (opensMonth || opensQuarter) {
      ticks.push(day);
    }
  }
  if (period === "" && plotWidth < NARROW_PLOT_WIDTH) {
    return ticks.filter((tick, index) => index % 2 === 0);
  }
  return ticks;
}

/** A day's month as the bars' axis writes it: "2025-07-01" → "2025-07". */
export function dayMonth(day) {
  return day.slice(0, MONTH_LENGTH);
}

async function drawExplorer(container, context) {
  const rows = await readAnswer(ROLLUP_QUERY);
  const orders = { models: await context.orders.models, endpoints: await context.orders.endpoints };
  const view = {
    rows,
    orders,
    days: distinct(rows.map((row) => row.day)),
    tiles: document.createElement("ul"),
    figure: document.createElement("div"),
  };
  const controls = document.createElement("div");
  controls.className = "controls traffic-controls";
  container.replaceChildren(controls, explorerCard(view));
  const choice = mountTrafficControls(controls, modelChoices(rows), context, (chosen) => drawChange(view, chosen));
  await drawChoice(view, choice);
}

// The wide card: the tiles above the figure.
function explorerCard(view) {
  const card = document.createElement("article");
  card.className = "card traffic-card";
  view.tiles.className = "traffic-tiles";
  view.tiles.setAttribute("aria-label", "The chosen requests in numbers");
  card.append(view.tiles, view.figure);
  return card;
}

// Draw the tiles and the bars again for a new `choice`.
function drawChange(view, choice) {
  // No one awaits a change, so a failed drawing shows its error in the figure's place.
  drawChoice(view, choice).catch((error) => showError(view.figure, error));
}

// Filter the rows once for `choice`, then draw the tiles and the bars from what it keeps.
async function drawChoice(view, choice) {
  const chosen = rowsInChoice(view.rows, choice);
  const summary = trafficSummary(chosen);
  renderTiles(view.tiles, summary);
  await drawBars(view, choice, chosen, summary.requests);
}

// The figure of the `chosen` rows of `choice`, `requests` in all: their requests per day stacked by the choice's
// series, with its legend, or a note when there are none.
async function drawBars(view, choice, chosen, requests) {
  const series = choiceSeries(choice);
  const body = renderFigure(view.figure, {
    title: CHART_TITLE,
    caption: CHART_CAPTIONS[series.order],
    definition: CHART_DEFINITION,
    rows: formatQuantity(requests, "request", "requests"),
  });
  const colours = series.colours(view.orders[series.order]);
  const daily = dailyRequests(chosen, series.column, colours);
  if (daily.length === 0) {
    showNote(body, NO_REQUESTS_NOTE);
    return;
  }
  const legend = stackedBarsLegend(daily, colours, { seriesColumn: series.column, labels: series.labels });
  const days = periodDays(view.days, choice.period);
  const bars = { days, period: choice.period, series, colours: legend.colours };
  await drawWithLegend(body, legend, (hidden) => drawDayBars(daily, body, bars, hidden));
}

// Draw the bars of the series not in `hidden`, one per day of `bars.days`, the months written as `monthTicks` says, and
// name the chart.
async function drawDayBars(daily, body, bars, hidden) {
  await drawStackedBars(daily, body, { series: bars.colours }, {
    xColumn: "day",
    xLabel: null,
    xDomain: bars.days,
    xTicks: monthTicks(bars.days, bars.period, chartWidth(body)),
    xTickFormat: dayMonth,
    xTickRotate: MONTH_LABEL_ANGLE,
    seriesColumn: bars.series.column,
    valueColumn: "requests",
    valueLabel: "Requests",
    yLabel: null,
    valueFormat: formatCount,
    yTickFormat: formatCountTick,
    margins: DAILY_MARGINS,
    inset: DAY_BAR_INSET,
    labels: bars.series.labels,
  }, hidden);
  nameChart(body);
}

function averageText(average, format) {
  return average === null ? MISSING_TEXT : format(average);
}

// An element of `tagName` with the class `className` (none when "") holding `text`.
function textElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className !== "") {
    element.className = className;
  }
  element.textContent = text;
  return element;
}
