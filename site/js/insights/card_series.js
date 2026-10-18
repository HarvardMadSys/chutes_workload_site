/**
 * A figure card's series (`insights/figure_card.js` defines a card): the order they take their colours in, the colours
 * each of the card's palettes gives them, and the card's legend. A card's answer rows name their series in `series`;
 * a Map from series name to colour, in the order drawn, crosses to the chart and its legend (the policies' legend
 * takes a Map from policy to colour, its entries being policies). Pure functions, tested with `node --test`.
 */

import { distinct, panelRows } from "../shared/charts.js";
import {
  endpointFigureColours, figureColours, policyColours, SERIES_COLUMN, seriesLegend, seriesPolicy,
} from "../shared/series.js";
import { FAMILY_SLOTS, SERIES_SLOTS } from "../theme/colours.js";

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

// The legend of routing series named "<model>, <policy>" (`series`, `[{ name }]`, coloured by `colours`, a Map from
// series name to colour): one entry per policy, in the order the policies first appear, `{ name, label, names }`, the
// policy as name and label and `names` the series of that policy, one per model, which its button hides and shows
// together; its colours, a Map from policy to the colour its series share; and no series dashed.
function policyLegend(series, colours) {
  const entries = new Map();
  for (const { name } of series) {
    const policy = seriesPolicy(name);
    if (!entries.has(policy)) {
      entries.set(policy, { name: policy, label: policy, names: [] });
    }
    entries.get(policy).names.push(name);
  }
  const entryColours = new Map();
  for (const entry of entries.values()) {
    entryColours.set(entry.name, colours.get(entry.names[0]));
  }
  return { series: [...entries.values()], colours: entryColours, dashed: [] };
}
