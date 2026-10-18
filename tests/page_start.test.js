// The page's start (`page/start.js`): a topic placed, the opening topic's figures read once the explorer has drawn, and
// Back and Forward over the tabs and the explorer's choice.
import assert from "node:assert/strict";
import { test } from "node:test";

import { TOPICS } from "../site/js/page/topics.js";
import { followHistory, placeTopic, startPage } from "../site/js/page/start.js";
import { mountTopicTabs } from "../site/js/page/topic_tabs.js";
import { runTraffic } from "../site/js/traffic/traffic.js";
import { mountTrafficControls } from "../site/js/traffic/traffic_controls.js";
import { familyChoices, modelChoices } from "../site/js/traffic/traffic_choice.js";
import { deferred, FakeElement, FakeHistory, PAGE_ADDRESS, settled } from "./fake_page.js";
import { shownIds, topicSections } from "./page_fixtures.js";
import { EVERYTHING } from "./traffic_fixtures.js";

// Two families, Qwen and Other, as the family drop-down offers them.
const FAMILIES = familyChoices([
  { family: "Qwen", family_slug: "qwen", requests: 10 },
  { family: "Other", family_slug: "other", requests: 5 },
]);

// The trace's days, as far as the controls read them: its first and last.
const DAYS = ["2025-04-11", "2026-04-12"];

// Qwen's daily answer by model: one named model and its other models, its counts zero but requests.
const QWEN_ROWS = [
  { day: "2025-07-01", chute_id: "id-a", model: "A", endpoint_group: "chat", requests: 10 },
  { day: "2025-07-01", chute_id: null, model: "Other Qwen", endpoint_group: "chat", requests: 5 },
];

/**
 * The page opened at `PAGE_ADDRESS`, as `startPage` starts it, with the globals its fakes until the test of `context`
 * ends: the topic tabs, the history followed, and the Traffic Explorer's controls, each choice they draw added to
 * `drawn`. Resolves to `{ tabs, sections, header, field, drawn, history }`, `field(index)` reading a drop-down of the
 * controls as drawn now: 0 the families', 1 the models', 2 the endpoints'.
 */
async function startedPage(context) {
  const sections = topicSections();
  const header = new FakeElement("header", "site-header");
  const window = new FakeElement();
  window.history = new FakeHistory(window, PAGE_ADDRESS);
  globalThis.window = window;
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.document = {
    querySelector: (selector) => [header, ...sections].find((element) => `#${element.id}` === selector),
    getElementById: (id) => sections.find((section) => section.id === id),
    createElement: (tag) => new FakeElement(tag),
  };
  context.after(forgetThePage);
  const tabsRow = new FakeElement("div", "topic-tabs");
  const showEntryTopic = mountTopicTabs(tabsRow, TOPICS, () => 0);
  const pageHistory = followHistory(showEntryTopic);
  const controls = new FakeElement("div");
  const drawn = [];
  await mountTrafficControls(controls, { families: FAMILIES, days: DAYS }, pageHistory, {
    modelsOf: async () => modelChoices(QWEN_ROWS, "Qwen"),
    onChange: (choice) => drawn.push(choice),
    onError: (error) => assert.fail(error),
  });
  const field = (index) => controls.children[index].children[1];
  return { tabs: tabsRow.children, sections, header, field, drawn, history: window.history };
}

function forgetThePage() {
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.ResizeObserver;
}

// The query and anchor of the address bar.
function addressBar() {
  return `${globalThis.window.location.search}${globalThis.window.location.hash}`;
}

// The drop-downs' indices among the controls.
const FAMILY_FIELD = 0;
const MODEL_FIELD = 1;
const ENDPOINT_FIELD = 2;

// Choose `value` in the drop-down at `index` of `page`'s controls, as a reader does, and wait while a family's models
// are read and the choice is drawn.
async function choose(page, index, value) {
  page.field(index).value = value;
  page.field(index).dispatch("change");
  await settled();
}

test("Back after a tab and a family shows the earlier entry's choice and topic; Forward the later's", async (context) => {
  const page = await startedPage(context);
  page.tabs[3].dispatch("click");
  await choose(page, FAMILY_FIELD, "qwen");
  assert.equal(addressBar(), "?family=qwen#insights-evolution");
  assert.match(page.header.innerHTML, /href="index\.html\?family=qwen"/);
  page.history.back();
  await settled();
  assert.equal(addressBar(), "");
  assert.equal(page.field(FAMILY_FIELD).value, "");
  assert.equal(page.field(MODEL_FIELD).disabled, true);
  assert.deepEqual(page.drawn.at(-1), EVERYTHING);
  assert.match(page.header.innerHTML, /href="index\.html"/);
  assert.deepEqual(shownIds(page.sections), ["insights-overview"]);
  page.history.forward();
  await settled();
  assert.equal(addressBar(), "?family=qwen#insights-evolution");
  assert.equal(page.field(FAMILY_FIELD).value, "qwen");
  assert.equal(page.field(MODEL_FIELD).children[0].textContent, "All Qwen models");
  assert.deepEqual(page.drawn.at(-1), { ...EVERYTHING, family: "qwen" });
  assert.match(page.header.innerHTML, /href="index\.html\?family=qwen"/);
  assert.deepEqual(shownIds(page.sections), ["insights-evolution"]);
});

test("Back after a choice and then a tab keeps the choice, which is not drawn again", async (context) => {
  const page = await startedPage(context);
  await choose(page, ENDPOINT_FIELD, "chat");
  page.tabs[3].dispatch("click");
  assert.equal(addressBar(), "?endpoint=chat#insights-evolution");
  page.history.back();
  await settled();
  assert.equal(addressBar(), "?endpoint=chat");
  assert.equal(page.field(ENDPOINT_FIELD).value, "chat");
  assert.equal(page.drawn.length, 1);
  assert.match(page.header.innerHTML, /href="index\.html\?endpoint=chat"/);
  assert.deepEqual(shownIds(page.sections), ["insights-overview"]);
});

// A card as a topic lists it, its figure `figure`.
function cardOf(figure) {
  return { figure, title: `Title of ${figure}`, insight: "An insight.", caption: "A caption.", definition: "Rows." };
}

// A topic of two groups, of two cards and of one.
const TOPIC = {
  id: "insights-overview",
  title: "Workload",
  takeaway: "The topic's finding.",
  groups: [
    { heading: "First group", takeaway: "What the first shows.", cards: [cardOf("fig_a"), cardOf("fig_b")] },
    { heading: "Second group", takeaway: "What the second shows.", cards: [cardOf("fig_c")] },
  ],
};

test("a topic is placed after the tab row, a tab panel of its heading, takeaway, groups and cards", (context) => {
  const insights = new FakeElement("section", "insights");
  const tabsRow = new FakeElement("div", "topic-tabs");
  insights.append(tabsRow);
  globalThis.document = { getElementById: () => insights, createElement: (tag) => new FakeElement(tag) };
  context.after(forgetThePage);
  const { section, cards } = placeTopic(TOPIC, 4);
  assert.deepEqual(insights.children, [tabsRow, section]);
  assert.deepEqual([section.tag, section.id, section.className], ["section", "insights-overview", "topic"]);
  assert.equal(section.getAttribute("role"), "tabpanel");
  assert.equal(section.getAttribute("aria-labelledby"), "tab-insights-overview");
  const [heading, ...parts] = section.children;
  const [number, titleText] = heading.children;
  assert.deepEqual([heading.tag, number.tag, number.className], ["h2", "span", "topic-number"]);
  assert.deepEqual([number.textContent, number.getAttribute("aria-hidden"), titleText], ["05", "true", " Workload"]);
  assert.deepEqual(parts.map((part) => [part.tag, part.className, part.textContent]), [
    ["p", "topic-takeaway", "The topic's finding."],
    ["h3", "figure-group-title", "First group"],
    ["p", "figure-group-takeaway", "What the first shows."],
    ["div", "card-grid", ""],
    ["h3", "figure-group-title", "Second group"],
    ["p", "figure-group-takeaway", "What the second shows."],
    ["div", "card-grid", ""],
  ]);
  const grids = [parts[3], parts[6]];
  assert.deepEqual(grids[0].children.map((card) => card.dataset.figure), ["fig_a", "fig_b"]);
  assert.deepEqual(grids[1].children.map((card) => card.dataset.figure), ["fig_c"]);
  const [title] = grids[0].children[0].children[0].children;
  assert.deepEqual([title.tag, title.className, title.textContent], ["h4", "figure-title", "Title of fig_a"]);
  assert.deepEqual(cards.map((placedCard) => placedCard.card.figure), ["fig_a", "fig_b", "fig_c"]);
});

// The answers the page reads as it opens, in the order it reads them: the hero's, the Overview's, the explorer's.
const TOTALS_FILE = "data/all/explore/trace_totals.json";
const FAMILIES_FILE = "data/all/explore/family_mix.json";
const ENDPOINTS_FILE = "data/all/explore/endpoint_mix.json";
const DAILY_FILE = "data/all/explore/daily_by_family.json";
const HISTOGRAMS_FILE = "data/all/explore/histograms_by_family.json";

// The folder of the figures' answers.
const FIGURES_FOLDER = "data/all/figures/";

// The daily answer by family: one family's requests of the endpoint group chat on one day, so that the explorer opened
// on the endpoint group completion draws its bars as a note, which node can draw without the charting library.
const DAILY_ROWS = [{
  day: "2025-07-01", family: "Kin", family_slug: "kin", endpoint_group: "chat", requests: 10, input_tokens: null,
  input_counted: 0, output_tokens: null, output_counted: 0, ttft_sum: null, ttft_counted: 0,
}];

// The Overview's families, which the explorer's family drop-down lists, and its endpoint groups, the order the
// explorer colours them in.
const FAMILY_MIX_ROWS = [{ family: "Kin", family_slug: "kin", requests: 10 }];
const ENDPOINT_ROWS = [{ endpoint_group: "chat", requests: 10 }];

/**
 * The page started as `startPage` starts it, with the Traffic Explorer as its one section, for the test of `context`:
 * the families, the endpoint groups' order and each file of `answers` (a map from file to its promised rows) fetched
 * as their rows, any other answering 404, and the page opened on the endpoint group completion. Returns `{ reads, tabs,
 * started }`: the files read, in order, the topic tabs and the page's promise.
 */
function startedPageWithExplorer(context, answers) {
  const header = new FakeElement("header", "site-header");
  const footer = new FakeElement("footer", "site-footer");
  const tabsRow = new FakeElement("div", "topic-tabs");
  // The Insights section, to which the page appends each topic's section, and which it scrolls to on a topic's anchor.
  const insights = new FakeElement("section", "insights");
  insights.scrollIntoView = () => undefined;
  const places = [header, footer, tabsRow, insights, new FakeElement("div", "traffic-explorer")];
  const window = new FakeElement();
  window.history = new FakeHistory(window, `${PAGE_ADDRESS}?endpoint=completion`);
  globalThis.window = window;
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.document = {
    querySelector: (selector) => places.find((element) => `#${element.id}` === selector),
    getElementById: (id) => [insights, ...insights.children].find((element) => element.id === id),
    createElement: (tag) => new FakeElement(tag),
  };
  context.after(() => {
    forgetThePage();
    delete globalThis.requestAnimationFrame;
  });
  context.mock.method(console, "error", () => undefined);
  const reads = [];
  const files = { [FAMILIES_FILE]: FAMILY_MIX_ROWS, [ENDPOINTS_FILE]: ENDPOINT_ROWS, ...answers };
  context.mock.method(globalThis, "fetch", async (file) => {
    reads.push(file);
    const rows = await files[file];
    return rows === undefined ? { ok: false, status: 404, statusText: "Not Found" } : { ok: true, json: () => rows };
  });
  const explorer = { id: "traffic-explorer", run: runTraffic };
  const started = startPage({ sections: [explorer], showMonthCount: () => undefined });
  return { reads, tabs: tabsRow.children, started };
}

/** The answer files of the figures of `topic`'s cards, in the order of its groups and cards. */
function topicFigureFiles(topic) {
  const files = [];
  for (const group of topic.groups) {
    for (const card of group.cards) {
      files.push(`${FIGURES_FOLDER}${card.figure}.json`);
    }
  }
  return files;
}

/** The files of `reads` in the figures' folder, in order. */
function figureReads(reads) {
  return reads.filter((file) => file.startsWith(FIGURES_FOLDER));
}

test("the opening topic's figures are read once the explorer has drawn: the daily answer, the histograms, the figures",
  async (context) => {
    const daily = deferred();
    const histograms = deferred();
    const answers = { [DAILY_FILE]: daily.promise, [HISTOGRAMS_FILE]: histograms.promise };
    const page = startedPageWithExplorer(context, answers);
    await settled();
    assert.deepEqual(page.reads, [TOTALS_FILE, FAMILIES_FILE, ENDPOINTS_FILE, DAILY_FILE]);
    daily.resolve(DAILY_ROWS);
    await settled();
    assert.deepEqual(page.reads.slice(3), [DAILY_FILE, HISTOGRAMS_FILE], "no figure while the histograms are read");
    histograms.resolve([]);
    await page.started;
    assert.deepEqual(page.reads.slice(3, 5), [DAILY_FILE, HISTOGRAMS_FILE]);
    // The first topic's cards read no legend answer, so its figures are every read of the figures' folder.
    assert.deepEqual(figureReads(page.reads), topicFigureFiles(TOPICS[0]));
    // Its Daily API calls card takes the endpoint mix the page read for the Overview.
    assert.equal(page.reads.filter((file) => file === ENDPOINTS_FILE).length, 1);
  });

test("a tab pressed before the explorer has drawn reads its topic's figures at once, and the opening topic's never",
  async (context) => {
    const daily = deferred();
    const page = startedPageWithExplorer(context, { [DAILY_FILE]: daily.promise, [HISTOGRAMS_FILE]: [] });
    await settled();
    page.tabs[1].dispatch("click");
    await settled();
    // The second topic's cards read no legend answer either.
    const pressedFigures = topicFigureFiles(TOPICS[1]);
    assert.deepEqual(figureReads(page.reads), pressedFigures);
    assert.ok(!page.reads.includes(HISTOGRAMS_FILE), "the explorer has not drawn yet");
    daily.resolve(DAILY_ROWS);
    await page.started;
    assert.deepEqual(figureReads(page.reads), pressedFigures, "the topic shown is drawn once, and no other");
  });
