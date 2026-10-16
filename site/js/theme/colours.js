/**
 * The site's colours as the style tokens give them.
 *
 * Every colour is a CSS variable from `style.css`, so a chart follows the page into dark mode with no JavaScript.
 * Names get colours from one fixed order, so the same model has the same colour in every chart. These are plain
 * constants and functions, tested with `node --test`.
 */

/** The eight series colours, in order. A chart assigns them in order and never cycles: a ninth series is "Other". */
export const SERIES_SLOTS = Object.freeze([
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
]);

/** The colour of every series past the eighth, folded together as "Other". */
export const OTHER_SERIES = "var(--series-other)";

/** The name a series past the eighth takes once folded; it is here because `barColours` gives it `OTHER_SERIES`. */
export const OTHER_NAME = "Other";

/**
 * A map from each distinct name, in the given order, to its series colour, the first taking the slot `firstSlot` (0,
 * the first, by default) and the next ones the slots after it, round to the first; the ninth and beyond to
 * `OTHER_SERIES`.
 */
export function assignColours(names, firstSlot = 0) {
  const colours = new Map();
  for (const name of names) {
    if (colours.has(name)) {
      continue;
    }
    const slot = (firstSlot + colours.size) % SERIES_SLOTS.length;
    colours.set(name, colours.size < SERIES_SLOTS.length ? SERIES_SLOTS[slot] : OTHER_SERIES);
  }
  return colours;
}

/**
 * The entries of `colours` (a Map from name to colour) whose colour is one of the eight series slots, in their order:
 * a line or a CDF of a named series is drawn only for these, since a series in the Other grey could not be told apart.
 */
export function slottedColours(colours) {
  const slotted = new Map();
  for (const [name, colour] of colours) {
    if (colour !== OTHER_SERIES) {
      slotted.set(name, colour);
    }
  }
  return slotted;
}

/**
 * A bar chart's colours: the first eight of `names` in their series colours from the slot `firstSlot` (as
 * `assignColours` gives them), and "Other", which the rest fold into.
 */
export function barColours(names, firstSlot = 0) {
  const colours = assignColours(names.slice(0, SERIES_SLOTS.length), firstSlot);
  colours.set(OTHER_NAME, OTHER_SERIES);
  return colours;
}
