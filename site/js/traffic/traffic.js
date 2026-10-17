/**
 * The Traffic Explorer: a row of controls (a family drop-down, a model drop-down, an endpoint drop-down, period
 * buttons) over one wide card of four tiles (requests, average input and output tokens, average TTFT with the share of
 * the requests that record it) and the chosen requests per day as stacked bars, by family while no family is chosen, by
 * model once one is and by endpoint group once a model is, with a legend that hides and shows a series
 * (`explore/legend.js`). A bar takes no click.
 *
 * Its rows come from the `explore/daily_by_family` answer, read once, and from a family's
 * `explore/daily_by_model/<family_slug>` answer, read the first time the family is chosen and kept for the visit. The
 * families take their colours in the order of their requests, a family's models in the order of theirs, and the
 * endpoint groups from the Overview's order (`context.orders`). A change filters the rows once
 * (`traffic/traffic_filter.js`, which defines the choice) and draws the tiles and bars again. The controls keep the
 * choice in the URL (`traffic/traffic_controls.js`).
 */

import { readAnswer } from "../shared/answers.js";
import { chartWidth, distinct, nameChart, renderFigure, showError, showLoading, showNote } from "../shared/charts.js";
import {
  formatCompactCount, formatCount, formatCountTick, formatPercent, formatQuantity, formatSeconds, formatWholeCount,
  MISSING_TEXT,
} from "../shared/format.js";
import { drawStackedBars, stackedBarsLegend } from "../charts/stacked_bars.js";
import { drawWithLegend } from "../explore/legend.js";
import { mountTrafficControls } from "./traffic_controls.js";
import {
  choiceSeries, dailyRequests, familyChoices, familyOrder, modelChoices, modelOrder, periodDays, rowsInChoice,
  trafficSummary,
} from "./traffic_filter.js";

// The answers the explorer draws from: one row per calendar day, family and endpoint group; and, per family, the
// folder of its rows per calendar day, model and endpoint group, each family's file named by its slug.
const FAMILY_QUERY = "explore/daily_by_family";
const FAMILY_MODELS_QUERY = "explore/daily_by_model";

// The bars' margins, in pixels: room on the left for a count tick ("600M"), below for a slanted month ("2025-04"),
// and little on the right, so the bars take the card's width.
const DAILY_MARGINS = Object.freeze({ marginLeft: 52, marginRight: 8, marginBottom: 60 });

// The angle of the month labels under the bars, in degrees, so that thirteen fit a card.
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
  families: "Requests each day, by model family: the models in no family as Other.",
  // placeholder: worded so that it holds for a family of fewer than eight models and no others, for the authors.
  models: "Requests each day of the chosen family, by model: its most requested named models, and its other models "
    + "where it has any.",
  // placeholder: the choice may be the family's other models rather than one model, for the authors.
  endpoints: "Requests each day of the chosen model, or of the family's other models, by endpoint group.",
});
// placeholder: the stacking by model reworded as the models caption is, for the authors.
const CHART_DEFINITION = "Requests per calendar day of the chosen family, model, endpoint group and period, stacked "
  + "by family while no family is chosen, by model once one is (up to eight of the family's most requested named "
  + "models, and its other models where it has any), and by the endpoint group they were sent to once a model is. A "
  + "model's family is the artifact's, by its name. An average in the tiles divides by the requests that record its "
  + "value.";

/** Show the loading state in `container`, then draw the explorer into it from the daily answers, or the error. */
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
  const familyRows = await readAnswer(FAMILY_QUERY);
  const view = {
    familyRows,
    families: familyOrder(familyRows),
    familyAnswers: new Map(), // each family's answer, by its slug, from the first time the family is chosen
    endpoints: await context.orders.endpoints,
    days: distinct(familyRows.map((row) => row.day)),
    tiles: document.createElement("ul"),
    figure: document.createElement("div"),
  };
  const controls = document.createElement("div");
  controls.className = "controls traffic-controls";
  // The controls are placed once they show the URL's choice: until its family's answer is read, the section loads.
  const choice = await mountTrafficControls(controls, familyChoices(view.families), context, {
    modelsOf: async (family) => (await familyAnswerShowingLoading(view, family)).models,
    onChange: (chosen) => drawChange(view, chosen),
    onError: (error) => showError(view.figure, error),
  });
  container.replaceChildren(controls, explorerCard(view));
  if (choice !== null) {
    await drawChoice(view, choice);
  }
}

// The answer of the family whose slug is `family`, as `familyAnswer` gives it, the chart showing the loading state
// while a family not read before is read.
function familyAnswerShowingLoading(view, family) {
  if (!view.familyAnswers.has(family)) {
    showLoading(view.figure);
  }
  return familyAnswer(view, family);
}

/**
 * The answer of the family whose slug is `family`: the promised `{ name, rows, models }`, its name, its rows of
 * `explore/daily_by_model` and its model drop-down's entries; read the first time it is asked for and kept.
 */
function familyAnswer(view, family) {
  if (!view.familyAnswers.has(family)) {
    const answer = readFamilyAnswer(view, family);
    // A failed read is not kept, so that choosing the family again reads it again.
    answer.catch(() => view.familyAnswers.delete(family));
    view.familyAnswers.set(family, answer);
  }
  return view.familyAnswers.get(family);
}

async function readFamilyAnswer(view, family) {
  const rows = await readAnswer(`${FAMILY_MODELS_QUERY}/${family}`);
  const name = view.families.find((entry) => entry.family_slug === family).family;
  return { name, rows, models: modelChoices(rows, name) };
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

// Filter the rows of the choice's answer once for `choice`, then draw the tiles and the bars from what it keeps.
async function drawChoice(view, choice) {
  const family = choice.family === "" ? null : await familyAnswer(view, choice.family);
  const chosen = rowsInChoice(family === null ? view.familyRows : family.rows, choice);
  const summary = trafficSummary(chosen);
  renderTiles(view.tiles, summary);
  await drawBars(view, { choice, family, chosen, requests: summary.requests });
}

// The figure of `drawn`, `{ choice, family, chosen, requests }`: the `chosen` rows of `choice`, of the answer of
// `family` (null for every family), `requests` in all, their requests per day stacked by the choice's series, with its
// legend, or a note when there are none.
async function drawBars(view, { choice, family, chosen, requests }) {
  const series = choiceSeries(choice, family?.name);
  const body = renderFigure(view.figure, {
    title: CHART_TITLE,
    caption: CHART_CAPTIONS[series.order],
    definition: CHART_DEFINITION,
    rows: formatQuantity(requests, "request", "requests"),
  });
  // The order each kind of series takes its colours in: the families', the family's models' and the Overview's.
  const orders = {
    families: view.families,
    models: family === null ? [] : modelOrder(family.rows),
    endpoints: view.endpoints,
  };
  const colours = series.colours(orders[series.order]);
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
    xTipFormat: String, // a bar's tooltip names its whole day, where its tick names only the month
    xTickRotate: MONTH_LABEL_ANGLE,
    seriesColumn: bars.series.column,
    valueColumn: "requests",
    valueLabel: "Requests",
    yLabel: null,
    valueFormat: formatCount,
    yTickFormat: formatCountTick,
    margins: DAILY_MARGINS,
    inset: DAY_BAR_INSET,
    segmentInset: DAY_BAR_INSET,
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
