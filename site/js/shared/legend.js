/**
 * The legend of a chart of more than one series, as one button per entry, an entry being one series or, with `names`,
 * several: a click hides the entry's series, or shows them again, and the chart is drawn anew from the rows it already
 * has, with no query. A hidden entry's button is struck through and not pressed.
 *
 * A legend is a `Legend` (below): an entry's `name` is the series' value in the rows and its `label` the text its
 * button shows; its `names`, where it has them, are the series its button hides and shows together, as one routing
 * policy's series of every model, `[name]` where it has none. The hidden series are a Set of the rows' series names,
 * held by the legend's buttons (`mountLegend`); the set a legend starts from and the function told of each change are
 * its `LegendState`. The set lives as long as one drawing of the chart, unless its caller keeps it for the next, and it
 * is never written to the URL.
 *
 * From the keyboard a legend is one tab stop, a group of buttons: Tab reaches the last button focused in it, the first
 * at first, ArrowLeft and ArrowRight move between its buttons, and Enter or Space toggles one, as a click does.
 */

import { DASH } from "../plot/frame.js";
import { legendPlace, showError, showNote } from "./figure.js";

/**
 * A legend: the entries it lists, their colours, and how their swatches are drawn.
 * @typedef {object} Legend
 * @property {Array<{name: string, label: string, names?: string[]}>} series  the entries, in order
 * @property {Map<string, string>} colours  each entry's colour, by its name
 * @property {string} [swatch]  "square" (the default) or "line"
 * @property {string[]} [dashed]  the series drawn dashed, whose line swatches are dashed; none when not given
 */

/**
 * The hidden series a legend starts from and the function told of each change. Both keys are optional.
 * @typedef {object} LegendState
 * @property {Set<string>} [hidden]  the series hidden at first; none when not given
 * @property {function} [onToggle]  called with the new hidden set after each press
 */

// The note in place of a chart whose every series is hidden.
const EVERY_SERIES_HIDDEN_NOTE = "Every series is hidden: click one in the legend to show it.";

// A legend lists at least this many entries: with one there is nothing to choose between, and the chart stays as it is.
const MIN_SERIES_IN_LEGEND = 2;

// The name a screen reader gives a legend's group of buttons.
const LEGEND_GROUP_NAME = "Series";

/**
 * Fill `container` with one button per entry of `legend` (a `Legend`), each with its colour in a swatch shaped as the
 * chart draws it, a dashed line for a line of the legend's `dashed`, the whole one tab stop with the arrow keys inside
 * it. The buttons hold the hidden set, `legendState.hidden` at first (none when not given): a press hides the entry's
 * series, or shows them again (`toggledSeries`), sets every button's pressed state from the new set (`isEntryShown`),
 * and calls `legendState.onToggle(hidden)` where given. A legend of fewer than two entries (`hasLegend`) leaves
 * `container` empty.
 */
export function mountLegend(container, legend, legendState = {}) {
  if (!hasLegend(legend.series)) {
    container.replaceChildren();
    return;
  }
  let hidden = legendState.hidden ?? new Set();
  const buttons = [];
  function press(entry) {
    hidden = toggledSeries(hidden, legendEntryNames(entry));
    for (const [index, button] of buttons.entries()) {
      button.setAttribute("aria-pressed", String(isEntryShown(legend.series[index], hidden)));
    }
    legendState.onToggle?.(hidden);
  }
  const swatch = legend.swatch ?? "square";
  const dashed = legend.dashed ?? [];
  for (const entry of legend.series) {
    const isDashed = swatch === "line" && dashed.includes(entry.name);
    const colour = legend.colours.get(entry.name);
    const appearance = { label: entry.label, colour, swatch, isDashed, isShown: isEntryShown(entry, hidden) };
    buttons.push(legendButton(appearance, () => press(entry)));
  }
  for (const [index, button] of buttons.entries()) {
    button.tabIndex = index === 0 ? 0 : -1;
    button.addEventListener("keydown", (event) => moveFocusByKey(buttons, index, event));
  }
  container.setAttribute("role", "group");
  container.setAttribute("aria-label", LEGEND_GROUP_NAME);
  container.replaceChildren(...buttons);
}

/**
 * The index of the button an arrow key moves focus to from the button at `index` of `count`: ArrowRight the next and
 * ArrowLeft the one before, each stopping at the ends; null for any other key.
 */
export function legendIndexForKey(key, index, count) {
  if (key === "ArrowRight") {
    return Math.min(index + 1, count - 1);
  }
  if (key === "ArrowLeft") {
    return Math.max(index - 1, 0);
  }
  return null;
}

/** The series names a legend entry's button hides and shows: its `names` where it has them, else its `name` alone. */
export function legendEntryNames(entry) {
  return entry.names ?? [entry.name];
}

/** A copy of `hidden` with every one of `names` shown when all of them were hidden, and else every one hidden. */
export function toggledSeries(hidden, names) {
  const toggled = new Set(hidden);
  const wereHidden = names.every((name) => hidden.has(name));
  for (const name of names) {
    if (wereHidden) {
      toggled.delete(name);
    } else {
      toggled.add(name);
    }
  }
  return toggled;
}

/** True when `series` (`[{ name }]`, a legend's entries) is long enough to be given a legend: two entries or more. */
export function hasLegend(series) {
  return series.length >= MIN_SERIES_IN_LEGEND;
}

/**
 * Place `legend`'s buttons (`mountLegend`) in the legend's place above `body` (`legendPlace`), and draw the chart into
 * `body` with `drawChart(hidden)` (`drawShownSeries`). The series hidden at first are `legendState.hidden`, none when
 * not given. Each press draws the chart again with the new hidden set, then calls `legendState.onToggle(hidden)` where
 * given, so that other charts the legend stands for follow it; a drawing after a press that fails shows its error in
 * `body`. Settles when the first drawing has.
 */
export async function drawWithLegend(body, legend, drawChart, legendState = {}) {
  async function onToggle(hidden) {
    try {
      await drawShownSeries(body, legend, hidden, drawChart);
    } catch (error) {
      // No one awaits a press, so the error is shown here, in the chart's place, as a failed first drawing's would be.
      showError(body, error);
    }
    legendState.onToggle?.(hidden);
  }
  const hiddenAtFirst = legendState.hidden ?? new Set();
  mountLegend(legendPlace(body), legend, { hidden: hiddenAtFirst, onToggle });
  await drawShownSeries(body, legend, hiddenAtFirst, drawChart);
}

/**
 * True when `series` (`[{ name, names? }]`) has an entry and every series name of every entry (`legendEntryNames`) is
 * in `hidden`, so nothing is left to draw.
 */
export function isEverySeriesHidden(series, hidden) {
  if (series.length === 0) {
    return false;
  }
  for (const entry of series) {
    if (isEntryShown(entry, hidden)) {
      return false;
    }
  }
  return true;
}

// True when some series of `entry` (`legendEntryNames`) is not in `hidden`: its button is pressed.
function isEntryShown(entry, hidden) {
  return !legendEntryNames(entry).every((name) => hidden.has(name));
}

/**
 * The background of a dashed line's swatch in `colour`: dashes and gaps of the lengths a dashed series is drawn with
 * (`DASH`), across the swatch.
 */
export function dashedBackground(colour) {
  const [dash, gap] = DASH;
  return `repeating-linear-gradient(to right, ${colour} 0 ${dash}px, transparent ${dash}px ${dash + gap}px)`;
}

/**
 * Draw a chart of `legend`'s series into `body` with `drawChart(hidden)`, or, where every series of the legend is in
 * `hidden` (`isEverySeriesHidden`), show the note that says so instead. A legend of fewer than two series (`hasLegend`)
 * hides nothing: its chart is drawn with an empty hidden set, whatever `hidden` is. Settles when the drawing has.
 */
export async function drawShownSeries(body, legend, hidden, drawChart) {
  if (!hasLegend(legend.series)) {
    await drawChart(new Set());
    return;
  }
  if (isEverySeriesHidden(legend.series, hidden)) {
    showNote(body, EVERY_SERIES_HIDDEN_NOTE);
    return;
  }
  await drawChart(hidden);
}

// A legend button for `appearance`, `{ label, colour, swatch, isDashed, isShown }`, its swatch a square, a short
// line or a short dashed line, pressed where its series are shown.
function legendButton(appearance, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "legend-button";
  // Pressed means shown; after each press `mountLegend` sets it again from the hidden set.
  button.setAttribute("aria-pressed", String(appearance.isShown));
  const swatch = document.createElement("span");
  swatch.className = appearance.swatch === "line" ? "legend-swatch is-line" : "legend-swatch";
  swatch.style.background = appearance.isDashed ? dashedBackground(appearance.colour) : appearance.colour;
  button.append(swatch, appearance.label);
  button.addEventListener("click", onClick);
  return button;
}

// An arrow key on the button at `index` of `buttons` focuses the button it names, which becomes the legend's tab stop.
function moveFocusByKey(buttons, index, event) {
  const next = legendIndexForKey(event.key, index, buttons.length);
  if (next === null) {
    return;
  }
  event.preventDefault(); // an arrow would otherwise scroll the page
  for (const [other, button] of buttons.entries()) {
    button.tabIndex = other === next ? 0 : -1;
  }
  buttons[next].focus();
}
