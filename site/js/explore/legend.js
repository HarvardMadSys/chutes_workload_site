/**
 * The legend of a chart of more than one series, as one button per entry, an entry being one series or, with `names`,
 * several: a click hides the entry's series, or shows them again, and the chart is drawn anew from the rows it already
 * has, with no query. A hidden entry's button is struck through and not pressed.
 *
 * A legend is `{ series, colours, dashed? }`: the entries it lists, `[{ name, label, names? }]`, `name` being the
 * series' value in the rows and `label` the text its button shows, their colours, a Map from an entry's name to its
 * colour, and, for a chart of lines, the names of the series drawn dashed, whose swatches are dashed lines. An entry's
 * `names`, where it has them, are the series its button hides and shows together, as one routing policy's series of
 * every model; `[name]` where it has none. The hidden series are a Set of the rows' series names; it lives as long as
 * one drawing of the chart, unless its caller keeps it for the next (`drawWithLegend`), and it is never written to
 * the URL.
 *
 * From the keyboard a legend is one tab stop, a group of buttons: Tab reaches the last button focused in it, the first
 * at first, ArrowLeft and ArrowRight move between its buttons, and Enter or Space toggles one, as a click does.
 */

import { DASH, legendPlace, showError, showNote } from "../shared/charts.js";

// The note in place of a chart whose every series is hidden.
const EVERY_SERIES_HIDDEN_NOTE = "Every series is hidden: click one in the legend to show it.";

// A legend lists at least this many entries: with one there is nothing to choose between, and the chart stays as it is.
const MIN_SERIES_IN_LEGEND = 2;

// The name a screen reader gives a legend's group of buttons.
const LEGEND_GROUP_NAME = "Series";

/**
 * Fill `container` with one button per entry of `series` (`[{ name, label, names? }]`), each with its colour from
 * `colours` (a Map from an entry's name to its colour) in a swatch shaped as the chart draws it, `swatch` ("square" or
 * "line"), a dashed line for a line of `dashed` (the names of the series drawn dashed), each pressed but an entry
 * whose every series is in `hidden` (none by default), the whole one tab stop with the arrow keys inside it. A click
 * flips the button between pressed and struck through and calls `onToggle(names)` with the entry's
 * `legendEntryNames`. Fewer than two entries leave `container` empty.
 */
export function mountLegend(container, series, colours, onToggle, swatch = "square", dashed = [], hidden = new Set()) {
  if (!hasLegend(series)) {
    container.replaceChildren();
    return;
  }
  const buttons = [];
  for (const entry of series) {
    const isDashed = swatch === "line" && dashed.includes(entry.name);
    const isShown = !legendEntryNames(entry).every((name) => hidden.has(name));
    const appearance = { label: entry.label, colour: colours.get(entry.name), swatch, isDashed, isShown };
    buttons.push(legendButton(appearance, () => onToggle(legendEntryNames(entry))));
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
 * Place `legend`'s buttons in the legend's place above `body` (`legendPlace`), their swatches shaped `swatch` ("square"
 * or "line", dashed for the legend's `dashed` series), and draw the chart into `body` with `drawChart(hidden)`. The
 * series hidden at first are `shared.hidden`, none when not given. Each click on a button hides or shows its series,
 * calls `drawChart` again with the new hidden set, then `shared.onToggle(hidden)` where given, so that other charts
 * the legend stands for follow it; a chart whose every series is hidden shows a note instead (`drawShownSeries`), and
 * a drawing after a click that fails shows its error in `body`. A legend of fewer than two series is not placed, and
 * its chart is drawn with nothing hidden. Settles when the first drawing has.
 */
export async function drawWithLegend(body, legend, drawChart, swatch = "square", shared = {}) {
  if (!hasLegend(legend.series)) {
    await drawChart(new Set());
    return;
  }
  let hidden = shared.hidden ?? new Set();
  async function onToggle(names) {
    hidden = toggledSeries(hidden, names);
    try {
      await drawShownSeries(body, legend, hidden, drawChart);
    } catch (error) {
      // No one awaits a click, so the error is shown here, in the chart's place, as a failed first drawing's would be.
      showError(body, error);
    }
    shared.onToggle?.(hidden);
  }
  mountLegend(legendPlace(body), legend.series, legend.colours, onToggle, swatch, legend.dashed ?? [], hidden);
  await drawShownSeries(body, legend, hidden, drawChart);
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
    if (!legendEntryNames(entry).every((name) => hidden.has(name))) {
      return false;
    }
  }
  return true;
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
 * `hidden` (`isEverySeriesHidden`), show the note that says so instead. Settles when the drawing has.
 */
export async function drawShownSeries(body, legend, hidden, drawChart) {
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
  // Pressed means shown: the button's state follows each click, as the hidden set does.
  button.setAttribute("aria-pressed", String(appearance.isShown));
  const swatch = document.createElement("span");
  swatch.className = appearance.swatch === "line" ? "legend-swatch is-line" : "legend-swatch";
  swatch.style.background = appearance.isDashed ? dashedBackground(appearance.colour) : appearance.colour;
  button.append(swatch, appearance.label);
  button.addEventListener("click", () => flipAndCall(button, onClick));
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

function flipAndCall(button, onClick) {
  const isPressed = button.getAttribute("aria-pressed") === "true";
  button.setAttribute("aria-pressed", String(!isPressed));
  onClick();
}
