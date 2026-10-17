/**
 * The Traffic Explorer's four tiles above its chart: the chosen requests, their average input and output tokens and
 * their average TTFT with the share of them that record it, and under each average its p50 and p90 once the
 * distributions have arrived. They take a summary as `trafficSummary` of `traffic/traffic_filter.js` gives it,
 * `{ requests, inputAverage, outputAverage, ttftAverage, ttftShare }`, and percentiles as `choicePercentiles` of
 * `traffic/traffic_distributions.js` gives them, and do not change with the metric the bars stack.
 */

import { textElement } from "../shared/charts.js";
import {
  formatCompactCount, formatPercent, formatSeconds, formatSignificant, formatSignificantSeconds, formatWholeCount,
  MISSING_TEXT,
} from "../shared/format.js";
import { percentileText } from "./traffic_distributions.js";

/** The tiles' percentiles where there are none to show, as after a failed read: no note under any average. */
export const NO_PERCENTILES = Object.freeze({ input: null, output: null, ttft: null });

// The note under an average while its percentiles have not arrived.
const PERCENTILES_LOADING_NOTE = "…";

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
 * Fill `list`, a `<ul>`, with one tile per entry of `tileTexts(summary, percentiles)`: its value, its label and its
 * notes, each on a line of its own.
 */
export function renderTiles(list, summary, percentiles) {
  const tiles = [];
  for (const { label, value, notes } of tileTexts(summary, percentiles)) {
    const tile = document.createElement("li");
    tile.append(textElement("strong", "", value), textElement("span", "", label));
    for (const note of notes) {
      tile.append(textElement("span", "tile-note", note));
    }
    tiles.push(tile);
  }
  list.replaceChildren(...tiles);
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
