/**
 * The Traffic Explorer's four tiles above its chart: the chosen requests, their average input and output tokens and
 * their average TTFT with the share of them that record it, and under each average its p50 and p90 once the
 * distributions have arrived. They take a summary as `trafficSummary` of `traffic/traffic_filter.js` gives it,
 * `{ requests, inputAverage, outputAverage, ttftAverage, ttftShare }`, and percentiles as `choicePercentiles` of
 * `traffic/traffic_distributions.js` gives them, and do not change with the metric the bars stack. Each tile is a
 * `<li>` holding its text, and the three averages' tiles under it the place of their value's distribution chart,
 * which `traffic/traffic_tile_charts.js` draws into; the texts are written without touching the charts.
 */

import { showLoading, textElement } from "../shared/charts.js";
import {
  formatCompactCount, formatPercent, formatSeconds, formatSignificant, formatSignificantSeconds, formatWholeCount,
  MISSING_TEXT,
} from "../shared/format.js";
import { percentileText } from "./traffic_distributions.js";

/** The tiles' percentiles where there are none to show, as after a failed read: no note under any average. */
export const NO_PERCENTILES = Object.freeze({ input: null, output: null, ttft: null });

// The note under an average while its percentiles have not arrived.
const PERCENTILES_LOADING_NOTE = "…";

// The tiles in the order of `tileTexts`, each by its `data-tile` name, and whether it holds a chart of its value's
// distribution: the requests' tile has none, as a request has no value to distribute.
const TILES = Object.freeze([
  Object.freeze({ name: "requests", hasChart: false }),
  Object.freeze({ name: "input", hasChart: true }),
  Object.freeze({ name: "output", hasChart: true }),
  Object.freeze({ name: "ttft", hasChart: true }),
]);

/**
 * The four tiles' text for `summary` (as `trafficSummary` gives it) and `percentiles`: `[{ label, value, notes }]`,
 * the requests written as the stats strip writes them, an average with no value "—", and `notes` the lines under a
 * tile: under the TTFT the share that records it, "49% record it", then under each average its percentiles,
 * "≈1,100 p50 · ≈4,200 p90". `percentiles` is null while they have not arrived, each such note then "…"; else
 * `{ input, output, ttft }`, each `{ p50, p90 }` (a null value written "—"), or null for no note.
 */
export function tileTexts(summary, percentiles) {
  const share = summary.ttftShare === null ? MISSING_TEXT : formatPercent(summary.ttftShare);
  return [
    { label: "Requests", value: formatCompactCount(summary.requests), notes: [] },
    {
      label: "Avg input tokens",
      value: averageText(summary.inputAverage, formatWholeCount),
      notes: percentileNotes(percentiles, "input", formatSignificant),
    },
    {
      label: "Avg output tokens",
      value: averageText(summary.outputAverage, formatWholeCount),
      notes: percentileNotes(percentiles, "output", formatSignificant),
    },
    {
      label: "Avg TTFT",
      value: averageText(summary.ttftAverage, formatSeconds),
      notes: [`${share} record it`, ...percentileNotes(percentiles, "ttft", formatSignificantSeconds)],
    },
  ];
}

/**
 * Fill `list`, a `<ul>`, with the four tiles, each an `<li>` named by its `data-tile` ("requests", "input", "output",
 * "ttft") holding an empty `div.tile-text`, and the input, output and TTFT tiles under it a `div.tile-chart`, each
 * showing the loading state; return the three chart places in that order, `[input, output, ttft]`. Called once,
 * before `renderTiles`.
 */
export function placeTiles(list) {
  const tiles = [];
  const chartPlaces = [];
  for (const { name, hasChart } of TILES) {
    const tile = document.createElement("li");
    tile.setAttribute("data-tile", name);
    tile.append(textElement("div", "tile-text", ""));
    if (hasChart) {
      // The place is a figure's body, so the chart is drawn, counted and styled as every other chart is.
      const place = textElement("div", "tile-chart figure-body", "");
      showLoading(place);
      tile.append(place);
      chartPlaces.push(place);
    }
    tiles.push(tile);
  }
  list.replaceChildren(...tiles);
  return chartPlaces;
}

/**
 * Write into each tile's `div.tile-text` of `list` (as `placeTiles` laid it out) its entry of `tileTexts(summary,
 * percentiles)`: its value, its label and its notes, each on a line of its own. The tiles' charts are left as they are.
 */
export function renderTiles(list, summary, percentiles) {
  for (const [index, { label, value, notes }] of tileTexts(summary, percentiles).entries()) {
    const text = list.children[index].children[0]; // the tile's text comes first, before its chart
    text.replaceChildren(textElement("strong", "", value), textElement("span", "", label));
    for (const note of notes) {
      text.append(textElement("span", "tile-note", note));
    }
  }
}

// An average written by `format`, or "—" where there is none.
function averageText(average, format) {
  return average === null ? MISSING_TEXT : format(average);
}

// The percentiles' note under the average of `key` ("input", "output" or "ttft"), each written by `format`: a list of
// one line, "…" while `percentiles` is null, or of none where `percentiles` has none for it.
function percentileNotes(percentiles, key, format) {
  if (percentiles === null) {
    return [PERCENTILES_LOADING_NOTE];
  }
  const values = percentiles[key];
  if (values === null) {
    return [];
  }
  return [`${percentileText(values.p50, format)} p50 · ${percentileText(values.p90, format)} p90`];
}
