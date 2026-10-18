// The topic tabs (`page/topic_tabs.js`): the topic a hash or a history entry shows, the tabs' roles and keys, and Back
// and Forward.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  mountTopicTabs, showTopic, tabIndexForKey, topicForEntry, topicForHash, topicTab,
} from "../site/js/page/topic_tabs.js";

import { TOPICS, topicNumber } from "../site/js/page/topics.js";
import { FakeElement, useFakePage } from "./fake_page.js";
import { shownIds, topicSections } from "./page_fixtures.js";

// The topics' anchors, their sections' ids, in the order of their tabs.
const TOPIC_ANCHORS = TOPICS.map((topic) => topic.id);

/**
 * Mount the tabs on a page opened at `hash` for the test of `context`, `onShow` called as a topic is shown: `{ tabs,
 * sections, history }`. Back and Forward reach the tabs as the page's start passes them on (`page/start.js`).
 */
function mountedTabs(context, hash, onShow = () => undefined) {
  const insights = topicSections();
  const page = useFakePage(context, { query: hash, elements: [insights] });
  const row = new FakeElement("div", "topic-tabs");
  const showEntryTopic = mountTopicTabs(row, TOPICS, onShow);
  globalThis.window.addEventListener("popstate", (event) => showEntryTopic(event.state));
  return { tabs: row.children, sections: insights.children, history: page.history };
}

/** One value per topic of the list, in its order: `atIndex` for the topic at `index`, `elsewhere` for every other. */
function onlyAt(index, atIndex, elsewhere) {
  return TOPIC_ANCHORS.map((anchor, place) => (place === index ? atIndex : elsewhere));
}

test("a tab is a button in the tab role, controlling its topic's section", (context) => {
  useFakePage(context);
  const tab = topicTab({ anchor: "insights-tokens", number: "02", title: "Request shape and latency" });
  assert.equal(tab.type, "button");
  assert.equal(tab.id, "tab-insights-tokens");
  assert.equal(tab.className, "topic-tab");
  assert.equal(tab.getAttribute("role"), "tab");
  assert.equal(tab.getAttribute("aria-controls"), "insights-tokens");
});

test("the tabs write each topic's number and title from the topic list, in order, each controlling its topic", (context) => {
  const { tabs } = mountedTabs(context, "");
  assert.equal(tabs[0].textContent, "01 The workload at a glance");
  const texts = TOPICS.map((topic, index) => `${topicNumber(index)} ${topic.title}`);
  assert.deepEqual(tabs.map((tab) => tab.textContent), texts);
  assert.deepEqual(tabs.map((tab) => tab.getAttribute("aria-controls")), TOPIC_ANCHORS);
});

test("a hash naming a topic shows that topic", () => {
  assert.equal(topicForHash("#insights-caching", TOPIC_ANCHORS, "insights-overview"), "insights-caching");
  assert.equal(topicForHash("#insights-overview", TOPIC_ANCHORS, "insights-evolution"), "insights-overview");
});

test("no hash, or the Insights' own anchor, shows the first topic", () => {
  assert.equal(topicForHash("", TOPIC_ANCHORS, "insights-evolution"), "insights-overview");
  assert.equal(topicForHash("#insights", TOPIC_ANCHORS, "insights-evolution"), "insights-overview");
});

test("a hash naming another section, or nothing on the page, leaves the shown topic as it is", () => {
  for (const hash of ["#traffic", "#cite", "#overview", "#duration_cdf", "#insights-unknown", "#tokens"]) {
    assert.equal(topicForHash(hash, TOPIC_ANCHORS, "insights-evolution"), "insights-evolution", hash);
  }
});

test("a history entry's topic wins over its hash; an entry with none, or an unknown one, goes by the hash", () => {
  assert.equal(topicForEntry({ topic: "insights-overview" }, "#traffic", TOPIC_ANCHORS, "insights-evolution"), "insights-overview");
  assert.equal(topicForEntry(null, "#insights-users", TOPIC_ANCHORS, "insights-evolution"), "insights-users");
  assert.equal(topicForEntry({ topic: "gone" }, "#cite", TOPIC_ANCHORS, "insights-evolution"), "insights-evolution");
});

test("the arrow keys move to the next and the previous tab round the row, Home and End to its ends", () => {
  assert.equal(tabIndexForKey("ArrowRight", 2, 6), 3);
  assert.equal(tabIndexForKey("ArrowRight", 5, 6), 0);
  assert.equal(tabIndexForKey("ArrowLeft", 0, 6), 5);
  assert.equal(tabIndexForKey("Home", 4, 6), 0);
  assert.equal(tabIndexForKey("End", 1, 6), 5);
  assert.equal(tabIndexForKey("Tab", 1, 6), null);
  assert.equal(tabIndexForKey("Enter", 1, 6), null);
});

test("showing a topic hides every other topic and selects its tab alone, the row's one tab stop", () => {
  const sections = topicSections().children;
  const tabs = TOPIC_ANCHORS.map((anchor) => {
    const tab = new FakeElement();
    tab.setAttribute("aria-controls", anchor);
    return tab;
  });
  showTopic(sections, tabs, "insights-users");
  assert.deepEqual(shownIds(sections), ["insights-users"]);
  assert.deepEqual(tabs.map((tab) => tab.getAttribute("aria-selected")), onlyAt(2, "true", "false"));
  assert.deepEqual(tabs.map((tab) => tab.tabIndex), onlyAt(2, 0, -1));
  assert.deepEqual(tabs.map((tab) => tab.classes.has("is-active")), onlyAt(2, true, false));
  showTopic(sections, tabs, "insights-overview");
  assert.deepEqual(shownIds(sections), ["insights-overview"]);
  assert.equal(tabs[2].getAttribute("aria-selected"), "false");
  assert.equal(tabs[2].classes.has("is-active"), false);
});

test("Back from the fourth topic shows the first again, and Forward the fourth", (context) => {
  const { tabs, sections, history } = mountedTabs(context, "");
  tabs[3].dispatch("click", {});
  assert.deepEqual(shownIds(sections), ["insights-evolution"]);
  assert.equal(globalThis.window.location.hash, "#insights-evolution");
  history.back();
  assert.deepEqual(shownIds(sections), ["insights-overview"]);
  history.forward();
  assert.deepEqual(shownIds(sections), ["insights-evolution"]);
});

test("Back shows the first topic again on a page opened at another section's anchor", (context) => {
  const { tabs, sections, history } = mountedTabs(context, "#traffic");
  tabs[2].dispatch("click", {});
  assert.deepEqual(shownIds(sections), ["insights-users"]);
  history.back();
  assert.deepEqual(shownIds(sections), ["insights-overview"]);
  assert.equal(history.entries[0].url.hash, "#traffic");
});

test("ArrowRight on the shown tab shows the next topic and focuses its tab; Back returns", (context) => {
  const { tabs, sections, history } = mountedTabs(context, "#insights-tokens");
  let isDefaultPrevented = false;
  tabs[1].dispatch("keydown", { key: "ArrowRight", preventDefault: () => { isDefaultPrevented = true; } });
  assert.equal(isDefaultPrevented, true);
  assert.deepEqual(shownIds(sections), ["insights-users"]);
  assert.equal(globalThis.document.activeElement, tabs[2]);
  assert.deepEqual(tabs.map((tab) => tab.tabIndex), onlyAt(2, 0, -1));
  history.back();
  assert.deepEqual(shownIds(sections), ["insights-tokens"]);
});

test("Tab is left to the browser, so focus leaves the row", (context) => {
  const { tabs, sections } = mountedTabs(context, "");
  let isDefaultPrevented = false;
  tabs[0].dispatch("keydown", { key: "Tab", preventDefault: () => { isDefaultPrevented = true; } });
  assert.equal(isDefaultPrevented, false);
  assert.deepEqual(shownIds(sections), ["insights-overview"]);
});

test("the topic shown on mounting is shown without onShow; a tab, Back and Forward each call it once", (context) => {
  const shown = [];
  const { tabs, sections, history } = mountedTabs(context, "#insights-tokens", () => shown.push(shownIds(sections)[0]));
  assert.deepEqual(shownIds(sections), ["insights-tokens"]);
  assert.deepEqual(shown, [], "the page draws the opening topic when it chooses");
  tabs[3].dispatch("click", {});
  history.back();
  history.forward();
  assert.deepEqual(shown, ["insights-evolution", "insights-tokens", "insights-evolution"]);
});
