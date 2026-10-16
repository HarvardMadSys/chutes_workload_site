/**
 * The Explore page's start: it places the Insights' cards and draws their topic tabs, draws the header and the footer,
 * then runs the page's sections, once, from their answer files. The topics (`insights/figure_sections.js`) are shown
 * one at a time behind the tabs of the `#topic-tabs` row (`explore/topic_tabs.js`); a topic's figures are drawn from
 * their answers the first time it is shown, so a topic never shown requests none.
 *
 * The page's module names its sections, each `{ id, run }`: the id of its place in `index.html` and the function that
 * runs it, which shows its loading state at once and then draws its answer. A section runs as `run(container,
 * context)` with `context = { totals, orders, replaceQuery, onReturn }`:
 * - `totals`, the promised rows of `explore/trace_totals`, one row of the whole trace's counts, asked for once for the
 *   stats strip and the months the hero and the footer count;
 * - `orders`, `{ models, endpoints }`, the promised rows of `explore/model_mix` and of `explore/endpoint_mix`, each most
 *   requested first: the orders every chart colours the models and the endpoint groups by, and the donuts' rows,
 *   each asked for once;
 * - `replaceQuery(params)`, which writes `params` to the address bar and the header's brand;
 * - `onReturn(redraw)`, which calls `redraw()` each time Back or Forward returns to a history entry, after the tabs
 *   show its topic and the header takes its query; this module is the page's one listener of `popstate`.
 */

import { readAnswer } from "../shared/answers.js";
import { mountHeader, renderFooter, queryString } from "../shared/layout.js";
import { drawFigureChart, newCardElement, renderFigureCard } from "../insights/figure_card.js";
import { FIGURE_SECTIONS } from "../insights/figure_sections.js";
import { mountTopicTabs } from "./topic_tabs.js";

/**
 * Start the Explore page: draw its topic tabs, header and footer and its `sections`, and call `showMonthCount` with the
 * number of months the trace spans, null until the trace totals give it. Settles once the sections have drawn.
 */
export async function startPage({ sections, showMonthCount }) {
  const pageHistory = followHistory(mountInsights());
  renderFooter(document.querySelector("#site-footer"), null);
  showMonthCount(null);
  renderPageHeader();
  const context = sectionContext(pageHistory);
  await Promise.all([showMonths(context.totals, showMonthCount), runEverySection(sections, context)]);
  scrollToAnchor();
}

/**
 * Follow the browser's history, as the page's one listener of `popstate`: on Back or Forward, show the topic of the
 * entry returned to (`showEntryTopic(state)`, as `mountTopicTabs` returns it), draw the header again from the entry's
 * query, then call each `redraw` given to `onReturn`. Returns `{ replaceQuery, onReturn }`, the sections' part of the
 * history (see the module's comment).
 */
export function followHistory(showEntryTopic) {
  const redraws = [];
  window.addEventListener("popstate", (event) => returnToEntry(event.state, showEntryTopic, redraws));
  return { replaceQuery, onReturn: (redraw) => redraws.push(redraw) };
}

/**
 * Write each topic's takeaway and place its cards, each card's chart loading, then draw the topic tabs; return the
 * tabs' `showEntryTopic`. A topic's charts are drawn the first time it is shown (`drawShownTopic`).
 */
function mountInsights() {
  const topics = FIGURE_SECTIONS.map(placeTopic);
  const drawnSections = new Set();
  const drawShown = () => drawShownTopic(topics, drawnSections);
  return mountTopicTabs(document.querySelector("#topic-tabs"), FIGURE_SECTIONS, drawShown);
}

/**
 * Write `topic`'s takeaway under its heading and place its cards in its grid, each with its words and its chart's place
 * loading; return `{ section, cards }`, its section element and its cards, each `{ card, body }`.
 */
function placeTopic(topic) {
  const section = document.querySelector(topic.selector);
  const takeaway = document.createElement("p");
  takeaway.className = "topic-takeaway";
  takeaway.textContent = topic.takeaway;
  section.querySelector("h2").after(takeaway);
  const grid = section.querySelector(".card-grid");
  const cards = [];
  for (const card of topic.cards) {
    const element = newCardElement(card);
    grid.append(element);
    cards.push({ card, body: renderFigureCard(element, card) });
  }
  return { section, cards };
}

/**
 * Draw the charts of the topic of `topics` shown now, unless `drawnSections` holds its section, which it then does;
 * each card reads its answer and shows its own error where it cannot.
 */
function drawShownTopic(topics, drawnSections) {
  const shown = topics.find((topic) => !topic.section.hidden);
  if (drawnSections.has(shown.section)) {
    return;
  }
  drawnSections.add(shown.section);
  for (const { card, body } of shown.cards) {
    drawFigureChart(body, card);
  }
}

/** What every section is given, `pageHistory` being `followHistory`'s; see the module's comment. */
function sectionContext(pageHistory) {
  const totals = promisedRows("explore/trace_totals");
  const orders = { models: promisedRows("explore/model_mix"), endpoints: promisedRows("explore/endpoint_mix") };
  return { totals, orders, replaceQuery: pageHistory.replaceQuery, onReturn: pageHistory.onReturn };
}

/**
 * Once the trace totals are read, count their months in the footer and, through `showMonthCount`, in the hero. Totals
 * that cannot be read leave both without the count; the stats strip shows the error.
 */
async function showMonths(totals, showMonthCount) {
  const rows = await totals.catch(() => null);
  if (rows === null) {
    return;
  }
  const monthCount = rows[0].months;
  renderFooter(document.querySelector("#site-footer"), monthCount);
  showMonthCount(monthCount);
}

/** The promised rows of the query `name`, asked for once for every section that reads them. */
function promisedRows(name) {
  const rows = readAnswer(name);
  // Each section that awaits the rows shows a failure in its own place, not here.
  rows.catch(() => undefined);
  return rows;
}

/** Run the sections, each showing its own loading state. */
async function runEverySection(sections, context) {
  await Promise.all(sections.map((section) => section.run(sectionElement(section), context)));
}

/**
 * Bring the section the URL's anchor names, such as `#cite`, into view: the browser looked for it while the sections
 * were still empty, so the page was too short to scroll to it. The anchor of a topic brings the section holding the
 * topics into view, so that the heading and the tabs above the topic are seen.
 */
function scrollToAnchor() {
  const target = document.getElementById(window.location.hash.slice(1));
  if (window.location.hash === "" || target === null) {
    return;
  }
  const isTopic = FIGURE_SECTIONS.some((section) => section.selector === window.location.hash);
  const scrolled = isTopic ? target.parentElement : target;
  scrolled.scrollIntoView();
}

/**
 * Write `params` to the address bar, as `queryString` writes them, keeping its anchor, without reloading the page;
 * then redraw the header, whose brand carries them.
 */
function replaceQuery(params) {
  const { pathname, hash } = window.location;
  // The entry keeps its state, the Insights' shown topic, which Back to it shows again.
  window.history.replaceState(window.history.state, "", `${pathname}${queryString(params)}${hash}`);
  renderPageHeader();
}

// Back or Forward to the entry whose state is `state`: its topic, the header from its query, each section's redraw.
function returnToEntry(state, showEntryTopic, redraws) {
  showEntryTopic(state);
  renderPageHeader();
  for (const redraw of redraws) {
    redraw();
  }
}

function renderPageHeader() {
  // The header is given every key of the URL, as its brand carries them.
  mountHeader(document.querySelector("#site-header"), new URLSearchParams(window.location.search));
}

function sectionElement(section) {
  return document.querySelector(`#${section.id}`);
}
