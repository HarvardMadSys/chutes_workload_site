/**
 * A chart's series, the names it draws: the column naming a row's series, a series' label, the rows of the series its
 * legend does not hide (of one panel, for a figure's answer), and the legend itself (`Legend` of `shared/legend.js`);
 * and the three breakdowns (`Breakdown`), how the Overview and the Traffic Explorer split their rows into series, by
 * model, by endpoint group and by family, with the endpoint groups' labels. These are plain functions, tested with
 * `node --test`.
 */

import { panelRows } from "./rows.js";
import { endpointColours, familyColours, modelColours } from "../theme/colours.js";

/** The column of a figure's answer naming each row's series. */
export const SERIES_COLUMN = "series";

/**
 * How a chart splits its rows into series.
 * @typedef {object} Breakdown
 * @property {string} order  the key of the rows that give the colour order: of the page's `context.mixes`
 *   (`page/start.js`) or of the Traffic Explorer's `colourOrders`
 * @property {string} column  the answer column naming a row's series
 * @property {function} colours  the function from the rows of `order` to a Map from series name to colour
 * @property {object} [labels]  each series' label, by its name, where a series is not written by its name
 */

/** By model, each written by its name: the Traffic Explorer with a family chosen. */
export const BY_MODEL = Object.freeze({
  order: "models",
  column: "model",
  colours: modelColours,
});

/** By family, each written by its name: the Overview's family mix, the Traffic Explorer with no family chosen. */
export const BY_FAMILY = Object.freeze({
  order: "families",
  column: "family",
  colours: familyColours,
});

/** Each endpoint group's label, by its name in the answers. */
export const ENDPOINT_LABELS = Object.freeze({
  chat: "Chat",
  chat_stream: "Chat stream",
  completion: "Completion",
  completion_stream: "Completion stream",
  other: "Other",
});

/**
 * By endpoint group, each written by its label, "Chat stream": the Overview's endpoint mix, the Traffic Explorer with a
 * model chosen.
 */
export const BY_ENDPOINT = Object.freeze({
  order: "endpoints",
  column: "endpoint_group",
  colours: endpointColours,
  labels: ENDPOINT_LABELS,
});

/** A series' label: `labels[name]` where `labels` gives one, else its name. */
export function seriesLabel(labels, name) {
  return Object.hasOwn(labels, name) ? labels[name] : name;
}

/**
 * The rows a figure's answer draws, in their order: those of the panel `panel` (every row when not given) whose series,
 * `row.series`, is one `colours` names (a Map from series name to colour) and is not in `hidden`.
 */
export function shownSeriesRows(rows, colours, panel, hidden) {
  const coloured = panelRows(rows, panel).filter((row) => colours.has(row[SERIES_COLUMN]));
  return shownRows(coloured, SERIES_COLUMN, hidden);
}

/** The rows whose series, `row[seriesColumn]`, is not in `hidden`, in their order. */
export function shownRows(rows, seriesColumn, hidden) {
  return rows.filter((row) => !hidden.has(row[seriesColumn]));
}

/**
 * The legend of a figure whose rows each name their series in `seriesColumn`: `{ series, colours }`, the series of
 * `colours` (a Map from series name to colour, in the order the legend lists them) that the rows hold, each
 * `{ name, label }` with its label from `labels` where it has one, else its name, and `colours` itself.
 */
export function seriesLegend(rows, seriesColumn, colours, labels = {}) {
  const present = new Set(rows.map((row) => row[seriesColumn]));
  const series = [];
  for (const name of colours.keys()) {
    if (present.has(name)) {
      series.push({ name, label: seriesLabel(labels, name) });
    }
  }
  return { series, colours };
}
