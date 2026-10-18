/**
 * The Traffic Explorer's bars: the chosen metric per day as stacked bars, by family while no family is chosen, by model
 * once one is and by endpoint group once a model is, a figure of the card pattern with its words for each metric, its
 * months written under the bars, and a legend that hides and shows a series (`shared/legend.js`). Its rows are those
 * `rowsInChoice` of `traffic/traffic_filter.js` keeps; a bar takes no click.
 */

import { chartWidth } from "../plot/frame.js";
import { nameChart, renderFigure, showNote } from "../shared/figure.js";
import { formatCount, formatCountTick, formatQuantity } from "../shared/format.js";
import { drawStackedBars, stackedBarsLegend } from "../charts/stacked_bars.js";
import { drawWithLegend } from "../shared/legend.js";
import { choiceBreakdown, dailyValues, periodDays } from "./traffic_filter.js";

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
  // placeholder: the token metrics' titles and value labels, for the authors.
  input_tokens: Object.freeze({ title: "Input tokens per day", valueLabel: "Input tokens", note: TOKENS_NOTE }),
  output_tokens: Object.freeze({ title: "Output tokens per day", valueLabel: "Output tokens", note: TOKENS_NOTE }),
});

// The caption after what the bars count, by the breakdown's `order`: what the bars are stacked by.
const CHART_CAPTIONS = Object.freeze({
  families: "each day, by model family: the models in no family as Other.",
  // placeholder: worded so that it holds for a family of fewer than eight models and no others, for the authors.
  models: "each day of the chosen family, by model: its most requested named models, and its other models where it "
    + "has any.",
  // placeholder: the choice may be the family's other models rather than one model, for the authors.
  endpoints: "each day of the chosen model, or of the family's other models, by endpoint group.",
});
// placeholder: the metric, the day range and the token sums, the stacking by model reworded as the models caption is,
// and the tiles' percentiles, for the authors.
const CHART_DEFINITION = "Requests, input tokens or output tokens, as the metric chooses, per calendar day of the "
  + "chosen family, model, endpoint group and days, stacked by family while no family is chosen, by model once one is "
  + "(up to eight of the family's most requested named models, and its other models where it has any), and by the "
  + "endpoint group they were sent to once a model is. Tokens are summed over the requests that record them. A model's "
  + "family is the artifact's, by its name. An average in the tiles divides by the requests that record its value. The "
  + "tiles' p50 and p90 are read from the distributions' bins, over the trace weeks that hold a chosen day.";

/**
 * The days of `days` (the range's, in order) whose month is written under bars `plotWidth` pixels wide: each that opens
 * a month, and the range's first day too when its day of the month is at most `LAST_NAMED_FIRST_DAY`, so a range that
 * starts in a month's first half names that month; and the range's first day alone when neither gives a tick, so a
 * short range late in a month still names its month. On a plot narrower than `NARROW_PLOT_WIDTH`, more than
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
  if (ticks.length === 0 && days.length > 0) {
    ticks.push(days[0]);
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
 * Draw the bars' figure into `place` for `bars`, `{ choice, family, chosen, requests, days, colourOrders }`: the
 * `chosen` rows of `choice`, of the answer of `family` (null for every family), `requests` in all, their metric per day
 * over the days of `days` (the trace's) in the choice's range, stacked by the choice's breakdown, each breakdown's
 * series coloured in the order of its rows of `colourOrders` (`{ families, models, endpoints }`), with its legend, or a
 * note when there are none. The legend starts from and tells `legendState` (`{ hidden, onToggle }`) as `drawWithLegend`
 * takes it. Returns the bars' `{ breakdown, legend }`: their breakdown and their legend, empty when there are no bars.
 */
export async function drawTrafficBars(place, { choice, family, chosen, requests, days, colourOrders }, legendState) {
  const breakdown = choiceBreakdown(choice, family?.name);
  const words = METRIC_WORDS[choice.metric];
  const body = renderFigure(place, {
    title: words.title,
    caption: `${words.valueLabel} ${CHART_CAPTIONS[breakdown.order]}${words.note}`,
    definition: CHART_DEFINITION,
    rows: formatQuantity(requests, "request", "requests"),
  });
  const colours = breakdown.colours(colourOrders[breakdown.order]);
  const daily = dailyValues(chosen, breakdown.column, choice.metric, colours);
  const legend = stackedBarsLegend(daily, colours, { seriesColumn: breakdown.column, labels: breakdown.labels });
  if (daily.length === 0) {
    showNote(body, NO_REQUESTS_NOTE);
    return { breakdown, legend };
  }
  const drawing = { days: periodDays(days, choice), breakdown, colours: legend.colours, words };
  await drawWithLegend(body, legend, (hidden) => drawDayBars(daily, body, drawing, hidden), "square", legendState);
  return { breakdown, legend };
}

// Draw the bars of the series not in `hidden`, one per day of `drawing.days`, the months written as `monthTicks`
// says, each segment's value named in its tooltip by `drawing.words`, and name the chart.
async function drawDayBars(daily, body, drawing, hidden) {
  await drawStackedBars(daily, body, { series: drawing.colours }, {
    xColumn: "day",
    seriesColumn: drawing.breakdown.column,
    valueColumn: "value",
    x: {
      domain: drawing.days,
      ticks: monthTicks(drawing.days, chartWidth(body)),
      tickFormat: dayMonth,
      tipFormat: String, // a bar's tooltip names its whole day, where its tick names only the month
      tickRotate: MONTH_LABEL_ANGLE,
    },
    y: { tickFormat: formatCountTick },
    valueLabel: drawing.words.valueLabel,
    valueFormat: formatCount,
    margins: DAILY_MARGINS,
    barInset: DAY_BAR_INSET,
    segmentInset: DAY_BAR_INSET,
    labels: drawing.breakdown.labels,
  }, hidden);
  nameChart(body);
}
