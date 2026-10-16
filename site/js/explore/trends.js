/**
 * The monthly trends over the whole trace: requests per month stacked by model, tokens per month stacked by model, and
 * requests per month stacked by endpoint group. A bar is a trace month, a month counted from the trace's first day,
 * labelled by the calendar month that day falls in (`calendar_month`, "2025-04"); the last holds two days. Each chart
 * is a card of its own, laid out as the figure cards, drawn by the stacked-bars kind (`charts/stacked_bars.js`) as wide
 * as the card's body, with a legend of buttons that hide and show its series (`explore/legend.js`).
 *
 * The rows of each answer are one per trace month and series; a series takes its colour from its kind's order in
 * `context.orders`, as the donuts do, so a model has one colour in the donut and the trends.
 *
 * A section's `context` is what the page gives every section; see `explore/start.js`.
 */

import { columnTotal, nameChart, renderFigure, showError, showLoading } from "../shared/charts.js";
import { readAnswer } from "../shared/answers.js";
import { formatCompactCount, formatCount, formatCountTick } from "../shared/format.js";
import { ENDPOINT_SERIES, MODEL_SERIES } from "../shared/series.js";
import { drawStackedBars, stackedBarsLegend } from "../charts/stacked_bars.js";
import { drawWithLegend } from "./legend.js";

/** The column naming a row's bar: the calendar month its trace month starts in, "2025-04". */
export const MONTH_COLUMN = "calendar_month";

// A trend's margins, in pixels: room on the left for a count tick ("600M"), below for a slanted month ("2025-04"), and
// little on the right, so the bars take the card's width; the card's title names what the bars count, so the y axis
// has no title to keep room for.
const TREND_MARGINS = Object.freeze({ marginLeft: 52, marginRight: 8, marginBottom: 60 });

// The angle of a trend's month labels, in degrees: thirteen level labels ("2025-04") overrun one another in a card.
const MONTH_LABEL_ANGLE = -45;

/**
 * The three trends, in the page's order: each card's words, the query whose answer it stacks, the series it stacks by,
 * and its bars' height: the column holding it, what it is (`valueLabel`, in the tooltip), how a value is written
 * (`valueFormat`) and what the line of rows counts (`unit`).
 */
export const TRENDS = Object.freeze([
  Object.freeze({
    title: "Requests per month",
    caption: "Requests each month, by model; the last month holds two days.",
    definition: "Requests per month, stacked by model: the eight models the model mix names, and Other.",
    query: "explore/requests_by_month_model",
    series: MODEL_SERIES,
    valueColumn: "requests",
    valueLabel: "Requests",
    valueFormat: formatCount,
    unit: "requests",
  }),
  Object.freeze({
    title: "Tokens per month",
    caption: "Input and output tokens each month, by model; the last month holds two days.",
    definition: "Input and output tokens together per month, stacked by model: the eight models the model mix names, "
      + "and Other.",
    query: "explore/tokens_by_month_model",
    series: MODEL_SERIES,
    valueColumn: "tokens",
    valueLabel: "Tokens",
    valueFormat: formatCompactCount,
    unit: "tokens",
  }),
  Object.freeze({
    title: "Requests per month by endpoint",
    caption: "Requests each month, by endpoint group; the last month holds two days.",
    definition: "Requests per month, stacked by the endpoint they were sent to: chat or completion, streamed or not, "
      + "and Other.",
    query: "explore/requests_by_month_endpoint",
    series: ENDPOINT_SERIES,
    valueColumn: "requests",
    valueLabel: "Requests",
    valueFormat: formatCount,
    unit: "requests",
  }),
]);

/** Lay out the trends in `container` and draw them; a chart whose answer fails shows its error in its card. */
export async function runTrends(container, context) {
  container.replaceChildren();
  const drawings = [];
  for (const trend of TRENDS) {
    const place = document.createElement("article");
    place.className = "card";
    showLoading(place);
    container.append(place);
    drawings.push(drawTrend(place, trend, context).catch((error) => showError(place, error)));
  }
  await Promise.all(drawings);
}

/**
 * The legend of `trend` over `rows`, its answer's rows: `{ series, colours }`, the series of its kind's colours that
 * the rows hold, in the order of `orderRows` (the rows of its kind's colour order), the eight named ones first and
 * "Other" last, each labelled as its kind labels it.
 */
export function trendLegend(trend, rows, orderRows) {
  const { column, colours, labels } = trend.series;
  return stackedBarsLegend(rows, colours(orderRows), { seriesColumn: column, labels });
}

async function drawTrend(place, trend, context) {
  const orderRows = await context.orders[trend.series.order];
  const rows = await readAnswer(trend.query);
  const body = renderFigure(place, {
    title: trend.title,
    caption: trend.caption,
    definition: trend.definition,
    // A trend's total is never one, so its unit is always plural.
    rows: `${formatCount(columnTotal(rows, trend.valueColumn))} ${trend.unit}`,
  });
  const legend = trendLegend(trend, rows, orderRows);
  await drawWithLegend(body, legend, (hidden) => drawTrendBars(rows, body, trend, legend.colours, hidden));
}

// Draw a trend's bars of the series not in `hidden`, one per month, with no axis titles, since the card's title names
// what the bars count and the ticks are months, and name the chart.
async function drawTrendBars(rows, body, trend, colours, hidden) {
  await drawStackedBars(rows, body, { series: colours }, {
    xColumn: MONTH_COLUMN,
    xLabel: null,
    xTickRotate: MONTH_LABEL_ANGLE,
    seriesColumn: trend.series.column,
    valueColumn: trend.valueColumn,
    valueLabel: trend.valueLabel,
    yLabel: null,
    valueFormat: trend.valueFormat,
    yTickFormat: formatCountTick,
    margins: TREND_MARGINS,
    labels: trend.series.labels,
  }, hidden);
  nameChart(body);
}
