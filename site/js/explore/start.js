/**
 * The Explore page's start: it places the Insights' groups and cards and draws their topic tabs, draws the header and
 * the footer, then runs the page's sections, once, from their answer files. The topics (`explore/figure_sections.js`)
 * are shown one at a time behind the tabs of the `#topic-tabs` row (`explore/topic_tabs.js`); a topic's figures are
 * drawn from their answers the first time it is shown, so a topic never shown requests none. The topic the page opens
 * on is drawn once the sections have drawn or shown their errors; a topic a tab shows before then is drawn at once.
 *
 * The page's module names its sections, each `{ id, run }`: the id of its place in `index.html` and the function that
 * runs it, which shows its loading state at once and then draws its answer. A section runs as `run(container,
 * context)` with `context = { totals, orders, replaceQuery, onReturn }`:
 * - `totals`, the promised rows of `explore/trace_totals`, one row of the whole trace's counts, asked for once for the
 *   stats strip and the months the hero and the footer count;
 * - `orders`, `{ families, endpoints }`, the promised rows of `explore/family_mix` and of `explore/endpoint_mix`, each
 *   most requested first: the donuts' rows and colour orders, and the order every chart colours the endpoint groups
 *   by, each asked for once;
 * - `replaceQuery(params)`, which writes `params` to the address bar and the header's brand;
 * - `onReturn(redraw)`, which calls `redraw()` each time Back or Forward returns to a history entry, after the tabs
 *   show its topic and the header takes its query; this module is the page's one listener of `popstate`.
 */

import { readAnswer } from "../shared/answers.js";
import { textElement } from "../shared/charts.js";
import { mountHeader, renderFooter, queryString } from "../shared/layout.js";
import { drawFigureChart, newCardElement, renderFigureCard } from "../insights/figure_card.js";
import { FIGURE_SECTIONS } from "./figure_sections.js";
import { mountTopicTabs } from "./topic_tabs.js";

/**
 * Start the Explore page: draw its topic tabs, header and footer and its `sections`, and call `showMonthCount` with the
 * number of months the trace spans, null until the trace totals give it; once the sections have drawn, draw the shown
 * topic's figures. Settles once the sections have drawn.
 */
export async function startPage({ sections, showMonthCount }) {
  const insights = mountInsights();
  const pageHistory = followHistory(insights.showEntryTopic);
  renderFooter(document.querySelector("#site-footer"), null);
  showMonthCount(null);
  renderPageHeader();
  const context = sectionContext(pageHistory);
  await Promise.all([showMonths(context.totals, showMonthCount), runEverySection(sections, context)]);
  // The shown topic's figures wait for the sections, so that the explorer's answers, the page's largest, have the
  // line to themselves first: the topic is below the fold.
  insights.drawShown();
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
 * Write each topic's takeaway and place its groups and their cards, each card's chart loading, then draw the topic
 * tabs; return `{ showEntryTopic, drawShown }`, the tabs' `showEntryTopic` and `drawShown()`, which draws the charts of
 * the topic shown now the first time it is shown (`drawShownTopic`). A tab, a key, Back or Forward calls `drawShown`
 * as it shows a topic; the topic shown on opening waits for the page to call it.
 */
function mountInsights() {
  const topics = FIGURE_SECTIONS.map(placeTopic);
  const drawnSections = new Set();
  const drawShown = () => drawShownTopic(topics, drawnSections);
  const showEntryTopic = mountTopicTabs(document.querySelector("#topic-tabs"), FIGURE_SECTIONS, drawShown);
  return { showEntryTopic, drawShown };
}

/**
 * Write `topic`'s takeaway under its heading, then, for each of its groups in order, the group's heading, its takeaway
 * and a grid of its cards, each card with its words and its chart's place loading; return `{ section, cards }`, its
 * section element and every card of its groups, each `{ card, body }`. The section holds its heading alone until
 * then, so each part is appended after it.
 */
export function placeTopic(topic) {
  const section = document.querySelector(topic.selector);
  section.append(textElement("p", "topic-takeaway", topic.takeaway));
  const cards = [];
  for (const group of topic.groups) {
    cards.push(...placeGroup(section, group));
  }
  return { section, cards };
}

/**
 * Append `group` to `section`: its heading, an `h3` under the topic's `h2`, its takeaway, and a grid of its cards, each
 * card's title an `h4` under the group's heading; return its cards, each `{ card, body }`, the body its chart's place.
 */
function placeGroup(section, group) {
  const grid = document.createElement("div");
  grid.className = "card-grid";
  const heading = textElement("h3", "figure-group-title", group.heading);
  section.append(heading, textElement("p", "figure-group-takeaway", group.takeaway), grid);
  const cards = [];
  for (const card of group.cards) {
    const element = newCardElement(card);
    grid.append(element);
    cards.push({ card, body: renderFigureCard(element, card) });
  }
  return cards;
}

/**
 * Draw the charts of every card of every group of the topic of `topics` shown now (each `{ section, cards }`, as
 * `placeTopic` returns it), unless `drawnSections` holds its section, which it then does; each card reads its answer
 * and shows its own error where it cannot.
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
  const orders = { families: promisedRows("explore/family_mix"), endpoints: promisedRows("explore/endpoint_mix") };
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
