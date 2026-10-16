/**
 * The Overview's donut over the whole trace: the model mix, each model's share of the requests (`explore/model_mix`).
 *
 * A donut names the series that hold the eight colours of its colour order (`context.orders.models`), in those
 * colours, as the trends colour them, and folds the rest into "Other"; the donut kind (`charts/donut.js`) draws it.
 * Its legend hides and shows a slice (`explore/legend.js`).
 *
 * A section's `context` is what the page gives every section; see `explore/start.js`.
 */

import { columnTotal, renderFigure, showError, showLoading } from "../shared/charts.js";
import { readAnswer } from "../shared/answers.js";
import { formatCompactCount, formatQuantity } from "../shared/format.js";
import { barColours } from "../theme/colours.js";
import { drawWithLegend } from "../explore/legend.js";
import { donutLegend, drawDonut } from "../charts/donut.js";

/** Lay out the donut in `container` and draw it; a donut whose query fails shows its error in its card. */
export async function runMixes(container, context) {
  const models = document.createElement("article");
  models.className = "card donut-card";
  showLoading(models);
  container.replaceChildren(models);
  await drawModelMix(models, context).catch((error) => showError(models, error));
}

async function drawModelMix(place, context) {
  const orderRows = await context.orders.models;
  const rows = await readAnswer("explore/model_mix");
  const body = renderFigure(place, {
    title: "Model mix",
    caption: "Each model's share of the requests.",
    definition: "Requests over the whole trace, by the model they asked for. The eight models with most requests are "
      + "named, as the trends name them; the rest are Other.",
    rows: formatQuantity(columnTotal(rows, "requests"), "request", "requests"),
  });
  const colours = barColours(orderRows.map((row) => row.model));
  const legend = donutLegend(rows, colours, { nameColumn: "model", countColumn: "requests" });
  await drawWithLegend(body, legend, (hidden) => drawDonut(rows, body, { series: colours }, {
    nameColumn: "model",
    countColumn: "requests",
    unit: "requests",
    totalFormat: formatCompactCount, // a million requests is too wide for the centre written in full
  }, hidden));
}
