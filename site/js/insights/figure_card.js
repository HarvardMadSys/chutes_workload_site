/**
 * A card of the Insights: one of the paper's figures, drawn by the site from the figure's answer, its plot-ready rows.
 * A card is `{ figure, title, insight, caption, definition, source, kind, chart, panels?, legend?, series?, palette?,
 * isWide? }` (`insights/figure_sections.js` lists the topics, each card made by `frozenCard`): `figure` the figure's
 * name, its answer being `data/all/figures/<figure>.json`; `kind` the chart kind that draws it, a key of
 * `CHART_KINDS`; `chart` the parameters handed to the kind's draw function (`js/charts/<kind>.js` says what each
 * decides); `panels`, for a figure of several panels, `[{ panel, title, chart }]`, one chart per entry drawn from the
 * rows whose `panel` column is `panel`, under its title, with the card's `chart` and then the entry's own as its
 * parameters; `legend`, the name of a legend answer, rows `{ series, rank }`, whose order the card's series take;
 * `series`, the names of the series drawn, in the order they are drawn and listed, the answer's others left out (the
 * stacked bars fold them into "Other"); `palette`, the colours its series take, a key of `PALETTES`, "series" when
 * not given; `source` the address of the artifact's README, or folder, that says how the figure is computed; `isWide`
 * true for a card that takes its topic's width.
 *
 * A card's words are placed at once (`renderFigureCard`), its chart only when its topic is first shown
 * (`drawFigureChart`), with a legend of buttons above it where it has more than one series.
 */

import { distinct, nameChart, renderFigure, showError, showLoading } from "../shared/charts.js";
import { readAnswer } from "../shared/answers.js";
import { URLS } from "../shared/layout.js";
import { endpointFigureColours, figureColours, SERIES_COLUMN, seriesLegend } from "../shared/series.js";
import { FAMILY_SLOTS, SERIES_SLOTS } from "../theme/colours.js";
import { drawBands } from "../charts/bands.js";
import { drawBars } from "../charts/bars.js";
import { drawBoxes } from "../charts/boxes.js";
import { drawCells } from "../charts/cells.js";
import { drawLines } from "../charts/lines.js";
import { drawRaster } from "../charts/raster.js";
import { drawScatter } from "../charts/scatter.js";
import { drawStackedBars } from "../charts/stacked_bars.js";
import { drawWithLegend } from "../explore/legend.js";

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

/**
 * The colours a card's series may take, by the card's `palette`, each a function of the series' names, in order, the
 * card's series labels and the rows of `explore/endpoint_mix`, to a Map from name to colour: "series", the eight
 * series slots; "families", the ten of the families, for a card of more series than eight; "endpoints", the endpoint
 * groups' colours as the Overview's, for series that are endpoint groups written by their labels.
 */
export const PALETTES = Object.freeze({
  series: (names) => figureColours(names, SERIES_SLOTS),
  families: (names) => figureColours(names, FAMILY_SLOTS),
  endpoints: (names, labels, endpointMixRows) => endpointFigureColours(names, labels, endpointMixRows),
});

/**
 * A card's colours for a count, of models, users, requests or instances, as the paper shades one: viridis on a log
 * scale, from a quarter of the way along it, since its first colour, a near-black purple, vanishes into the dark
 * scheme's card. A card spreads it into its `chart`.
 */
export const COUNT_COLOUR = Object.freeze({ scheme: "viridis", schemeStart: 0.25, colourLog: true });

/**
 * The trace's months an axis of its months 1 to 13 labels: every third from the first, as the paper labels them;
 * all thirteen run together on a phone.
 */
export const TRACE_MONTH_TICKS = Object.freeze([1, 4, 7, 10, 13]);

/** A card's x axis of the trace's months, 1 to 13, the first being April 2025's. */
export const TRACE_MONTH_AXIS = Object.freeze({
  label: "Trace month (1 = April 2025)", ticks: TRACE_MONTH_TICKS, tickFormat: String,
});

// The palette of a card that names none.
const DEFAULT_PALETTE = "series";

// The palette of the endpoint groups, whose card reads their colour order, the answer `ENDPOINT_ORDER`.
const ENDPOINT_PALETTE = "endpoints";
const ENDPOINT_ORDER = "explore/endpoint_mix";

// The folder of the figure answers, under the answers' folder: the figure `name`'s answer is `figures/<name>`.
const FIGURE_ANSWERS = "figures/";

// The folder of the plot-ready tables in the artifact, from its root.
const PLOTDATA_FOLDER = "data/paper/plotdata/";

// The text of the link, behind a card's Definition control, to the plot-ready table its chart is drawn from.
const PLOTDATA_LINK_TEXT = "The plot-ready table · ";

// The text of the link, behind a card's Definition control, to the artifact's README or folder of its figure.
const SOURCE_LINK_TEXT = "How it is computed · the artifact on GitHub";

// Between the two links of a card's Definition control.
const LINK_SEPARATOR = " — ";

/** The element of `card`: an empty `<article>` of the class `card`, and `is-wide` for a wide card. */
export function newCardElement(card) {
  const element = document.createElement("article");
  element.className = card.isWide === true ? "card is-wide" : "card";
  return element;
}

/**
 * Fill `container` with `card`'s words, as every figure card is laid out (`renderFigure` of `shared/charts.js`), and
 * return its body, the place of its chart, showing the loading state. Its Definition control opens on the definition
 * and a line of two links: the figure's plot-ready table in the artifact and the artifact's account of the figure.
 */
export function renderFigureCard(container, card) {
  const body = renderFigure(container, {
    title: card.title,
    insight: card.insight,
    caption: card.caption,
    definition: card.definition,
  });
  const plotdata = newLink(plotdataAddress(card.figure), PLOTDATA_LINK_TEXT);
  const path = document.createElement("code");
  path.textContent = plotdataPath(card.figure);
  plotdata.append(path);
  const links = [plotdata, LINK_SEPARATOR, newLink(card.source, SOURCE_LINK_TEXT)];
  container.querySelector(".figure-rows").replaceChildren(...links);
  showLoading(body);
  return body;
}

/** The path of the figure `figure`'s plot-ready table in the artifact: `data/paper/plotdata/<figure>.parquet`. */
export function plotdataPath(figure) {
  return `${PLOTDATA_FOLDER}${figure}.parquet`;
}

/** The address of the figure `figure`'s plot-ready table in the artifact on GitHub. */
export function plotdataAddress(figure) {
  return `${URLS.code}/blob/main/${plotdataPath(figure)}`;
}

/**
 * Read `card`'s answer, its legend answer where it names one and the endpoint groups' order where its palette is
 * theirs, and draw its chart into `body` by its kind, with a legend of buttons above it where its rows hold more than
 * one series; each click redraws the chart from the rows already read. An answer that cannot be read, or a chart that fails to draw, shows its error in `body`.
 */
export async function drawFigureChart(body, card) {
  try {
    const answers = [readAnswer(`${FIGURE_ANSWERS}${card.figure}`), legendAnswer(card), endpointOrder(card)];
    const [rows, legendRows, endpointMixRows] = await Promise.all(answers);
    const colours = cardColours(card, rows, legendRows, endpointMixRows);
    const legend = seriesLegend(rows, SERIES_COLUMN, colours, card.chart.labels);
    const drawChart = (hidden) => drawFigure(rows, body, card, { series: colours }, hidden);
    await drawWithLegend(body, legend, drawChart, CHART_KINDS[card.kind].swatch);
  } catch (error) {
    showError(body, error);
  }
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
 * `entry` of the card's `panels`, the entry's own `chart` and its `panel`.
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

// The rows of `explore/endpoint_mix`, the endpoint groups' colour order, for a card of their palette; else null.
async function endpointOrder(card) {
  return card.palette === ENDPOINT_PALETTE ? readAnswer(ENDPOINT_ORDER) : null;
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

// A link to `address` reading `text`, opened in a new tab.
function newLink(address, text) {
  const link = document.createElement("a");
  link.href = address;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = text;
  return link;
}
