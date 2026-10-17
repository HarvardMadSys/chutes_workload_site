/**
 * The Traffic Explorer's bars: the chosen metric per day as stacked bars, by family while no family is chosen, by model
 * once one is and by endpoint group once a model is, a figure of the card pattern with its words for each metric, its
 * months written under the bars, and a legend that hides and shows a series (`explore/legend.js`). Its rows are those
 * `rowsInChoice` of `traffic/traffic_filter.js` keeps; a bar takes no click.
 */

import { chartWidth, nameChart, renderFigure, showNote } from "../shared/charts.js";
import { formatCount, formatCountTick, formatQuantity } from "../shared/format.js";
import { drawStackedBars, stackedBarsLegend } from "../charts/stacked_bars.js";
import { drawWithLegend } from "../explore/legend.js";
import { choiceSeries, dailyValues, periodDays } from "./traffic_filter.js";

// The bars' margins, in pixels: room on the left for a count tick ("600M"), below for a slanted month ("2025-04"),
// and little on the right, so the bars take the card's width.
const DAILY_MARGINS = Object.freeze({ marginLeft: 52, marginRight: 8, marginBottom: 60 });

// The angle of the month labels under the bars, in degrees, so that thirteen fit a card.
const MONTH_LABEL_ANGLE = -45;

// A plot narrower than this, in pixels, is a phone's: a long range's twelve slanted labels would overlap there.
const NARROW_PLOT_WIDTH = 400;

// On a narrow plot, more ticks than this are thinned to every other one. A quarter's three or four fit at any width.
const MAX_NARROW_TICKS = 7;

// A range's first day names its month when it falls in the month's first half; later, the next month's label would
// sit too close to it.
const LAST_NAMED_FIRST_DAY = "15";

// No gap between the bars: over the whole trace a day's bar is a pixel or two wide, and a gap would take all of it.
const DAY_BAR_INSET = 0;

// The characters of a day before its day of the month, "2025-07-" of "2025-07-01", and of its month, "2025-07".
const DAY_OF_MONTH_START = "YYYY-MM-".length;
const MONTH_LENGTH = "YYYY-MM".length;

// The note in place of the bars when the choice keeps no request.
const NO_REQUESTS_NOTE = "No requests in this choice.";

// placeholder: what a token metric's bars sum, closing its caption, for the authors.
const TOKENS_NOTE = " Tokens are summed over the requests that record them.";

/**
 * The bars' words for each metric of `METRICS` (`traffic/traffic_filter.js`), by its value in a choice: the chart's
 * title; what a bar counts, named in its tooltip ("Input tokens: 1,234") and opening the caption; and the caption's
 * closing note.
 */
export const METRIC_WORDS = Object.freeze({
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

/**
 * The days of `days` (the range's, in order) whose month is written under bars `plotWidth` pixels wide: each that opens
 * a month, and the range's first day too when its day of the month is at most `LAST_NAMED_FIRST_DAY`, so a range that
 * starts in a month's first half names that month. On a plot narrower than `NARROW_PLOT_WIDTH`, more than
 * `MAX_NARROW_TICKS` ticks are thinned to every other one, from the first.
 */
export function monthTicks(days, plotWidth) {
  const ticks = [];
  for (const [index, day] of days.entries()) {
    const opensMonth = day.slice(DAY_OF_MONTH_START) === "01";
    const opensRange = index === 0 && day.slice(DAY_OF_MONTH_START) <= LAST_NAMED_FIRST_DAY;
    if (opensMonth || opensRange) {
      ticks.push(day);
    }
  }
  if (plotWidth < NARROW_PLOT_WIDTH && ticks.length > MAX_NARROW_TICKS) {
    return ticks.filter((tick, index) => index % 2 === 0);
  }
  return ticks;
}

/** A day's month as the bars' axis writes it: "2025-07-01" → "2025-07". */
export function dayMonth(day) {
  return day.slice(0, MONTH_LENGTH);
}

/**
 * Draw the bars' figure into `place` for `bars`, `{ choice, family, chosen, requests, days, orders }`: the `chosen`
 * rows of `choice`, of the answer of `family` (null for every family), `requests` in all, their metric per day over the
 * days of `days` (the trace's) in the choice's range, stacked by the choice's series, each kind of series coloured in
 * the order of its rows of `orders` (`{ families, models, endpoints }`), with its legend, or a note when there are none.
 * The legend starts from and tells `shared` (`{ hidden, onToggle }`) as `drawWithLegend` takes it. Returns the bars'
 * `{ series, legend }`: their kind of series and their legend, empty when there are no bars.
 */
export async function drawBars(place, { choice, family, chosen, requests, days, orders }, shared) {
  const series = choiceSeries(choice, family?.name);
  const words = METRIC_WORDS[choice.metric];
  const body = renderFigure(place, {
    title: words.title,
    caption: `${words.valueLabel} ${CHART_CAPTIONS[series.order]}${words.note}`,
    definition: CHART_DEFINITION,
    rows: formatQuantity(requests, "request", "requests"),
  });
  const colours = series.colours(orders[series.order]);
  const daily = dailyValues(chosen, series.column, choice.metric, colours);
  const legend = stackedBarsLegend(daily, colours, { seriesColumn: series.column, labels: series.labels });
  if (daily.length === 0) {
    showNote(body, NO_REQUESTS_NOTE);
    return { series, legend };
  }
  const drawing = { days: periodDays(days, choice), series, colours: legend.colours, words };
  await drawWithLegend(body, legend, (hidden) => drawDayBars(daily, body, drawing, hidden), "square", shared);
  return { series, legend };
}

// Draw the bars of the series not in `hidden`, one per day of `bars.days`, the months written as `monthTicks` says,
// each segment's value named in its tooltip by `bars.words`, and name the chart.
async function drawDayBars(daily, body, bars, hidden) {
  await drawStackedBars(daily, body, { series: bars.colours }, {
    xColumn: "day",
    xLabel: null,
    xDomain: bars.days,
    xTicks: monthTicks(bars.days, chartWidth(body)),
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
