/**
 * The charts in the Traffic Explorer's input tokens, output tokens and TTFT tiles: each the chosen requests'
 * distribution of the tile's value as a CDF per series of the bars, in the bars' legend's colours, over the trace weeks
 * holding a chosen day (`traffic/traffic_distributions.js`), drawn by the lines kind with `cdf: true` on a fixed log x
 * axis, with no title, caption or definition. `traffic/traffic_tiles.js` makes the charts' places in the tiles.
 *
 * The charts are drawn from `{ rows, series, legend }`: the histogram rows of the choice, the bars' kind of series
 * (`choiceSeries` of `traffic/traffic_filter.js`) and the bars' legend. A drawing gives back the charts drawn, `{
 * legend, labels, charts }`, which a press in the bars' legend draws again.
 */

import { nameChart, showError, showErrorNote, showLoading, showNote } from "../shared/charts.js";
import {
  formatCount, formatCountTick, formatDurationTick, formatSignificantSeconds, formatWholeCount,
} from "../shared/format.js";
import { drawLines } from "../charts/lines.js";
import { drawShownSeries, hasLegend } from "../explore/legend.js";
import { binTotals, cdfRows } from "./traffic_distributions.js";

// The y axis of every chart: the share of the chosen requests at or below a value, in percent, ticked at 0%, 50% and
// 100% only, as a tile's chart is too low for six labels to stand apart.
// placeholder: its label, for the authors.
const SHARE_OF_REQUESTS = Object.freeze({ label: "Share of requests", ticks: Object.freeze([0, 0.5, 1]) });

// A TTFT tick of at least a minute is written in seconds, "100 s": a power of ten of seconds is no whole count of
// minutes, which `formatDurationTick` would write with three decimals.
const SECONDS_PER_MINUTE = 60;

// A tile's chart's height in pixels: under its number and notes, it is lower than a figure card's chart.
const TILE_CHART_HEIGHT = 140;

// A tile's chart's side margins in pixels, in place of a figure card's: room for "100%" on the left and half of the
// last x tick's label on the right, so the plot keeps most of a tile's width.
const TILE_CHART_MARGINS = Object.freeze({ marginLeft: 52, marginRight: 20 });

// The x domains, the same for every choice, each with its ticks: evenly spaced decades, at most four so the labels do
// not crowd a tile's width, from the domain's start to its end so each axis names both its ends.
// Over the whole trace, at the bins' upper edges, 99.9% of the requests send at most 131,072 input tokens, and all at
// most 112,863,206;
const INPUT_TOKENS_DOMAIN = Object.freeze([1, 1_000_000]);
const INPUT_TOKENS_TICKS = Object.freeze([1, 100, 10_000, 1_000_000]);
// 99.9% are answered with at most 11,585 output tokens, and all with at most 8,388,608;
const OUTPUT_TOKENS_DOMAIN = Object.freeze([1, 100_000]);
const OUTPUT_TOKENS_TICKS = Object.freeze([1, 1_000, 100_000]);
// 0.1% have a TTFT of at most 0.088 s, 99.9% of at most 64 s, and all of at most 4,096 s.
const TTFT_DOMAIN = Object.freeze([0.01, 100]);
const TTFT_TICKS = Object.freeze([0.01, 1, 100]);

// placeholder: the note in place of a tile's chart when the choice keeps no request that records its value, for the
// authors.
const NO_RECORDED_VALUE_NOTE = "None of the chosen requests records this value.";

/**
 * The three charts, in the order of their tiles: the metric of the histogram rows each draws, its accessible name, its
 * x axis (a log one over its fixed domain, ticked at its listed ticks, the first the domain's start and the last its
 * end) and what its tooltip names a value and how it writes it.
 */
export const TILE_CHARTS = Object.freeze([
  Object.freeze({
    metric: "input_tokens",
    // placeholder: the chart's name for a screen reader, for the authors.
    name: "Input tokens distribution",
    x: logAxis("Input tokens", INPUT_TOKENS_DOMAIN, INPUT_TOKENS_TICKS, formatCountTick),
    // placeholder: the tooltip's name for the value, for the authors.
    valueLabel: "Input tokens",
    valueFormat: formatWholeCount,
  }),
  Object.freeze({
    metric: "output_tokens",
    // placeholder: the chart's name for a screen reader, for the authors.
    name: "Output tokens distribution",
    x: logAxis("Output tokens", OUTPUT_TOKENS_DOMAIN, OUTPUT_TOKENS_TICKS, formatCountTick),
    // placeholder: the tooltip's name for the value, for the authors.
    valueLabel: "Output tokens",
    valueFormat: formatWholeCount,
  }),
  Object.freeze({
    metric: "ttft",
    // placeholder: the chart's name for a screen reader, for the authors.
    name: "Time to first token distribution",
    x: logAxis("Time to first token", TTFT_DOMAIN, TTFT_TICKS, formatTtftTick),
    // placeholder: the tooltip's name for the value, for the authors.
    valueLabel: "TTFT",
    valueFormat: formatSignificantSeconds,
  }),
]);

/** A TTFT tick: as `formatDurationTick` writes it under a minute, "10 ms", "1 s"; in seconds from a minute, "100 s". */
export function formatTtftTick(seconds) {
  return seconds < SECONDS_PER_MINUTE ? formatDurationTick(seconds) : `${formatCount(seconds)} s`;
}

// The options of a chart's log x axis titled `label` over `domain`, ticked at `ticks`, each written by `tickFormat`.
function logAxis(label, domain, ticks, tickFormat) {
  return Object.freeze({ label, log: true, domain, ticks, tickFormat });
}

/** Show the loading state in each of the charts' `places`. */
export function showChartsLoading(places) {
  for (const place of places) {
    showLoading(place);
  }
}

/** Show `error` in each of the charts' `places`, in place of its chart; it is logged once, not once per chart. */
export function showChartsError(places, error) {
  console.error(error);
  for (const place of places) {
    showErrorNote(place, error);
  }
}

/**
 * Draw the three charts into their `places` from `distributions`, `{ rows, series, legend }`, the series of `hidden`
 * left out, and return the charts drawn, `{ legend, labels, charts }`, each chart `{ body, tileChart, rows }`: its
 * place, its entry of `TILE_CHARTS` and its CDF rows. The rows beyond the x domain's ends are kept: the line is cut at
 * the chart's edge rather than ended before it. Settles when every chart has drawn.
 */
export async function drawTileCharts(places, { rows, series, legend }, hidden) {
  const charts = [];
  for (const [index, tileChart] of TILE_CHARTS.entries()) {
    const totals = binTotals(rows, series.column, tileChart.metric, legend.colours);
    charts.push({ body: places[index], tileChart, rows: listedRows(cdfRows(totals), legend) });
  }
  const drawn = { legend, labels: series.labels ?? {}, charts };
  await drawTileCurves(drawn, hidden);
  return drawn;
}

/**
 * Draw the lines of `drawn`'s charts (as `drawTileCharts` gives them) again, the series of `hidden` left out, as the
 * bars' legend hides them: each chart whose every series of the legend is hidden shows the legend's note, and a chart
 * that fails shows its error in its place. A legend of fewer than two series hides none.
 */
export async function drawTileCurves(drawn, hidden) {
  const hiddenHere = hasLegend(drawn.legend.series) ? hidden : new Set();
  const drawings = [];
  for (const chart of drawn.charts) {
    const drawing = drawShownSeries(chart.body, drawn.legend, hiddenHere,
      (shownHidden) => drawCurves(chart, drawn, shownHidden));
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
// note where the choice keeps no request that records the tile's value.
async function drawCurves(chart, drawn, hidden) {
  const shownRows = chart.rows.filter((row) => !hidden.has(row.series));
  if (shownRows.length === 0) {
    showNote(chart.body, NO_RECORDED_VALUE_NOTE);
    return;
  }
  const { tileChart } = chart;
  await drawLines(chart.rows, chart.body, { series: drawn.legend.colours }, {
    x: tileChart.x,
    y: SHARE_OF_REQUESTS,
    cdf: true,
    height: TILE_CHART_HEIGHT,
    margins: TILE_CHART_MARGINS,
    labels: drawn.labels,
    valueLabel: tileChart.valueLabel,
    valueFormat: tileChart.valueFormat,
  }, hidden);
  nameChart(chart.body, tileChart.name);
}
