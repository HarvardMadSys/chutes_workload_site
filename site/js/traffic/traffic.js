/**
 * The Traffic Explorer: a row of controls (a family drop-down, a model drop-down, an endpoint drop-down, a metric
 * drop-down, period buttons) over one wide card of four tiles (`traffic/traffic_tiles.js`), the chosen metric per day
 * as stacked bars with their legend (`traffic/traffic_bars.js`) and under the bars the day range's slider
 * (`traffic/traffic_range.js`). The input tokens, output tokens and TTFT tiles hold the distributions of their values
 * (`traffic/traffic_tile_charts.js`), whose series the bars' legend hides and shows with the bars'.
 *
 * Its rows come from the `explore/daily_by_family` answer, read once, and from a family's
 * `explore/daily_by_model/<family_slug>` answer, read the first time the family is chosen and kept for the visit. The
 * families take their colours in the order of their requests, a family's models in the order of theirs, and the
 * endpoint groups from the Overview's order (`context.orders`). A change filters the rows once
 * (`traffic/traffic_filter.js`, which defines the choice) and draws the tiles and bars again; so does the slider as it
 * moves. Once the bars are drawn, the tiles' charts and percentiles are drawn from the histogram answer, read and
 * kept as the daily ones are. The controls keep the choice in the URL (`traffic/traffic_controls.js`).
 */

import { readAnswer } from "../shared/answers.js";
import { distinct, showError, showErrorNote, showLoading } from "../shared/charts.js";
import { drawBars } from "./traffic_bars.js";
import { mountTrafficControls } from "./traffic_controls.js";
import { choicePercentiles, histogramRowsInChoice } from "./traffic_distributions.js";
import {
  familyChoices, familyOrder, isSameChoice, modelChoices, modelOrder, rowsInChoice, trafficSummary,
} from "./traffic_filter.js";
import { mountRange } from "./traffic_range.js";
import { drawTileCharts, drawTileCurves, showChartsError, showChartsLoading } from "./traffic_tile_charts.js";
import { NO_PERCENTILES, placeTiles, renderTiles } from "./traffic_tiles.js";

// The answers the explorer draws from: one row per calendar day, family and endpoint group; and, per family, the
// folder of its rows per calendar day, model and endpoint group, each family's file named by its slug.
const FAMILY_QUERY = "explore/daily_by_family";
const FAMILY_MODELS_QUERY = "explore/daily_by_model";
// The histogram answers the distributions are drawn from: one row per trace week, family, endpoint group and metric;
// and, per family, the folder of its rows per trace week, model, endpoint group and metric, named by its slug.
const HISTOGRAMS_QUERY = "explore/histograms_by_family";
const FAMILY_HISTOGRAMS_QUERY = "explore/histograms_by_model";

/** Show the loading state in `container`, then draw the explorer into it from the daily answers, or the error. */
export async function runTraffic(container, context) {
  showLoading(container);
  await drawExplorer(container, context).catch((error) => showError(container, error));
}

async function drawExplorer(container, context) {
  const familyRows = await readAnswer(FAMILY_QUERY);
  const view = {
    familyRows,
    families: familyOrder(familyRows),
    familyAnswers: new Map(), // each family's answer, by its slug, from the first time the family is chosen
    histogramAnswers: new Map(), // each histogram answer, by its family's slug ("" for every family), once asked for
    endpoints: await context.orders.endpoints,
    days: distinct(familyRows.map((row) => row.day)),
    tiles: document.createElement("ul"),
    figure: document.createElement("div"),
    rangeRow: document.createElement("div"),
    chartPlaces: [], // the places of the input, output and TTFT tiles' charts, once the tiles are placed
    tileCharts: null, // the tiles' charts drawn last, which the legend draws again; null while they load
    hidden: new Set(), // the series the legend hides, kept while the choice keeps its family and model
    summary: null, // the tiles' numbers drawn last, which an error leaves without their percentiles
    sliders: null, // the sliders' `{ show }`, once placed
    choice: null, // the choice drawn last, which a slider's range joins as it moves
  };
  const row = document.createElement("div");
  row.className = "controls traffic-controls";
  // The controls are placed once they show the URL's choice: until its family's answer is read, the section loads.
  const entries = { families: familyChoices(view.families), days: view.days };
  const controls = await mountTrafficControls(row, entries, context, {
    modelsOf: async (family) => (await familyAnswerShowingLoading(view, family)).models,
    onChange: (chosen) => showChoice(view, chosen),
    onError: (error) => showError(view.figure, error),
  });
  view.choice = controls.choice;
  view.sliders = mountRange(view.rangeRow, view.days, controls.choice, {
    onInput: (range) => drawChange(view, { ...view.choice, ...range }),
    onChange: controls.chooseRange,
  });
  container.replaceChildren(row, explorerCard(view));
  if (controls.error !== null) {
    showChoiceError(view, controls.error);
    return;
  }
  await drawChoice(view, controls.choice);
}

// The answer of the family whose slug is `family`, as `familyAnswer` gives it, the chart showing the loading state
// while a family not read before is read.
function familyAnswerShowingLoading(view, family) {
  if (!view.familyAnswers.has(family)) {
    showLoading(view.figure);
  }
  return familyAnswer(view, family);
}

/**
 * The answer of the family whose slug is `family`: the promised `{ name, rows, models }`, its name, its rows of
 * `explore/daily_by_model` and its model drop-down's entries; read the first time it is asked for and kept.
 */
function familyAnswer(view, family) {
  return keptRead(view.familyAnswers, family, () => readFamilyAnswer(view, family));
}

/**
 * The histogram answer of the family whose slug is `family` ("" for every family): the promised rows of
 * `explore/histograms_by_family`, or of the family's `explore/histograms_by_model/<family_slug>`; read the first time
 * it is asked for and kept.
 */
function histogramAnswer(view, family) {
  const query = family === "" ? HISTOGRAMS_QUERY : `${FAMILY_HISTOGRAMS_QUERY}/${family}`;
  return keptRead(view.histogramAnswers, family, () => readAnswer(query));
}

// The promise `kept` holds under `key`, else the promise `read()` gives, kept there for the visit. A failed read is
// not kept, so that asking again reads again.
function keptRead(kept, key, read) {
  if (!kept.has(key)) {
    const answer = read();
    answer.catch(() => kept.delete(key));
    kept.set(key, answer);
  }
  return kept.get(key);
}

async function readFamilyAnswer(view, family) {
  const rows = await readAnswer(`${FAMILY_MODELS_QUERY}/${family}`);
  const name = view.families.find((entry) => entry.family_slug === family).family;
  return { name, rows, models: modelChoices(rows, name) };
}

// The wide card: the tiles, with their charts' places, above the figure, and the day range's slider under it.
function explorerCard(view) {
  const card = document.createElement("article");
  card.className = "card traffic-card";
  view.tiles.className = "traffic-tiles";
  view.tiles.setAttribute("aria-label", "The chosen requests in numbers");
  view.figure.className = "traffic-bars";
  view.rangeRow.className = "traffic-range";
  view.chartPlaces = placeTiles(view.tiles);
  card.append(view.tiles, view.figure, view.rangeRow);
  return card;
}

// The controls chose `choice`: stand the sliders on its range and draw it.
function showChoice(view, choice) {
  view.sliders.show(choice);
  drawChange(view, choice);
}

// Draw the tiles and the bars again for a new `choice`.
function drawChange(view, choice) {
  // No one awaits a change, so a failed drawing shows its error in the places it drew into.
  drawChoice(view, choice).catch((error) => showChoiceError(view, error));
}

// The choice could not be drawn: `error` in the bars' place and in each tile chart's, logged once, and the tiles drawn
// last left without percentile notes, so nothing keeps loading or shows an earlier choice.
function showChoiceError(view, error) {
  view.tileCharts = null;
  showErrorNote(view.figure, error);
  showChartsError(view.chartPlaces, error);
  if (view.summary !== null) {
    renderTiles(view.tiles, view.summary, NO_PERCENTILES);
  }
}

// Filter the rows of the choice's answer once for `choice`, then draw the tiles and the bars from what it keeps, and
// once the bars are drawn the distributions. A choice of another family or model draws other series, so the legend
// shows every series again.
async function drawChoice(view, choice) {
  if (choice.family !== view.choice.family || choice.model !== view.choice.model) {
    view.hidden = new Set();
  }
  view.choice = choice;
  const family = choice.family === "" ? null : await familyAnswer(view, choice.family);
  const chosen = rowsInChoice(family === null ? view.familyRows : family.rows, choice);
  const summary = trafficSummary(chosen);
  view.summary = summary;
  renderTiles(view.tiles, summary, null);
  // The order each kind of series takes its colours in: the families', the family's models' and the Overview's.
  const orders = {
    families: view.families,
    models: family === null ? [] : modelOrder(family.rows),
    endpoints: view.endpoints,
  };
  const bars = { choice, family, chosen, requests: summary.requests, days: view.days, orders };
  const shared = { hidden: view.hidden, onToggle: (hidden) => followLegend(view, hidden) };
  const drawn = await drawBars(view.figure, bars, shared);
  await drawDistributions(view, choice, { ...drawn, summary });
}

// The tiles' charts and percentiles of `choice`, once its bars are `drawn` (`{ series, legend, summary }`), from its
// histogram answer, the charts loading while it is read. A choice the explorer has moved on from, before or while the
// answer is read, touches nothing; a failed read shows its error in the charts and leaves the tiles without
// percentiles.
async function drawDistributions(view, choice, drawn) {
  if (!isSameChoice(view.choice, choice)) {
    return;
  }
  view.tileCharts = null;
  showChartsLoading(view.chartPlaces);
  try {
    const answer = await histogramAnswer(view, choice.family);
    if (isSameChoice(view.choice, choice)) {
      await drawHistograms(view, choice, drawn, answer);
    }
  } catch (error) {
    if (isSameChoice(view.choice, choice)) {
      showChartsError(view.chartPlaces, error);
      renderTiles(view.tiles, drawn.summary, NO_PERCENTILES);
    }
  }
}

// Draw the tiles' percentiles and charts of `choice` from `answer`, the rows of its histogram answer.
async function drawHistograms(view, choice, drawn, answer) {
  const rows = histogramRowsInChoice(answer, choice);
  renderTiles(view.tiles, drawn.summary, choicePercentiles(rows));
  const distributions = { rows, series: drawn.series, legend: drawn.legend };
  const tileCharts = await drawTileCharts(view.chartPlaces, distributions, view.hidden);
  if (isSameChoice(view.choice, choice)) {
    view.tileCharts = tileCharts;
  }
}

// The legend hid or showed a series: keep its `hidden` set for the choices that follow, and draw the tiles' charts'
// lines again where they are drawn.
function followLegend(view, hidden) {
  view.hidden = hidden;
  if (view.tileCharts !== null) {
    drawTileCurves(view.tileCharts, hidden);
  }
}
