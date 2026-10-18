/**
 * The Overview's two donuts over the whole trace: the family mix, each model family's share of the requests
 * (`explore/family_mix`), and the endpoint mix, each endpoint group's share (`explore/endpoint_mix`). Each answer is
 * also its series' colour order, so the page asks for it once and gives its rows as `context.mixes.families` and
 * `context.mixes.endpoints`.
 *
 * A donut names each series its colours name, in those colours: the families as the Traffic Explorer colours them
 * (`familyColours`), the endpoint groups as `endpointColours` does, every other name folded into "Other". The donut
 * kind (`charts/donut.js`) draws it, the slices' total in its centre. Its legend hides and shows a slice
 * (`shared/legend.js`).
 *
 * A section's `context` is what the page gives every section; see `page/start.js`.
 */

import { renderFigure, showError, showLoading } from "../shared/figure.js";
import { columnTotal } from "../shared/rows.js";
import { formatCompactCount, formatQuantity } from "../shared/format.js";
import { BY_ENDPOINT, BY_FAMILY } from "../shared/series.js";
import { drawWithLegend } from "../shared/legend.js";
import { donutLegend, drawDonut } from "../charts/donut.js";

/** The two donuts, in the page's order: each card's words and the breakdown it slices the requests by. */
export const MIXES = Object.freeze([
  Object.freeze({
    // placeholder: the family mix's title, caption and definition, for the authors.
    title: "Model families",
    caption: "Each family's share of the requests.",
    definition: "Requests over the whole trace, by the family of the model they asked for, as the Traffic Explorer "
      + "groups them; the models in no family are Other.",
    breakdown: BY_FAMILY,
  }),
  Object.freeze({
    title: "Endpoint mix",
    caption: "Each endpoint group's share of the requests.",
    definition: "Requests over the whole trace, by the endpoint they were sent to: chat or completion, streamed or "
      + "not. Requests to any other endpoint are Other.",
    breakdown: BY_ENDPOINT,
  }),
]);

/** Lay out the donuts in `container` and draw them; a donut whose answer fails shows its error in its card. */
export async function runMixes(container, context) {
  container.replaceChildren();
  const drawings = [];
  for (const mix of MIXES) {
    const place = document.createElement("article");
    place.className = "card donut-card";
    showLoading(place);
    container.append(place);
    drawings.push(drawMix(place, mix, context).catch((error) => showError(place, error)));
  }
  await Promise.all(drawings);
}

/**
 * The legend of a mix's donut over `rows`, its answer's rows, which are also its colour order: `{ series, colours }`,
 * its slices largest first and "Other" last, each labelled with its share, in the colours `mix.breakdown` gives them.
 */
export function mixLegend(mix, rows) {
  const { column, colours, labels } = mix.breakdown;
  return donutLegend(rows, colours(rows), { nameColumn: column, countColumn: "requests", labels });
}

async function drawMix(place, mix, context) {
  const rows = await context.mixes[mix.breakdown.order];
  const body = renderFigure(place, {
    title: mix.title,
    caption: mix.caption,
    definition: mix.definition,
    rows: formatQuantity(columnTotal(rows, "requests"), "request", "requests"),
  });
  const legend = mixLegend(mix, rows);
  await drawWithLegend(body, legend, (hidden) => drawDonut(rows, body, legend.colours, {
    nameColumn: mix.breakdown.column,
    countColumn: "requests",
    unit: "requests",
    totalFormat: formatCompactCount, // a billion requests is too wide for the centre written in full
    labels: mix.breakdown.labels,
  }, hidden));
}
