/**
 * A chart's series: the rows of the series its legend does not hide, and the legend itself, `{ series, colours }`, the
 * series it lists, each `{ name, label }`, and their colours, a Map from name to colour. These are plain functions,
 * tested with `node --test`.
 *
 * And the kinds of series the Overview and the Traffic Explorer draw, the models, the endpoint groups and the
 * families, each `{ order, column, colours, labels? }`: `order`, the key of the orders (the page's `context.orders`,
 * `explore/start.js`, and the Traffic Explorer's own) whose rows give the colour order;
 * `column`, the column of an answer naming a row's series; `colours(orderRows)`, a Map from name to colour; and, for a
 * kind whose series are not written by their names, `labels`, each series' label (the endpoint groups'
 * `ENDPOINT_LABELS`).
 */

import { endpointColours, familyColours, modelColours } from "../theme/colours.js";

/** The models as a chart's series, each written by its name. */
export const MODEL_SERIES = Object.freeze({
  order: "models",
  column: "model",
  colours: modelColours,
});

/** The model families as a chart's series, each written by its name; the Traffic Explorer orders them by requests. */
export const FAMILY_SERIES = Object.freeze({
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

/** The endpoint groups as a chart's series, each written by its label, "Chat stream". */
export const ENDPOINT_SERIES = Object.freeze({
  order: "endpoints",
  column: "endpoint_group",
  colours: endpointColours,
  labels: ENDPOINT_LABELS,
});

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
      series.push({ name, label: Object.hasOwn(labels, name) ? labels[name] : name });
    }
  }
  return { series, colours };
}
