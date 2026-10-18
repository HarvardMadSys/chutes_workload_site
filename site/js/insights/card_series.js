/**
 * A figure card's series (`insights/figure_card.js` defines a card): the order they take their colours in, the colours
 * each of the card's palettes gives them, the global series and the three highlighted models in one fixed colour each
 * on every card, and the card's legend; and the colour scheme of a card that shades a count. A card's answer rows name
 * their series in `series`; a Map from series name to colour, in the order drawn, crosses to the chart and its legend
 * (the policies' legend, `insights/routing_panels.js`, takes a Map from policy to colour, its entries being
 * policies). Pure functions, tested with `node --test`.
 */

import { distinct, panelRows } from "../shared/rows.js";
import { ENDPOINT_LABELS, SERIES_COLUMN, seriesLabel, seriesLegend } from "../shared/series.js";
import { endpointColours, FAMILY_SLOTS, OTHER_NAME, OTHER_SERIES, SERIES_SLOTS } from "../theme/colours.js";
import { policyColours, policyLegend } from "./routing_panels.js";

/**
 * The series every figure card draws in one colour, by their names in the figure answers: the global series and the
 * eviction figures' size-aware Belady oracle in the text's ink, as the paper draws its reference lines in black, and
 * the three highlighted models in the first three series slots.
 */
export const FIXED_SERIES_COLOURS = Object.freeze({
  Global: "var(--color-text)",
  "Belady (size-aware)": "var(--color-text)",
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

/**
 * A figure card's colours where its series are the endpoint groups, as the Overview colours them: a Map from each of
 * `names`, in order, to the colour `endpointColours(endpointMixRows)` gives the group whose label in `ENDPOINT_LABELS`
 * is the series' label (`labels[name]`, else its name), "Other"'s grey for a group that folds into "Other". Throws a
 * RangeError naming a series whose label is no group's.
 */
export function endpointFigureColours(names, labels, endpointMixRows) {
  const groupColours = endpointColours(endpointMixRows);
  const groupsByLabel = new Map(Object.entries(ENDPOINT_LABELS).map(([group, label]) => [label, group]));
  const colours = new Map();
  for (const name of names) {
    const group = groupsByLabel.get(seriesLabel(labels, name));
    if (group === undefined) {
      throw new RangeError(`the series "${name}" is labelled as no endpoint group is`);
    }
    colours.set(name, groupColours.get(group) ?? groupColours.get(OTHER_NAME));
  }
  return colours;
}

/**
 * A card's colours for a count, of models, users, requests or instances, as the paper shades one: viridis on a log
 * scale, from a quarter of the way along it, since its first colour, a near-black purple, vanishes into the dark
 * scheme's card. A card spreads it into its `chart`.
 */
export const COUNT_COLOUR = Object.freeze({ scheme: "viridis", schemeStart: 0.25, colourLog: true });

/**
 * The colours a card's series may take, by the card's `palette`, each a function of the series' names, in order, the
 * card's series labels and the rows of `explore/endpoint_mix`, to a Map from name to colour: "series", the eight
 * series slots; "families", the ten of the families, for a card of more series than eight; "endpoints", the endpoint
 * groups' colours as the Overview's, for series that are endpoint groups written by their labels; "policies", one
 * colour per routing policy, for series named "<model>, <policy>".
 */
export const PALETTES = Object.freeze({
  series: (names) => figureColours(names, SERIES_SLOTS),
  families: (names) => figureColours(names, FAMILY_SLOTS),
  endpoints: (names, labels, endpointMixRows) => endpointFigureColours(names, labels, endpointMixRows),
  policies: (names) => policyColours(names),
});

// The palette of a card that names none.
const DEFAULT_PALETTE = "series";

// The palette whose legend lists each policy once, for the series of every model.
const POLICY_PALETTE = "policies";

/**
 * The legend of `card` over its answer's `rows`: `{ series, colours, dashed }` (as `shared/legend.js` takes one), the
 * series `colours` names that the rows hold, labelled by the card's `chart.labels`, and its `chart.dashed`, the
 * series drawn dashed, whose swatches are dashed too; for a card of the policies' palette, `policyLegend`'s. A card
 * whose every panel holds one series lists none, so it has no legend: each panel's title names its series, and hiding
 * one would leave its panel empty.
 */
export function figureLegend(card, rows, colours) {
  const legend = { ...seriesLegend(rows, SERIES_COLUMN, colours, card.chart.labels), dashed: card.chart.dashed ?? [] };
  if (hasOneSeriesPerPanel(card, rows)) {
    return { ...legend, series: [] };
  }
  if (card.palette === POLICY_PALETTE) {
    return policyLegend(legend.series, colours);
  }
  return legend;
}

/** True when `card` has panels and the rows of each of them hold one series at most. */
export function hasOneSeriesPerPanel(card, rows) {
  if (card.panels === undefined) {
    return false;
  }
  for (const entry of card.panels) {
    const names = new Set(panelRows(rows, entry.panel).map((row) => row[SERIES_COLUMN]));
    if (names.size > 1) {
      return false;
    }
  }
  return true;
}

/**
 * The names of the series a card's answer `rows` draws, in the order they take their colours: the order of
 * `legendRows`, a legend answer's rows `{ series, rank }`, by rank, where the card names one; else the order the
 * series first appear in `rows`. Rows without a series, as a heatmap's, have none.
 */
export function seriesOrder(rows, legendRows) {
  if (legendRows !== null) {
    const ranked = [...legendRows].sort((first, second) => first.rank - second.rank);
    return ranked.map((row) => row[SERIES_COLUMN]);
  }
  const named = rows.filter((row) => Object.hasOwn(row, SERIES_COLUMN));
  return distinct(named.map((row) => row[SERIES_COLUMN]));
}

/**
 * The colours of `card`'s series, a Map from each series it draws, in the order drawn, to its colour: its `series`
 * where it gives them, else those of `seriesOrder`, coloured by its `palette` of `PALETTES`, the endpoint groups' from
 * `endpointMixRows`, the rows of `explore/endpoint_mix`. Throws a RangeError naming the card when its palette is not
 * one of `PALETTES`.
 */
export function cardColours(card, rows, legendRows, endpointMixRows = null) {
  const palette = card.palette ?? DEFAULT_PALETTE;
  if (!Object.hasOwn(PALETTES, palette)) {
    throw new RangeError(`the card ${card.figure} names the palette "${palette}", which is not one of PALETTES`);
  }
  const names = card.series ?? seriesOrder(rows, legendRows);
  return PALETTES[palette](names, card.chart.labels ?? {}, endpointMixRows);
}
