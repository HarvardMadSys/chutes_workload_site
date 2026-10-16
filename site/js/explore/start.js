/**
 * The Explore page's start: it draws the Insights' topic tabs, draws the header and the footer, then runs the page's
 * sections, once, from their answer files. The topics are shown one at a time behind the tabs of the `#topic-tabs`
 * row (`explore/topic_tabs.js`).
 *
 * The page's module names its sections, each `{ id, run }`: the id of its place in `index.html` and the function that
 * runs it, which shows its loading state at once and then draws its answer. A section runs as `run(container,
 * context)` with `context = { orders, replaceQuery }`:
 * - `orders`, `{ models }`, the promised rows of `explore/model_mix`, the models most requested first, the order every
 *   chart colours them by, asked for once;
 * - `replaceQuery(params)`, which writes `params` to the address bar and the header's links.
 */

import { readAnswer } from "../shared/answers.js";
import { EXPLORE_FILE, mountHeader, renderFooter, queryString } from "../shared/layout.js";
import { mountTopicTabs } from "./topic_tabs.js";

// The Insights' topics, each by the selector of its section in `index.html`, in the order of their tabs.
const TOPIC_SECTIONS = Object.freeze([
  Object.freeze({ selector: "#insights-overview" }),
  Object.freeze({ selector: "#insights-tokens" }),
  Object.freeze({ selector: "#insights-users" }),
  Object.freeze({ selector: "#insights-evolution" }),
  Object.freeze({ selector: "#insights-caching" }),
  Object.freeze({ selector: "#insights-balancing" }),
]);

/**
 * Start the Explore page: draw its topic tabs, header and footer and its `sections`, and call `showMonthCount` with the
 * number of months the trace spans, null while no answer gives it. Settles once the sections have drawn.
 */
export async function startPage({ sections, showMonthCount }) {
  // The topics hold nothing that is drawn when a topic is shown.
  mountTopicTabs(document.querySelector("#topic-tabs"), TOPIC_SECTIONS, () => undefined);
  renderFooter(document.querySelector("#site-footer"), EXPLORE_FILE, new URLSearchParams(), null);
  showMonthCount(null);
  renderPageHeader();
  await runEverySection(sections, sectionContext());
  scrollToAnchor();
}

/** What every section is given; see the module's comment. */
function sectionContext() {
  const orders = { models: promisedRows("explore/model_mix") };
  return { orders, replaceQuery };
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
  const isTopic = TOPIC_SECTIONS.some((section) => section.selector === window.location.hash);
  const scrolled = isTopic ? target.parentElement : target;
  scrolled.scrollIntoView();
}

/**
 * Write `params` to the address bar, as `queryString` writes them, keeping its anchor, without reloading the page;
 * then redraw the header, whose links carry them.
 */
function replaceQuery(params) {
  const { pathname, hash } = window.location;
  // The entry keeps its state, the Insights' shown topic, which Back to it shows again.
  window.history.replaceState(window.history.state, "", `${pathname}${queryString(params)}${hash}`);
  renderPageHeader();
}

function renderPageHeader() {
  // The header is given every key of the URL, as a link from it carries them.
  mountHeader(document.querySelector("#site-header"), EXPLORE_FILE, new URLSearchParams(window.location.search));
}

function sectionElement(section) {
  return document.querySelector(`#${section.id}`);
}
