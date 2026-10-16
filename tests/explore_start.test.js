import assert from "node:assert/strict";
import { test } from "node:test";

import { followHistory } from "../site/js/explore/start.js";
import { mountTopicTabs } from "../site/js/explore/topic_tabs.js";
import { mountTrafficControls } from "../site/js/explore/traffic_controls.js";
import { familyChoices, modelChoices } from "../site/js/explore/traffic_filter.js";
import { FakeElement, FakeHistory, PAGE_ADDRESS, shownIds, TOPIC_ANCHORS, topicSections } from "./fake_page.js";

// Two families, Qwen and Other, as the family drop-down offers them.
const FAMILIES = familyChoices([
  { family: "Qwen", family_slug: "qwen", requests: 10 },
  { family: "Other", family_slug: "other", requests: 5 },
]);

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
  const showEntryTopic = mountTopicTabs(tabsRow, TOPIC_ANCHORS.map((anchor) => ({ selector: `#${anchor}` })), () => 0);
  const pageHistory = followHistory(showEntryTopic);
  const controls = new FakeElement("div");
  const drawn = [];
  await mountTrafficControls(controls, FAMILIES, pageHistory, {
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

// Wait until every promise of the page that can settle has, as reading a family's models and following the history do.
function settled() {
  return new Promise((resolve) => setImmediate(resolve));
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
  assert.deepEqual(page.drawn.at(-1), { family: "", model: "", endpoint: "", period: "" });
  assert.match(page.header.innerHTML, /href="index\.html"/);
  assert.deepEqual(shownIds(page.sections), ["insights-overview"]);
  page.history.forward();
  await settled();
  assert.equal(addressBar(), "?family=qwen#insights-evolution");
  assert.equal(page.field(FAMILY_FIELD).value, "qwen");
  assert.equal(page.field(MODEL_FIELD).children[0].textContent, "All Qwen models");
  assert.deepEqual(page.drawn.at(-1), { family: "qwen", model: "", endpoint: "", period: "" });
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
