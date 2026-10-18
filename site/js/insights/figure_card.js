/**
 * A card of the Insights: one of the paper's figures, drawn by the site from the figure's answer, its plot-ready rows.
 * A card is `{ figure, title, insight, caption, definition, kind, chart, panels?, legend?, series?, palette?,
 * isWide? }` (`page/topics.js` lists the topics, each card made by `frozenCard`): `figure` the figure's
 * name, its answer being `data/all/figures/<figure>.json`; `kind` the chart kind that draws it, a key of `CHART_KINDS`;
 * `chart` the parameters handed to the kind's draw function (`js/charts/<kind>.js` says what each decides); `panels`,
 * for a figure of several panels, `[{ panel, title, chart }]`, one chart per entry drawn from the rows whose `panel`
 * column is `panel`, under its title, with the card's `chart` and then the entry's own as its parameters (the card has
 * one legend for all its panels, so only the card's `chart.labels` relabel the legend; a panel's own relabel only its
 * tooltips; and a panel's `chart.series`, the names of the series it draws, leaves the others to the other panels
 * while the legend lists them all); `legend`, the name of a legend answer, rows `{ series, rank }`, whose order the
 * card's series take; `series`, the names of the series drawn, in the order they are drawn and listed, the answer's
 * others left out (the stacked bars fold them into "Other"); `palette`, the colours its series take, a key of
 * `PALETTES` of `insights/card_series.js`, "series" when not given; `isWide` true for a card that takes its group's
 * width.
 *
 * A card's words are placed at once (`renderFigureCard`), its chart only when its topic is first shown
 * (`drawFigureChart`), with a legend of buttons above it where it has more than one series, or, for the bands kind,
 * the key to its bands.
 */

import { legendPlace, nameChart, renderFigure, showError, showLoading } from "../shared/figure.js";
import { readAnswer } from "../shared/answers.js";
import { SERIES_COLUMN } from "../shared/series.js";
import { bandKey, bandsColour, drawBands } from "../charts/bands.js";
import { drawBars } from "../charts/bars.js";
import { drawBoxes } from "../charts/boxes.js";
import { drawCells } from "../charts/cells.js";
import { drawLines } from "../charts/lines.js";
import { drawRaster } from "../charts/raster.js";
import { drawScatter } from "../charts/scatter.js";
import { drawStackedBars } from "../charts/stacked_bars.js";
import { drawWithLegend } from "../shared/legend.js";
import { cardColours, ENDPOINT_PALETTE, figureLegend } from "./card_series.js";

/**
 * The chart kinds a card may name, each `{ draw, swatch, parameters }`: the function that draws it, the shape of its
 * legend's swatches ("line" or "square"), and the parameters every figure answer of the kind takes, which a card's
 * `chart` adds to. A CDF is drawn by the lines kind; a stacked-bars answer names its columns `x`, `series`, `value`.
 */
export const CHART_KINDS = Object.freeze({
  lines: Object.freeze({ draw: drawLines, swatch: "line", parameters: Object.freeze({}) }),
  cdf: Object.freeze({ draw: drawLines, swatch: "line", parameters: Object.freeze({ cdf: true }) }),
  bands: Object.freeze({ draw: drawBands, swatch: "line", parameters: Object.freeze({}) }),
  cells: Object.freeze({ draw: drawCells, swatch: "square", parameters: Object.freeze({}) }),
  raster: Object.freeze({ draw: drawRaster, swatch: "square", parameters: Object.freeze({}) }),
  scatter: Object.freeze({ draw: drawScatter, swatch: "square", parameters: Object.freeze({}) }),
  boxes: Object.freeze({ draw: drawBoxes, swatch: "square", parameters: Object.freeze({}) }),
  bars: Object.freeze({ draw: drawBars, swatch: "square", parameters: Object.freeze({}) }),
  stacked_bars: Object.freeze({
    draw: drawStackedBars,
    swatch: "square",
    parameters: Object.freeze({ xColumn: "x", seriesColumn: SERIES_COLUMN, valueColumn: "value" }),
  }),
});

// The kind whose card shows the key to its bands (`bandKey` of `charts/bands.js`) in place of a legend of buttons.
const BANDS_KIND = "bands";

// The folder of the figure answers, under the answers' folder: the figure `name`'s answer is `figures/<name>`.
const FIGURE_ANSWERS = "figures/";

/**
 * The element of `card`: an empty `<article>` of the class `card`, and `is-wide` for a wide card, whose `data-figure`
 * attribute names the card's figure.
 */
export function newCardElement(card) {
  const element = document.createElement("article");
  element.className = card.isWide === true ? "card is-wide" : "card";
  element.dataset.figure = card.figure;
  return element;
}

/**
 * Fill `place` with `card`'s words, as every figure card is laid out (`renderFigure` of `shared/figure.js`), its
 * title an `h4` under its group's `h3`, and return its body, the place of its chart, showing the loading state. Its
 * Definition control opens on the definition alone.
 */
export function renderFigureCard(place, card) {
  const body = renderFigure(place, {
    title: card.title,
    insight: card.insight,
    caption: card.caption,
    definition: card.definition,
    heading: "h4",
  });
  showLoading(body);
  return body;
}

/**
 * Read `card`'s answer and its legend answer where it names one, and draw its chart into `body` by its kind: a bands
 * card with its key above it (`bandKey`), any other with a legend of buttons above it where its rows hold more than
 * one series, each click redrawing the chart from the rows already read. A card whose palette is the endpoint groups'
 * takes their colour order from `mixes.endpoints`, the page's promised rows of the endpoint mix (`page/start.js`). An
 * answer that cannot be read, or a chart that fails to draw, shows its error in `body`.
 */
export async function drawFigureChart(body, card, mixes) {
  try {
    const endpointMix = card.palette === ENDPOINT_PALETTE ? mixes.endpoints : null;
    const answers = [readAnswer(`${FIGURE_ANSWERS}${card.figure}`), legendAnswer(card), endpointMix];
    const [rows, legendRows, endpointMixRows] = await Promise.all(answers);
    const colours = cardColours(card, rows, legendRows, endpointMixRows);
    if (card.kind === BANDS_KIND) {
      // A bands chart has one series, so no buttons; its key names what its two bands and its line are.
      legendPlace(body).replaceChildren(bandKey(bandsColour(chartParameters(card))));
      await drawFigure(rows, body, card, { series: colours }, new Set());
      return;
    }
    const legend = figureLegend(card, rows, colours);
    const drawChart = (hidden) => drawFigure(rows, body, card, { series: colours }, hidden);
    await drawWithLegend(body, legend, drawChart, CHART_KINDS[card.kind].swatch);
  } catch (error) {
    showError(body, error);
  }
}

/**
 * A card as a topic lists it: `card`, frozen with every object and list it holds (its `chart` and their axes, its
 * `panels` and theirs), so no reader can change a card another reads. Functions, such as a tick format, are left as
 * they are.
 */
export function frozenCard(card) {
  return deepFrozen(card);
}

/**
 * The parameters the chart of `card` is drawn with: those of its kind, then the card's `chart`, then, for a panel
 * `entry` of the card's `panels`, the entry's own `chart` (its `series` among them, where it draws only those) and its
 * `panel`.
 */
export function chartParameters(card, entry = null) {
  const parameters = { ...CHART_KINDS[card.kind].parameters, ...card.chart };
  if (entry === null) {
    return parameters;
  }
  return { ...parameters, ...entry.chart, panel: entry.panel };
}

// `value` frozen, and every object or list it holds, all the way down; a function or a plain value as it is.
function deepFrozen(value) {
  if (typeof value !== "object" || value === null) {
    return value;
  }
  for (const part of Object.values(value)) {
    deepFrozen(part);
  }
  return Object.freeze(value);
}

// The rows of the legend answer `card` names, or null where it names none.
async function legendAnswer(card) {
  if (card.legend === undefined) {
    return null;
  }
  return readAnswer(`${FIGURE_ANSWERS}${card.legend}`);
}

// Draw the chart of `card` into `body`, or one chart per panel under the panels' titles, of the series not in
// `hidden`, then name it for a screen reader.
async function drawFigure(rows, body, card, colours, hidden) {
  const { draw } = CHART_KINDS[card.kind];
  if (card.panels === undefined) {
    await draw(rows, body, colours, chartParameters(card), hidden);
  } else {
    const places = placePanels(body, card.panels);
    for (const [index, entry] of card.panels.entries()) {
      await draw(rows, places[index], colours, chartParameters(card, entry), hidden);
    }
  }
  nameChart(body);
}

// Fill `body` with one place per panel of `panels`, each under its title; return the places, in order.
function placePanels(body, panels) {
  const grid = document.createElement("div");
  grid.className = "chart-panels";
  const places = [];
  for (const entry of panels) {
    const title = document.createElement("p");
    title.className = "chart-panel-title";
    title.textContent = entry.title;
    const place = document.createElement("div");
    place.className = "chart-panel-body";
    const panel = document.createElement("div");
    panel.className = "chart-panel";
    panel.append(title, place);
    grid.append(panel);
    places.push(place);
  }
  body.replaceChildren(grid);
  return places;
}
