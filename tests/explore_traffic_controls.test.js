import assert from "node:assert/strict";
import { test } from "node:test";

import { mountTrafficControls, renderControls } from "../site/js/explore/traffic_controls.js";
import { modelChoices } from "../site/js/explore/traffic_filter.js";
import { FakeElement, PAGE_ADDRESS } from "./fake_page.js";

// The choice of everything: every model, every endpoint group, every day.
const EVERYTHING = Object.freeze({ model: "", endpoint: "", period: "" });

// A daily rollup of two named models and Other, as `explore/daily_rollup` answers it, its counts zero but requests.
const ROWS = [
  { day: "2025-07-01", chute_id: "id-a", model: "A", endpoint_group: "chat", requests: 10 },
  { day: "2025-07-01", chute_id: "id-b", model: "B", endpoint_group: "chat", requests: 30 },
  { day: "2025-07-01", chute_id: null, model: "Other", endpoint_group: "chat", requests: 5 },
];

/** Make a stand-in the global document for the test of `context`; node has none of its own. */
function useFakeDocument(context) {
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  context.after(() => delete globalThis.document);
}

/**
 * Make a stand-in the global window for the test of `context`, opened at `query`: `{ replaced, returns }`, the queries
 * written through the context's `replaceQuery`, in order, and the functions given to its `onReturn`, with the context.
 */
function useFakeWindow(context, query) {
  globalThis.window = { location: new URL(`${PAGE_ADDRESS}${query}`) };
  context.after(() => delete globalThis.window);
  const page = { replaced: [], returns: [] };
  page.context = {
    replaceQuery: (params) => page.replaced.push(params.toString()),
    onReturn: (redraw) => page.returns.push(redraw),
  };
  return page;
}

// The controls row's three fields: the model drop-down, the endpoint drop-down and the period buttons.
function controlsOf(row) {
  const [modelField, endpointField, periodField] = row.children;
  return { model: modelField.children[1], endpoint: endpointField.children[1], periods: periodField.children[1] };
}

test("the model drop-down lists All models, the named models by requests, then Other, the chosen shown", (context) => {
  useFakeDocument(context);
  const row = new FakeElement("div");
  renderControls(row, { ...EVERYTHING, model: "id-a" }, modelChoices(ROWS), () => undefined);
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
  renderControls(row, EVERYTHING, modelChoices(ROWS), (part) => chosen.push(part));
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
  renderControls(row, { ...EVERYTHING, period: "2026-q1" }, modelChoices(ROWS), (part) => chosen.push(part));
  const buttons = controlsOf(row).periods.children;
  const pressed = () => buttons.map((button) => button.getAttribute("aria-pressed"));
  assert.deepEqual(buttons.map((button) => button.textContent), ["All", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26"]);
  assert.deepEqual(pressed(), ["false", "false", "false", "false", "true"]);
  buttons[2].dispatch("click");
  assert.deepEqual(pressed(), ["false", "false", "true", "false", "false"]);
  assert.deepEqual(chosen, [{ period: "2025-q3" }]);
  assert.equal(controlsOf(row).periods.getAttribute("role"), "group");
});

test("the controls open on the URL's choice; a change writes it, other keys kept, and draws it", (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?tab=x&period=2025-q3#traffic");
  const row = new FakeElement("div");
  const drawn = [];
  const opened = mountTrafficControls(row, modelChoices(ROWS), page.context, (choice) => drawn.push(choice));
  assert.deepEqual(opened, { ...EVERYTHING, period: "2025-q3" });
  const { endpoint } = controlsOf(row);
  endpoint.value = "chat";
  endpoint.dispatch("change");
  assert.deepEqual(page.replaced, ["tab=x&period=2025-q3&endpoint=chat"]);
  assert.deepEqual(drawn, [{ ...EVERYTHING, endpoint: "chat", period: "2025-q3" }]);
});

test("a return to an entry of another choice shows and draws it; of the same choice, nothing", (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?model=id-a");
  const row = new FakeElement("div");
  const drawn = [];
  mountTrafficControls(row, modelChoices(ROWS), page.context, (choice) => drawn.push(choice));
  const [onReturn] = page.returns;
  onReturn();
  assert.deepEqual(drawn, []);
  globalThis.window.location = new URL(`${PAGE_ADDRESS}?endpoint=completion`);
  onReturn();
  assert.deepEqual(drawn, [{ ...EVERYTHING, endpoint: "completion" }]);
  assert.equal(controlsOf(row).model.value, "");
  assert.equal(controlsOf(row).endpoint.value, "completion");
  assert.deepEqual(page.replaced, []);
});
