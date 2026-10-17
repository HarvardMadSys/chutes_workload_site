/**
 * The Traffic Explorer: a row of controls (a family drop-down, a model drop-down, an endpoint drop-down, a metric
 * drop-down, period buttons) over one wide card of four tiles (`traffic/traffic_tiles.js`), the chosen metric per day
 * as stacked bars, by family while no family is chosen, by model once one is and by endpoint group once a model is,
 * with a legend that hides and shows a series (`explore/legend.js`), and under the bars the From and To sliders of the
 * day range (`traffic/traffic_range.js`). A bar takes no click.
 *
 * Its rows come from the `explore/daily_by_family` answer, read once, and from a family's
 * `explore/daily_by_model/<family_slug>` answer, read the first time the family is chosen and kept for the visit. The
 * families take their colours in the order of their requests, a family's models in the order of theirs, and the
 * endpoint groups from the Overview's order (`context.orders`). A change filters the rows once
 * (`traffic/traffic_filter.js`, which defines the choice) and draws the tiles and bars again; so does a slider as it
 * moves. The controls keep the choice in the URL (`traffic/traffic_controls.js`), the sliders' range once released.
 */

import { readAnswer } from "../shared/answers.js";
import { chartWidth, distinct, nameChart, renderFigure, showError, showLoading, showNote } from "../shared/charts.js";
import { formatCount, formatCountTick, formatQuantity } from "../shared/format.js";
import { drawStackedBars, stackedBarsLegend } from "../charts/stacked_bars.js";
import { drawWithLegend } from "../explore/legend.js";
import { mountTrafficControls } from "./traffic_controls.js";
import {
  choiceSeries, dailyValues, familyChoices, familyOrder, modelChoices, modelOrder, periodDays, rowsInChoice,
  trafficSummary,
} from "./traffic_filter.js";
import { mountRange } from "./traffic_range.js";
import { renderTiles } from "./traffic_tiles.js";

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

// placeholder: what a token metric's bars sum, closing its caption, for the authors.
const TOKENS_NOTE = " Tokens are summed over the requests that record them.";

// The bars' words for each metric, by its value in a choice: the chart's title; what a bar counts, named in its
// tooltip ("Input tokens: 1,234") and opening the caption; and the caption's closing note.
const METRIC_WORDS = Object.freeze({
  "": Object.freeze({ title: "Requests per day", valueLabel: "Requests", note: "" }),
  input_tokens: Object.freeze({ title: "Input tokens per day", valueLabel: "Input tokens", note: TOKENS_NOTE }),
  output_tokens: Object.freeze({ title: "Output tokens per day", valueLabel: "Output tokens", note: TOKENS_NOTE }),
});

// The caption after what the bars count, by the series' order key: what the bars are stacked by.
const CHART_CAPTIONS = Object.freeze({
  families: "each day, by model family: the models in no family as Other.",
  // placeholder: worded so that it holds for a family of fewer than eight models and no others, for the authors.
  models: "each day of the chosen family, by model: its most requested named models, and its other models where it "
    + "has any.",
  // placeholder: the choice may be the family's other models rather than one model, for the authors.
  endpoints: "each day of the chosen model, or of the family's other models, by endpoint group.",
});
// placeholder: the metric, the day range and the token sums, and the stacking by model reworded as the models caption
// is, for the authors.
const CHART_DEFINITION = "Requests, input tokens or output tokens, as the metric chooses, per calendar day of the "
  + "chosen family, model, endpoint group and days, stacked by family while no family is chosen, by model once one is "
  + "(up to eight of the family's most requested named models, and its other models where it has any), and by the "
  + "endpoint group they were sent to once a model is. Tokens are summed over the requests that record them. A model's "
  + "family is the artifact's, by its name. An average in the tiles divides by the requests that record its value.";

/** Show the loading state in `container`, then draw the explorer into it from the daily answers, or the error. */
export async function runTraffic(container, context) {
  showLoading(container);
  await drawExplorer(container, context).catch((error) => showError(container, error));
}

/**
 * The days of `days` (the range's, in order) whose month is written under bars `plotWidth` pixels wide: each that opens
 * a month, and for a range that is not the whole trace (`isWholeTrace` false) its first day too, so a range that starts
 * mid-month names its first day's month. The whole trace does not, as on a phone the trace's first day would crowd the
 * next month's label; and the whole trace on a plot narrower than `NARROW_PLOT_WIDTH` keeps every other month, from
 * the first.
 */
export function monthTicks(days, isWholeTrace, plotWidth) {
  const ticks = [];
  for (const [index, day] of days.entries()) {
    const opensMonth = day.slice(DAY_OF_MONTH_START) === "01";
    const opensRange = index === 0 && !isWholeTrace;
    if (opensMonth || opensRange) {
      ticks.push(day);
    }
  }
  if (isWholeTrace && plotWidth < NARROW_PLOT_WIDTH) {
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
    rangeRow: document.createElement("div"),
    sliders: null, // the sliders' `{ show }`, once placed
    choice: null, // the choice drawn last, which a slider's range joins as it moves
  };
  const row = document.createElement("div");
  row.className = "controls traffic-controls";
  // The controls are placed once they show the URL's choice: until its family's answer is read, the section loads.
  const entries = { families: familyChoices(view.families), days: view.days };
  const controls = await mountTrafficControls(row, entries, context, {
    modelsOf: async (family) => (await familyAnswerShowingLoading(view, family)).models,
    onChange: (chosen) => showChoice(view, chosen),
    onError: (error) => showError(view.figure, error),
  });
  view.choice = controls.choice;
  view.sliders = mountRange(view.rangeRow, view.days, controls.choice, {
    onInput: (range) => drawChange(view, { ...view.choice, ...range }),
    onChange: controls.chooseRange,
  });
  container.replaceChildren(row, explorerCard(view));
  if (controls.error !== null) {
    showError(view.figure, controls.error);
    return;
  }
  await drawChoice(view, controls.choice);
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

// The wide card: the tiles above the figure, and the sliders under it.
function explorerCard(view) {
  const card = document.createElement("article");
  card.className = "card traffic-card";
  view.tiles.className = "traffic-tiles";
  view.tiles.setAttribute("aria-label", "The chosen requests in numbers");
  view.rangeRow.className = "traffic-range";
  card.append(view.tiles, view.figure, view.rangeRow);
  return card;
}

// The controls chose `choice`: stand the sliders on its range and draw it.
function showChoice(view, choice) {
  view.sliders.show(choice);
  drawChange(view, choice);
}

// Draw the tiles and the bars again for a new `choice`.
function drawChange(view, choice) {
  // No one awaits a change, so a failed drawing shows its error in the figure's place.
  drawChoice(view, choice).catch((error) => showError(view.figure, error));
}

// Filter the rows of the choice's answer once for `choice`, then draw the tiles and the bars from what it keeps.
async function drawChoice(view, choice) {
  view.choice = choice;
  const family = choice.family === "" ? null : await familyAnswer(view, choice.family);
  const chosen = rowsInChoice(family === null ? view.familyRows : family.rows, choice);
  const summary = trafficSummary(chosen);
  renderTiles(view.tiles, summary);
  await drawBars(view, { choice, family, chosen, requests: summary.requests });
}

// The figure of `drawn`, `{ choice, family, chosen, requests }`: the `chosen` rows of `choice`, of the answer of
// `family` (null for every family), `requests` in all, their metric per day stacked by the choice's series, with its
// legend, or a note when there are none.
async function drawBars(view, { choice, family, chosen, requests }) {
  const series = choiceSeries(choice, family?.name);
  const words = METRIC_WORDS[choice.metric];
  const body = renderFigure(view.figure, {
    title: words.title,
    caption: `${words.valueLabel} ${CHART_CAPTIONS[series.order]}${words.note}`,
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
  const daily = dailyValues(chosen, series.column, choice.metric, colours);
  if (daily.length === 0) {
    showNote(body, NO_REQUESTS_NOTE);
    return;
  }
  const legend = stackedBarsLegend(daily, colours, { seriesColumn: series.column, labels: series.labels });
  const isWholeTrace = choice.from === "" && choice.to === "";
  const bars = { days: periodDays(view.days, choice), isWholeTrace, series, colours: legend.colours, words };
  await drawWithLegend(body, legend, (hidden) => drawDayBars(daily, body, bars, hidden));
}

// Draw the bars of the series not in `hidden`, one per day of `bars.days`, the months written as `monthTicks` says,
// each segment's value named in its tooltip by `bars.words`, and name the chart.
async function drawDayBars(daily, body, bars, hidden) {
  await drawStackedBars(daily, body, { series: bars.colours }, {
    xColumn: "day",
    xLabel: null,
    xDomain: bars.days,
    xTicks: monthTicks(bars.days, bars.isWholeTrace, chartWidth(body)),
    xTickFormat: dayMonth,
    xTipFormat: String, // a bar's tooltip names its whole day, where its tick names only the month
    xTickRotate: MONTH_LABEL_ANGLE,
    seriesColumn: bars.series.column,
    valueColumn: "value",
    valueLabel: bars.words.valueLabel,
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
