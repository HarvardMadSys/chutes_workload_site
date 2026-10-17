/**
 * The Traffic Explorer's three distribution cards, in a grid under its sliders: the input tokens, the output tokens and
 * the time to first token of the chosen requests, each a CDF per series of the bars in the bars' legend's colours,
 * over the trace weeks holding a chosen day (`traffic/traffic_distributions.js`), drawn by the lines kind with
 * `cdf: true`. Each is a figure of the card pattern (`renderFigure`), its title an `h4` under the bars' `h3`.
 *
 * The cards are drawn from `{ rows, covered, series, legend }`: the histogram rows of the choice, the days their weeks
 * span (`coveredDays`), the bars' kind of series (`choiceSeries` of `traffic/traffic_filter.js`) and the bars' legend.
 * A drawing gives back the cards drawn, `{ legend, labels, charts }`, which a press in the bars' legend draws again.
 */

import { nameChart, renderFigure, showError, showErrorNote, showLoading, showNote } from "../shared/charts.js";
import {
  dateSpanText, formatCount, formatCountTick, formatDurationTick, formatQuantity, formatSignificantSeconds,
  formatWholeCount,
} from "../shared/format.js";
import { extent, logAxisTicks } from "../axes/ticks.js";
import { drawLines } from "../charts/lines.js";
import { drawShownSeries, hasLegend } from "../explore/legend.js";
import { binTotals, cdfRows, metricBins, requestTotal } from "./traffic_distributions.js";

// The y axis of every card: the share of the chosen requests at or below a value, in percent.
const SHARE_OF_REQUESTS = Object.freeze({ label: "Share of requests" });

// A TTFT tick of at least a minute is written in seconds, "100 s": a power of ten of seconds is no whole count of
// minutes, which `formatDurationTick` would write with three decimals.
const SECONDS_PER_MINUTE = 60;

// The most ticks a card's x axis writes: a card is a third of the wide card, and six decades' labels would crowd it.
const MAX_CARD_TICKS = 4;

// placeholder: the note in place of a card's chart when the choice keeps no request that records its value, for the
// authors.
const NO_RECORDED_VALUE_NOTE = "None of the chosen requests records this value.";

/**
 * The three cards, in their order: the metric of the histogram rows each draws, its title, its definition, its x axis
 * (a log one) and what its tooltip names a value and how it writes it.
 */
export const DISTRIBUTION_CARDS = Object.freeze([
  Object.freeze({
    metric: "input_tokens",
    title: "Input tokens",
    // placeholder: the card's definition, for the authors.
    definition: "Of the chosen requests that record their input tokens, the share with at most this many, counted in "
      + "bins a quarter of a doubling wide over the trace weeks that hold a chosen day.",
    x: Object.freeze({ label: "Input tokens", log: true, tickFormat: formatCountTick }),
    valueLabel: "Input tokens",
    valueFormat: formatWholeCount,
  }),
  Object.freeze({
    metric: "output_tokens",
    title: "Output tokens",
    // placeholder: the card's definition, for the authors.
    definition: "Of the chosen requests that record their output tokens, the share with at most this many, counted in "
      + "bins a quarter of a doubling wide over the trace weeks that hold a chosen day.",
    x: Object.freeze({ label: "Output tokens", log: true, tickFormat: formatCountTick }),
    valueLabel: "Output tokens",
    valueFormat: formatWholeCount,
  }),
  Object.freeze({
    metric: "ttft",
    title: "Time to first token",
    // placeholder: the card's definition, for the authors.
    definition: "Of the chosen requests that record a time to first token, the share whose time to first token is at "
      + "most this many seconds, counted in bins a quarter of a doubling wide over the trace weeks that hold a chosen "
      + "day.",
    x: Object.freeze({ label: "Time to first token", log: true, tickFormat: formatTtftTick }),
    valueLabel: "TTFT",
    valueFormat: formatSignificantSeconds,
  }),
]);

/** A TTFT tick: as `formatDurationTick` writes it under a minute, "10 ms", "1 s"; in seconds from a minute, "100 s". */
export function formatTtftTick(seconds) {
  return seconds < SECONDS_PER_MINUTE ? formatDurationTick(seconds) : `${formatCount(seconds)} s`;
}

/**
 * The x axis of `card` (of `DISTRIBUTION_CARDS`) over its CDF rows `rows`: the card's, over the rows' values, so that
 * hiding a series leaves the axis as it is, ticked at the powers of ten in it, every second or more of them where
 * there are more than `MAX_CARD_TICKS` (`logAxisTicks`), or at Plot's own where it holds fewer than two.
 */
export function distributionAxis(card, rows) {
  const domain = extent(rows.map((row) => row.x));
  return { ...card.x, domain, ticks: logAxisTicks(domain, MAX_CARD_TICKS) };
}

/**
 * The cards' caption for `covered`, the days the trace weeks of the choice span (`coveredDays`): "Over April 11 –
 * June 29, 2025, the trace weeks holding a chosen day."
 */
export function distributionCaption(covered) {
  // placeholder: the cards' caption, for the authors.
  return `Over ${dateSpanText(covered.firstDay, covered.lastDay)}, the trace weeks holding a chosen day.`;
}

/** Fill `grid` with one place per card of `DISTRIBUTION_CARDS`, each loading, and return the places in that order. */
export function placeDistributionCards(grid) {
  const places = [];
  for (let index = 0; index < DISTRIBUTION_CARDS.length; index += 1) {
    const place = document.createElement("div");
    place.className = "distribution-card";
    places.push(place);
  }
  showCardsLoading(places);
  grid.replaceChildren(...places);
  return places;
}

/** Show the loading state in each of the cards' `places`. */
export function showCardsLoading(places) {
  for (const place of places) {
    showLoading(place);
  }
}

/** Show `error` in each of the cards' `places`, in place of its card; it is logged once, not once per card. */
export function showCardsError(places, error) {
  console.error(error);
  for (const place of places) {
    showErrorNote(place, error);
  }
}

/**
 * Draw the three cards into their `places` from `distributions`, `{ rows, covered, series, legend }`, the series of
 * `hidden` left out, and return the cards drawn, `{ legend, labels, charts }`, each chart `{ body, card, rows, x }`:
 * its place, its card of `DISTRIBUTION_CARDS`, its CDF rows and its x axis. Settles when every chart has drawn.
 */
export async function drawDistributionCards(places, { rows, covered, series, legend }, hidden) {
  const charts = [];
  for (const [index, card] of DISTRIBUTION_CARDS.entries()) {
    const requests = requestTotal(metricBins(rows, card.metric));
    const body = renderFigure(places[index], {
      title: card.title,
      caption: distributionCaption(covered),
      definition: card.definition,
      rows: formatQuantity(requests, "request", "requests"),
      heading: "h4",
    });
    const cdf = listedRows(cdfRows(binTotals(rows, series.column, card.metric, legend.colours)), legend);
    charts.push({ body, card, rows: cdf, x: cdf.length === 0 ? card.x : distributionAxis(card, cdf) });
  }
  const drawn = { legend, labels: series.labels ?? {}, charts };
  await drawDistributionCurves(drawn, hidden);
  return drawn;
}

/**
 * Draw the lines of `drawn`'s charts (as `drawDistributionCards` gives them) again, the series of `hidden` left out,
 * as the bars' legend hides them: each chart whose every series of the legend is hidden shows the legend's note, and a
 * chart that fails shows its error in its place. A legend of fewer than two series hides none.
 */
export async function drawDistributionCurves(drawn, hidden) {
  const hiddenHere = hasLegend(drawn.legend.series) ? hidden : new Set();
  const drawings = [];
  for (const chart of drawn.charts) {
    const drawing = drawShownSeries(chart.body, drawn.legend, hiddenHere, (hidden) => drawCurves(chart, drawn, hidden));
    // No one awaits a legend's press, so a chart that fails shows its error in its own place.
    drawings.push(drawing.catch((error) => showError(chart.body, error)));
  }
  await Promise.all(drawings);
}

// The CDF rows of `rows` whose series `legend` lists. A series with requests in the weeks but none on the bars' chosen
// days has no button in the bars' legend; it is left out, so that every line drawn can be hidden as the bars are.
function listedRows(rows, legend) {
  const listed = new Set(legend.series.map((entry) => entry.name));
  return rows.filter((row) => listed.has(row.series));
}

// Draw `chart`'s CDF rows, one line per series not in `hidden`, in `drawn`'s legend colours, and name the chart; a
// note where the choice keeps no request that records the card's value.
async function drawCurves(chart, drawn, hidden) {
  if (chart.rows.length === 0) {
    showNote(chart.body, NO_RECORDED_VALUE_NOTE);
    return;
  }
  const { card } = chart;
  await drawLines(chart.rows, chart.body, { series: drawn.legend.colours }, {
    x: chart.x,
    y: SHARE_OF_REQUESTS,
    cdf: true,
    labels: drawn.labels,
    valueLabel: card.valueLabel,
    valueFormat: card.valueFormat,
  }, hidden);
  nameChart(chart.body);
}
