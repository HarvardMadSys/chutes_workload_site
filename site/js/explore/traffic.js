/**
 * The Traffic Explorer: a row of controls (a model drop-down, an endpoint drop-down, period buttons) over one wide card
 * of four tiles (requests, average input and output tokens, average TTFT with the share of the requests that record
 * it) and the chosen requests per day as stacked bars, by model while no model is chosen and by endpoint group once one
 * is, with a legend that hides and shows a series (`explore/legend.js`). A bar takes no click.
 *
 * It draws from the `explore/daily_rollup` answer alone, read once: a change filters its rows once
 * (`explore/traffic_filter.js`, which defines the choice) and draws the tiles and the bars again. The choice is read
 * from the URL when the page opens and written back on every change. `context` is the page's; see `explore/start.js`.
 */

import { readAnswer } from "../shared/answers.js";
import { distinct, nameChart, renderFigure, showError, showLoading, showNote } from "../shared/charts.js";
import {
  formatCompactCount, formatCount, formatCountTick, formatPercent, formatQuantity, formatSeconds, formatWholeCount,
  MISSING_TEXT,
} from "../shared/format.js";
import { drawStackedBars, stackedBarsLegend } from "../charts/stacked_bars.js";
import { drawWithLegend } from "./legend.js";
import {
  choiceSeries, dailyRequests, endpointChoices, modelChoices, PERIODS, periodDays, readTrafficChoice, rowsInChoice,
  trafficSummary, writeTrafficChoice,
} from "./traffic_filter.js";

// The answer the explorer draws from: one row per calendar day, model and endpoint group.
const ROLLUP_QUERY = "explore/daily_rollup";

// The bars' margins, in pixels, as the monthly trends': room on the left for a count tick ("600M"), below for a
// slanted month ("2025-04"), and little on the right, so the bars take the card's width.
const DAILY_MARGINS = Object.freeze({ marginLeft: 52, marginRight: 8, marginBottom: 60 });

// The angle of the month labels under the bars, in degrees, as the trends slant theirs.
const MONTH_LABEL_ANGLE = -45;

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

// The period field's name, which also names its group of buttons for a screen reader, and the id that ties the two.
const PERIOD_FIELD_NAME = "Period";
const PERIOD_NAME_ID = "traffic-period-name";

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
 * Fill `row` with the controls showing `choice`: the model drop-down of `modelEntries` (`modelChoices`' entries), the
 * endpoint drop-down and the period buttons, the chosen one pressed. A change calls `onChoose` with the part of the
 * choice it changes, `{ model }`, `{ endpoint }` or `{ period }`.
 */
export function renderControls(row, choice, modelEntries, onChoose) {
  const model = choiceSelect(modelEntries, choice.model);
  model.addEventListener("change", () => onChoose({ model: model.value }));
  const endpoint = choiceSelect(endpointChoices(), choice.endpoint);
  endpoint.addEventListener("change", () => onChoose({ endpoint: endpoint.value }));
  const period = periodField(choice, onChoose);
  row.replaceChildren(labelledField("Model", model), labelledField("Endpoint", endpoint), period);
}

/** The days of `days` whose month is written under the bars: each that opens a month, in order. */
export function monthTicks(days) {
  return days.filter((day) => day.slice(DAY_OF_MONTH_START) === "01");
}

/** A day's month as the bars' axis writes it: "2025-07-01" → "2025-07". */
export function dayMonth(day) {
  return day.slice(0, MONTH_LENGTH);
}

async function drawExplorer(container, context) {
  const rows = await readAnswer(ROLLUP_QUERY);
  const orders = { models: await context.orders.models, endpoints: await context.orders.endpoints };
  const modelEntries = modelChoices(rows);
  const params = new URLSearchParams(window.location.search);
  const view = {
    rows,
    orders,
    days: distinct(rows.map((row) => row.day)),
    choice: readTrafficChoice(params, modelEntries.map((entry) => entry.value)),
    tiles: document.createElement("ul"),
    figure: document.createElement("div"),
  };
  const controls = document.createElement("div");
  controls.className = "controls traffic-controls";
  renderControls(controls, view.choice, modelEntries, (part) => changeChoice(view, part, context));
  container.replaceChildren(controls, explorerCard(view));
  await drawChoice(view);
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

// Take `part` into the view's choice, write it to the URL, and draw the tiles and the bars again.
function changeChoice(view, part, context) {
  view.choice = { ...view.choice, ...part };
  context.replaceQuery(writeTrafficChoice(new URLSearchParams(window.location.search), view.choice));
  // No one awaits a change, so a failed drawing shows its error in the figure's place.
  drawChoice(view).catch((error) => showError(view.figure, error));
}

// Filter the rows once for the choice, then draw the tiles and the bars from what it keeps.
async function drawChoice(view) {
  const chosen = rowsInChoice(view.rows, view.choice);
  const summary = trafficSummary(chosen);
  renderTiles(view.tiles, summary);
  await drawBars(view, chosen, summary.requests);
}

// The figure of the `chosen` rows, `requests` in all: their requests per day stacked by the choice's series, with its
// legend, or a note when there are none.
async function drawBars(view, chosen, requests) {
  const series = choiceSeries(view.choice);
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
  const days = periodDays(view.days, view.choice.period);
  const bars = { days, series, colours: legend.colours };
  await drawWithLegend(body, legend, (hidden) => drawDayBars(daily, body, bars, hidden));
}

// Draw the bars of the series not in `hidden`, one per day of `bars.days`, the month written at each first of a month,
// and name the chart.
async function drawDayBars(daily, body, bars, hidden) {
  await drawStackedBars(daily, body, { series: bars.colours }, {
    xColumn: "day",
    xLabel: null,
    xDomain: bars.days,
    xTicks: monthTicks(bars.days),
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

// The period buttons under their name, one per period, the chosen one pressed; a press presses its button alone.
function periodField(choice, onChoose) {
  const field = textElement("div", "control-field period-field", "");
  const name = textElement("span", "control-field-name", PERIOD_FIELD_NAME);
  name.id = PERIOD_NAME_ID;
  const group = textElement("div", "period-buttons", "");
  group.setAttribute("role", "group");
  group.setAttribute("aria-labelledby", PERIOD_NAME_ID);
  const buttons = PERIODS.map((period) => textElement("button", "period-button", period.label));
  for (const [index, button] of buttons.entries()) {
    button.type = "button";
    button.setAttribute("aria-pressed", String(PERIODS[index].value === choice.period));
    button.addEventListener("click", () => choosePeriod(buttons, index, onChoose));
  }
  group.append(...buttons);
  field.append(name, group);
  return field;
}

// Press the period button at `index` of `buttons` alone, and choose its period.
function choosePeriod(buttons, index, onChoose) {
  for (const [other, button] of buttons.entries()) {
    button.setAttribute("aria-pressed", String(other === index));
  }
  onChoose({ period: PERIODS[index].value });
}

// `control` under its name in small capitals, as one field of the controls row.
function labelledField(name, control) {
  const field = textElement("label", "control-field", "");
  field.append(textElement("span", "control-field-name", name), control);
  return field;
}

// A drop-down of `entries`, `[{ value, text }]`, showing the one whose value is `current`.
function choiceSelect(entries, current) {
  const select = document.createElement("select");
  for (const entry of entries) {
    const option = textElement("option", "", entry.text);
    option.value = entry.value;
    select.append(option);
  }
  select.value = current;
  return select;
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
