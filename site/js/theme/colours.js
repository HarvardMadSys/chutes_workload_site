/**
 * The site's colours as the style tokens give them, and the endpoint groups' labels beside their colours.
 *
 * Every colour is a CSS variable from `style.css`, so a chart follows the page into dark mode with no JavaScript.
 * Names get colours from one fixed order, so the same model has the same colour in every chart: the models from the
 * rows of `explore/model_mix`, the endpoint groups from those of `explore/endpoint_mix`. These are plain constants and
 * functions, tested with `node --test`.
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

/**
 * The models' colours, which every chart of models colours them by: the named models of `modelMixRows` (the rows of
 * `explore/model_mix`, most requested first) in the series colours from the first slot, and "Other" in its grey.
 */
export function modelColours(modelMixRows) {
  const named = modelMixRows.map((row) => row.model).filter((model) => model !== OTHER_NAME);
  return barColours(named);
}

/** The slot the endpoint groups' colours start from: apart from the models', so the two donuts do not open alike. */
export const ENDPOINT_FIRST_SLOT = 4;

/** Each endpoint group's label, by its name in the answers. */
export const ENDPOINT_LABELS = Object.freeze({
  chat: "Chat",
  chat_stream: "Chat stream",
  completion: "Completion",
  completion_stream: "Completion stream",
  other: "Other",
});

// The endpoint group of the requests to neither a chat nor a completion endpoint: drawn as "Other", grey and last.
const OTHER_ENDPOINT_GROUP = "other";

/**
 * The endpoint groups' colours, which every chart of endpoint groups colours them by: the groups of `endpointMixRows`
 * (the rows of `explore/endpoint_mix`, most requested first) in the series colours from `ENDPOINT_FIRST_SLOT`, and
 * "Other", in its grey, which the group `other` folds into as a model past the eighth does.
 */
export function endpointColours(endpointMixRows) {
  const named = endpointMixRows.map((row) => row.endpoint_group).filter((group) => group !== OTHER_ENDPOINT_GROUP);
  return barColours(named, ENDPOINT_FIRST_SLOT);
}
