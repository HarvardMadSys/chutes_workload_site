/**
 * The Overview's two donuts over the whole trace: the model mix, each model's share of the requests
 * (`explore/model_mix`), and the endpoint mix, each endpoint group's share (`explore/endpoint_mix`). Each answer is
 * also its series' colour order, so the page asks for it once and gives its rows as `context.orders.models` and
 * `context.orders.endpoints`.
 *
 * A donut names the series that hold the eight colours of its colour order, in those colours, as the trends colour
 * them, and folds the rest into "Other"; the donut kind (`charts/donut.js`) draws it, the slices' total in its centre.
 * Its legend hides and shows a slice (`explore/legend.js`).
 *
 * A section's `context` is what the page gives every section; see `explore/start.js`.
 */

import { columnTotal, renderFigure, showError, showLoading } from "../shared/charts.js";
import { formatCompactCount, formatQuantity } from "../shared/format.js";
import { ENDPOINT_SERIES, MODEL_SERIES } from "../shared/series.js";
import { drawWithLegend } from "../explore/legend.js";
import { donutLegend, drawDonut } from "../charts/donut.js";

/** The two donuts, in the page's order: each card's words and the series it slices the requests by. */
export const MIXES = Object.freeze([
  Object.freeze({
    title: "Model mix",
    caption: "Each model's share of the requests.",
    definition: "Requests over the whole trace, by the model they asked for. The eight models with most requests are "
      + "named, as the trends name them; the rest are Other.",
    series: MODEL_SERIES,
  }),
  Object.freeze({
    title: "Endpoint mix",
    caption: "Each endpoint group's share of the requests.",
    definition: "Requests over the whole trace, by the endpoint they were sent to: chat or completion, streamed or "
      + "not. Requests to any other endpoint are Other.",
    series: ENDPOINT_SERIES,
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
 * its slices largest first and "Other" last, each labelled with its share, in the colours `mix.series` gives them.
 */
export function mixLegend(mix, rows) {
  const { column, colours, labels } = mix.series;
  return donutLegend(rows, colours(rows), { nameColumn: column, countColumn: "requests", labels });
}

async function drawMix(place, mix, context) {
  const rows = await context.orders[mix.series.order];
  const body = renderFigure(place, {
    title: mix.title,
    caption: mix.caption,
    definition: mix.definition,
    rows: formatQuantity(columnTotal(rows, "requests"), "request", "requests"),
  });
  const legend = mixLegend(mix, rows);
  await drawWithLegend(body, legend, (hidden) => drawDonut(rows, body, { series: legend.colours }, {
    nameColumn: mix.series.column,
    countColumn: "requests",
    unit: "requests",
    totalFormat: formatCompactCount, // a billion requests is too wide for the centre written in full
    labels: mix.series.labels,
  }, hidden));
}
