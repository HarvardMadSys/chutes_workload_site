import assert from "node:assert/strict";
import { test } from "node:test";

import { followHistory } from "../site/js/explore/start.js";
import { mountTopicTabs } from "../site/js/explore/topic_tabs.js";
import { mountTrafficControls } from "../site/js/explore/traffic_controls.js";
import { modelChoices } from "../site/js/explore/traffic_filter.js";
import { FakeElement, FakeHistory, PAGE_ADDRESS, shownIds, TOPIC_ANCHORS, topicSections } from "./fake_page.js";

// A daily rollup of one named model and Other, as `explore/daily_rollup` answers it, its counts zero but requests.
const ROWS = [
  { day: "2025-07-01", chute_id: "id-a", model: "A", endpoint_group: "chat", requests: 10 },
  { day: "2025-07-01", chute_id: null, model: "Other", endpoint_group: "chat", requests: 5 },
];

/**
 * The page opened at `PAGE_ADDRESS`, as `startPage` starts it, with the globals its fakes until the test of `context`
 * ends: the topic tabs, the history followed, and the Traffic Explorer's controls, each choice they draw added to
 * `drawn`. Returns `{ tabs, sections, header, endpoint, drawn, history }`, `endpoint` reading the endpoint drop-down
 * as drawn now.
 */
function startedPage(context) {
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
  const showEntryTopic = mountTopicTabs(tabsRow, TOPIC_ANCHORS.map((anchor) => ({ selector: `#${anchor}` })), () => 0);
  const pageHistory = followHistory(showEntryTopic);
  const controls = new FakeElement("div");
  const drawn = [];
  mountTrafficControls(controls, modelChoices(ROWS), pageHistory, (choice) => drawn.push(choice));
  const endpoint = () => controls.children[1].children[1];
  return { tabs: tabsRow.children, sections, header, endpoint, drawn, history: window.history };
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

// Choose `value` in the endpoint drop-down of `page`, as a reader does.
function chooseEndpoint(page, value) {
  page.endpoint().value = value;
  page.endpoint().dispatch("change");
}

test("Back after a tab and a choice shows the earlier entry's choice and topic; Forward the later's", (context) => {
  const page = startedPage(context);
  page.tabs[3].dispatch("click");
  chooseEndpoint(page, "chat");
  assert.equal(addressBar(), "?endpoint=chat#insights-evolution");
  assert.match(page.header.innerHTML, /href="index\.html\?endpoint=chat"/);
  page.history.back();
  assert.equal(addressBar(), "");
  assert.equal(page.endpoint().value, "");
  assert.deepEqual(page.drawn.at(-1), { model: "", endpoint: "", period: "" });
  assert.match(page.header.innerHTML, /href="index\.html"/);
  assert.deepEqual(shownIds(page.sections), ["insights-overview"]);
  page.history.forward();
  assert.equal(addressBar(), "?endpoint=chat#insights-evolution");
  assert.equal(page.endpoint().value, "chat");
  assert.deepEqual(page.drawn.at(-1), { model: "", endpoint: "chat", period: "" });
  assert.match(page.header.innerHTML, /href="index\.html\?endpoint=chat"/);
  assert.deepEqual(shownIds(page.sections), ["insights-evolution"]);
});

test("Back after a choice and then a tab keeps the choice, which is not drawn again", (context) => {
  const page = startedPage(context);
  chooseEndpoint(page, "chat");
  page.tabs[3].dispatch("click");
  assert.equal(addressBar(), "?endpoint=chat#insights-evolution");
  page.history.back();
  assert.equal(addressBar(), "?endpoint=chat");
  assert.equal(page.endpoint().value, "chat");
  assert.equal(page.drawn.length, 1);
  assert.match(page.header.innerHTML, /href="index\.html\?endpoint=chat"/);
  assert.deepEqual(shownIds(page.sections), ["insights-overview"]);
});
