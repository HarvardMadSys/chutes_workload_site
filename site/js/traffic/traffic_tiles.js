/**
 * The Traffic Explorer's four tiles above its chart: the chosen requests, their average input and output tokens and
 * their average TTFT with the share of them that record it. They take a summary as `trafficSummary` of
 * `traffic/traffic_filter.js` gives it, `{ requests, inputAverage, outputAverage, ttftAverage, ttftShare }`, and do not
 * change with the metric the bars stack.
 */

import { textElement } from "../shared/charts.js";
import {
  formatCompactCount, formatPercent, formatSeconds, formatWholeCount, MISSING_TEXT,
} from "../shared/format.js";

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

// An average written by `format`, or "—" where there is none.
function averageText(average, format) {
  return average === null ? MISSING_TEXT : format(average);
}
