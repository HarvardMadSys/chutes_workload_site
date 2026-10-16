import assert from "node:assert/strict";
import { test } from "node:test";

import { dayMonth, monthTicks, renderControls, renderTiles, tileTexts } from "../site/js/explore/traffic.js";
import { DEFAULT_CHOICE, modelChoices, trafficSummary } from "../site/js/explore/traffic_filter.js";

/** A stand-in for a page element: children, attributes, listeners and the properties the explorer sets. */
class FakeElement {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.className = "";
    this.textContent = "";
    this.value = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type) {
    this.listeners.get(type)();
  }
}

/** Make a stand-in the global document for the test of `context`; node has none of its own. */
function useFakeDocument(context) {
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  context.after(() => delete globalThis.document);
}

// A daily rollup of two named models and Other, as `explore/daily_rollup` answers it, its counts zero but requests.
const ROWS = [
  { day: "2025-07-01", chute_id: "id-a", model: "A", endpoint_group: "chat", requests: 10 },
  { day: "2025-07-01", chute_id: "id-b", model: "B", endpoint_group: "chat", requests: 30 },
  { day: "2025-07-01", chute_id: null, model: "Other", endpoint_group: "chat", requests: 5 },
];

// The controls row's three fields: the model drop-down, the endpoint drop-down and the period buttons.
function controlsOf(row) {
  const [modelField, endpointField, periodField] = row.children;
  return { model: modelField.children[1], endpoint: endpointField.children[1], periods: periodField.children[1] };
}

test("the model drop-down lists All models, the named models by requests, then Other, the chosen shown", (context) => {
  useFakeDocument(context);
  const row = new FakeElement("div");
  renderControls(row, { ...DEFAULT_CHOICE, model: "id-a" }, modelChoices(ROWS), () => undefined);
  const { model, endpoint } = controlsOf(row);
  assert.deepEqual(model.children.map((option) => [option.value, option.textContent]), [
    ["", "All models"], ["id-b", "B"], ["id-a", "A"], ["other", "Other"],
  ]);
  assert.equal(model.value, "id-a");
  assert.deepEqual(endpoint.children.map((option) => option.textContent), [
    "All endpoints", "Chat", "Chat stream", "Completion", "Completion stream", "Other",
  ]);
  assert.deepEqual(row.children.map((field) => field.children[0].textContent), ["Model", "Endpoint", "Period"]);
});

test("a drop-down's change chooses its value", (context) => {
  useFakeDocument(context);
  const row = new FakeElement("div");
  const chosen = [];
  renderControls(row, DEFAULT_CHOICE, modelChoices(ROWS), (part) => chosen.push(part));
  const { model, endpoint } = controlsOf(row);
  model.value = "id-b";
  model.dispatch("change");
  endpoint.value = "chat_stream";
  endpoint.dispatch("change");
  assert.deepEqual(chosen, [{ model: "id-b" }, { endpoint: "chat_stream" }]);
});

test("the chosen period's button alone is pressed; a press presses its button alone and chooses it", (context) => {
  useFakeDocument(context);
  const row = new FakeElement("div");
  const chosen = [];
  renderControls(row, { ...DEFAULT_CHOICE, period: "2026-q1" }, modelChoices(ROWS), (part) => chosen.push(part));
  const buttons = controlsOf(row).periods.children;
  const pressed = () => buttons.map((button) => button.getAttribute("aria-pressed"));
  assert.deepEqual(buttons.map((button) => button.textContent), ["All", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26"]);
  assert.deepEqual(pressed(), ["false", "false", "false", "false", "true"]);
  buttons[2].dispatch("click");
  assert.deepEqual(pressed(), ["false", "false", "true", "false", "false"]);
  assert.deepEqual(chosen, [{ period: "2025-q3" }]);
  assert.equal(controlsOf(row).periods.getAttribute("role"), "group");
});

test("the tiles write the requests as the stats strip does and each average over the requests that record it", () => {
  const summary = {
    requests: 6_122_413_756, inputAverage: 5846.6, outputAverage: 412.2, ttftAverage: 2.31, ttftShare: 0.49,
  };
  assert.deepEqual(tileTexts(summary), [
    { label: "Requests", value: "6.12B", note: "" },
    { label: "Avg input tokens", value: "5,847", note: "" },
    { label: "Avg output tokens", value: "412", note: "" },
    { label: "Avg TTFT", value: "2.3 s", note: "49% record it" },
  ]);
});

test("the tiles of a choice with no requests write no average and no share", () => {
  const texts = tileTexts(trafficSummary([]));
  assert.deepEqual(texts.map((tile) => tile.value), ["0", "—", "—", "—"]);
  assert.equal(texts[3].note, "— record it");
});

test("each tile shows its value, its label and its note, if any", (context) => {
  useFakeDocument(context);
  const list = new FakeElement("ul");
  renderTiles(list, { requests: 1000, inputAverage: 8, outputAverage: 3, ttftAverage: 0.2, ttftShare: 0.49 });
  const texts = list.children.map((tile) => tile.children.map((part) => part.textContent));
  assert.deepEqual(texts, [
    ["1.0k", "Requests"],
    ["8", "Avg input tokens"],
    ["3", "Avg output tokens"],
    ["0.2 s", "Avg TTFT", "49% record it"],
  ]);
});

test("the bars' axis writes the month at each first of a month, and at a quarter's first day", () => {
  const days = ["2025-04-29", "2025-04-30", "2025-05-01", "2025-05-02", "2025-06-01"];
  assert.deepEqual(monthTicks(days, ""), ["2025-05-01", "2025-06-01"]);
  assert.deepEqual(monthTicks(days, "2025-q2").map(dayMonth), ["2025-04", "2025-05", "2025-06"]);
  assert.deepEqual(monthTicks(["2025-07-01", "2025-07-02", "2025-08-01"], "2025-q3"), ["2025-07-01", "2025-08-01"]);
});
