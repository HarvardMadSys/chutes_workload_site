/**
 * The monthly trends: requests per month stacked by model, over the whole trace. Each chart's legend is a row of
 * buttons that hide and show its series (`explore/legend.js`). Each chart is a card of its own, laid out as the figure
 * cards, and drawn by the stacked-bars kind (`charts/stacked_bars.js`).
 *
 * A section's `context` is what the page gives every section; see `explore/start.js`.
 */

import { columnTotal, nameChart, renderFigure, showError, showLoading } from "../shared/charts.js";
import { readAnswer } from "../shared/answers.js";
import { barColours } from "../theme/colours.js";
import { formatCount, formatCountTick, formatQuantity } from "../shared/format.js";
import { drawStackedBars, stackedBarsLegend } from "../charts/stacked_bars.js";
import { drawWithLegend } from "./legend.js";

// A trend's margins, in pixels: room on the left for a count tick ("150k") and little on the right, so the bars take the
// card's width; the card's title names what the bars count, so the y axis has no title to keep room for.
const TREND_MARGINS = Object.freeze({ marginLeft: 44, marginRight: 8 });

/** Lay out the trends in `container` and draw them; a chart whose query fails shows its error there. */
export async function runTrends(container, context) {
  const requests = document.createElement("article");
  requests.className = "card";
  showLoading(requests);
  container.replaceChildren(requests);
  await drawRequestsPerMonth(requests, context).catch((error) => showError(requests, error));
}

async function drawRequestsPerMonth(place, context) {
  const modelRows = await context.orders.models;
  const rows = await readAnswer("explore/requests_by_month_model");
  const body = renderFigure(place, {
    title: "Requests per month",
    caption: "Requests each month, by model.",
    definition: "Requests per month, stacked by model.",
    rows: formatQuantity(columnTotal(rows, "requests"), "request", "requests"),
  });
  // The models' order, which every chart colours them by: the eight with most requests take the series colours.
  const colours = barColours(modelRows.map((row) => row.model));
  await drawTrend(body, rows, {
    seriesColumn: "model",
    valueColumn: "requests",
    colours,
    labels: {},
    valueLabel: "Requests",
    valueFormat: formatCount,
  });
}

/**
 * Draw into `body` a trend's bars of `rows`, one stack per month, `trend` saying which column names the series
 * (`seriesColumn`) and which holds the height (`valueColumn`), the series' `colours` (a Map from name to colour, the
 * eight series colours first) and, where a series' name is not its label, `labels`, and how a value reads
 * (`valueLabel`, `valueFormat`). Above them goes the legend that hides and shows a series, in the order of `colours`.
 */
async function drawTrend(body, rows, trend) {
  const { seriesColumn, colours, labels } = trend;
  const legend = stackedBarsLegend(rows, colours, { seriesColumn, labels });
  await drawWithLegend(body, legend, (hidden) => drawTrendBars(rows, body, trend, hidden));
}

// Draw a trend's bars of the series not in `hidden`, with no y-axis title, since the card's title names what the bars
// count, and name the chart.
async function drawTrendBars(rows, body, trend, hidden) {
  await drawStackedBars(rows, body, { series: trend.colours }, {
    xColumn: "month",
    xLabel: null,
    seriesColumn: trend.seriesColumn,
    valueColumn: trend.valueColumn,
    valueLabel: trend.valueLabel,
    yLabel: null,
    valueFormat: trend.valueFormat,
    yTickFormat: formatCountTick,
    margins: TREND_MARGINS,
  }, hidden);
  nameChart(body);
}
