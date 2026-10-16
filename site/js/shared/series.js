/**
 * A chart's series: the column naming a row's series, a series' label, the rows of the series its legend does not hide
 * (of one panel, for a figure's answer), and the legend itself, `{ series, colours }`, the series it lists, each
 * `{ name, label }`, and their colours, a Map from name to colour; and a figure card's colours, the global series and
 * the three highlighted models in one fixed colour each on every card, in the paper's legend order and with their
 * labels. These are plain functions, tested with `node --test`.
 *
 * And the kinds of series the Overview and the Traffic Explorer draw, the models, the endpoint groups and the
 * families, each `{ order, column, colours, labels? }`: `order`, the key of the orders (the page's `context.orders`,
 * `explore/start.js`, and the Traffic Explorer's own) whose rows give the colour order;
 * `column`, the column of an answer naming a row's series; `colours(orderRows)`, a Map from name to colour; and, for a
 * kind whose series are not written by their names, `labels`, each series' label (the endpoint groups'
 * `ENDPOINT_LABELS`).
 */

import { panelRows } from "./charts.js";
import { endpointColours, familyColours, modelColours, OTHER_SERIES, SERIES_SLOTS } from "../theme/colours.js";

/** The column of a figure's answer naming each row's series. */
export const SERIES_COLUMN = "series";

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

/**
 * The series every figure card draws in one colour, by their names in the figure answers: the global series in the
 * text's ink, as the paper draws it in black, and the three highlighted models in the first three series slots.
 */
export const FIXED_SERIES_COLOURS = Object.freeze({
  Global: "var(--color-text)",
  "DeepSeek V3.2": SERIES_SLOTS[0],
  "Deepseek R1": SERIES_SLOTS[1],
  "Minimax M2.5": SERIES_SLOTS[2],
});

/** The global series and the three highlighted models, as the figure answers name them, in the paper's legend order. */
export const HIGHLIGHTED_SERIES = Object.freeze(["Global", "DeepSeek V3.2", "Deepseek R1", "Minimax M2.5"]);

/** The labels of the highlighted models whose names in the figure answers are not spelled as the models' own. */
export const HIGHLIGHTED_LABELS = Object.freeze({ "Deepseek R1": "DeepSeek R1", "Minimax M2.5": "MiniMax M2.5" });

/**
 * A figure card's colours: a Map from each of `names`, in their order, to its colour, `FIXED_SERIES_COLOURS`' where it
 * has one there, else the next of `slots` (the eight series slots when not given) that no fixed series of `names`
 * takes, and `OTHER_SERIES` once the slots run out.
 */
export function figureColours(names, slots = SERIES_SLOTS) {
  const fixed = names.filter((name) => Object.hasOwn(FIXED_SERIES_COLOURS, name));
  const takenSlots = new Set(fixed.map((name) => FIXED_SERIES_COLOURS[name]));
  const freeSlots = slots.filter((slot) => !takenSlots.has(slot));
  const colours = new Map();
  let nextFreeSlot = 0;
  for (const name of names) {
    if (Object.hasOwn(FIXED_SERIES_COLOURS, name)) {
      colours.set(name, FIXED_SERIES_COLOURS[name]);
    } else {
      colours.set(name, nextFreeSlot < freeSlots.length ? freeSlots[nextFreeSlot] : OTHER_SERIES);
      nextFreeSlot += 1;
    }
  }
  return colours;
}

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
