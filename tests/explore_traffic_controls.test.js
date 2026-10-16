import assert from "node:assert/strict";
import { test } from "node:test";

import { mountTrafficControls, renderControls } from "../site/js/explore/traffic_controls.js";
import { familyChoices, modelChoices, NO_FAMILY_MODEL_CHOICES } from "../site/js/explore/traffic_filter.js";
import { FakeElement, PAGE_ADDRESS } from "./fake_page.js";

// The choice of everything: every family, every model, every endpoint group, every day.
const EVERYTHING = Object.freeze({ family: "", model: "", endpoint: "", period: "" });

// Two families in the order of their requests, Kin and Other, as `familyOrder` gives them.
const FAMILIES = familyChoices([
  { family: "Kin", family_slug: "kin", requests: 45 },
  { family: "Other", family_slug: "other", requests: 5 },
]);

// The family Kin's daily answer by model: two named models and its other models, its counts zero but requests.
const KIN_ROWS = [
  { day: "2025-07-01", chute_id: "id-a", model: "A", endpoint_group: "chat", requests: 10 },
  { day: "2025-07-01", chute_id: "id-b", model: "B", endpoint_group: "chat", requests: 30 },
  { day: "2025-07-01", chute_id: null, model: "Other Kin", endpoint_group: "chat", requests: 5 },
];

// The model drop-down's entries with Kin chosen.
const KIN_MODELS = modelChoices(KIN_ROWS, "Kin");

/** Make a stand-in the global document for the test of `context`; node has none of its own. */
function useFakeDocument(context) {
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  context.after(() => delete globalThis.document);
}

/**
 * Make a stand-in the global window for the test of `context`, opened at `query`: `{ replaced, returns, drawn, asked,
 * explorer }`, the queries written through the context's `replaceQuery`, in order, the functions given to its
 * `onReturn`, the choices the explorer was asked to draw, the families whose models were asked for, and the explorer's
 * part given to the controls, with the context.
 */
function useFakeWindow(context, query) {
  globalThis.window = { location: new URL(`${PAGE_ADDRESS}${query}`) };
  context.after(() => delete globalThis.window);
  const page = { replaced: [], returns: [], drawn: [], asked: [] };
  page.context = {
    replaceQuery: (params) => page.replaced.push(params.toString()),
    onReturn: (redraw) => page.returns.push(redraw),
  };
  page.explorer = {
    modelsOf: async (family) => modelsOf(page, family),
    onChange: (choice) => page.drawn.push(choice),
    onError: (error) => assert.fail(error),
  };
  return page;
}

// The model drop-down's entries of the family `family` (Kin's for each), the family recorded as asked for.
function modelsOf(page, family) {
  page.asked.push(family);
  return KIN_MODELS;
}

// The controls row's four fields: the family, model and endpoint drop-downs and the period buttons.
function controlsOf(row) {
  const [familyField, modelField, endpointField, periodField] = row.children;
  return {
    family: familyField.children[1], model: modelField.children[1], endpoint: endpointField.children[1],
    periods: periodField.children[1],
  };
}

// The options of a drop-down as `[value, text]`.
function optionsOf(select) {
  return select.children.map((option) => [option.value, option.textContent]);
}

test("the family drop-down lists All families and the families; the model one waits for a family", (context) => {
  useFakeDocument(context);
  const row = new FakeElement("div");
  renderControls(row, EVERYTHING, { families: FAMILIES, models: NO_FAMILY_MODEL_CHOICES }, () => undefined);
  const { family, model, endpoint } = controlsOf(row);
  assert.deepEqual(optionsOf(family), [["", "All families"], ["kin", "Kin"], ["other", "Other"]]);
  assert.deepEqual(optionsOf(model), [["", "Choose a family"]]);
  assert.equal(model.disabled, true);
  assert.deepEqual(endpoint.children.map((option) => option.textContent), [
    "All endpoints", "Chat", "Chat stream", "Completion", "Completion stream", "Other",
  ]);
  assert.deepEqual(row.children.map((field) => field.children[0].textContent), ["Family", "Model", "Endpoint", "Period"]);
});

test("with a family chosen the model drop-down lists its models by requests, then Other <family>", (context) => {
  useFakeDocument(context);
  const row = new FakeElement("div");
  const choice = { ...EVERYTHING, family: "kin", model: "id-a" };
  renderControls(row, choice, { families: FAMILIES, models: KIN_MODELS }, () => undefined);
  const { family, model } = controlsOf(row);
  assert.equal(family.value, "kin");
  assert.deepEqual(optionsOf(model), [["", "All Kin models"], ["id-b", "B"], ["id-a", "A"], ["other", "Other Kin"]]);
  assert.equal(model.value, "id-a");
  assert.equal(model.disabled, false);
});

test("a drop-down's change chooses its value; a family's empties the model", (context) => {
  useFakeDocument(context);
  const row = new FakeElement("div");
  const chosen = [];
  const choice = { ...EVERYTHING, family: "kin" };
  renderControls(row, choice, { families: FAMILIES, models: KIN_MODELS }, (part) => chosen.push(part));
  const { family, model, endpoint } = controlsOf(row);
  model.value = "id-b";
  model.dispatch("change");
  endpoint.value = "chat_stream";
  endpoint.dispatch("change");
  family.value = "other";
  family.dispatch("change");
  assert.deepEqual(chosen, [{ model: "id-b" }, { endpoint: "chat_stream" }, { family: "other", model: "" }]);
});

test("the chosen period's button alone is pressed; a press presses its button alone and chooses it", (context) => {
  useFakeDocument(context);
  const row = new FakeElement("div");
  const chosen = [];
  const entries = { families: FAMILIES, models: NO_FAMILY_MODEL_CHOICES };
  renderControls(row, { ...EVERYTHING, period: "2026-q1" }, entries, (part) => chosen.push(part));
  const buttons = controlsOf(row).periods.children;
  const pressed = () => buttons.map((button) => button.getAttribute("aria-pressed"));
  assert.deepEqual(buttons.map((button) => button.textContent), ["All", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26"]);
  assert.deepEqual(pressed(), ["false", "false", "false", "false", "true"]);
  buttons[2].dispatch("click");
  assert.deepEqual(pressed(), ["false", "false", "true", "false", "false"]);
  assert.deepEqual(chosen, [{ period: "2025-q3" }]);
  assert.equal(controlsOf(row).periods.getAttribute("role"), "group");
});

test("the controls open on the URL's choice; a change writes it, other keys kept, and draws it", async (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?tab=x&period=2025-q3#traffic");
  const row = new FakeElement("div");
  const opened = await mountTrafficControls(row, FAMILIES, page.context, page.explorer);
  assert.deepEqual(opened, { ...EVERYTHING, period: "2025-q3" });
  assert.deepEqual(page.asked, []);
  const { endpoint } = controlsOf(row);
  endpoint.value = "chat";
  endpoint.dispatch("change");
  assert.deepEqual(page.replaced, ["tab=x&period=2025-q3&endpoint=chat"]);
  assert.deepEqual(page.drawn, [{ ...EVERYTHING, endpoint: "chat", period: "2025-q3" }]);
});

test("a URL's family and model open with the family's models read and the model chosen", async (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?family=kin&model=id-b");
  const row = new FakeElement("div");
  const opened = await mountTrafficControls(row, FAMILIES, page.context, page.explorer);
  assert.deepEqual(opened, { ...EVERYTHING, family: "kin", model: "id-b" });
  assert.deepEqual(page.asked, ["kin"]);
  assert.equal(controlsOf(row).model.value, "id-b");
  assert.deepEqual(page.replaced, [], "a URL the choice keeps whole is not rewritten");
});

test("a model key without its family, or outside it, is ignored and the URL rewritten without it", async (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?model=id-a&period=2025-q3");
  const opened = await mountTrafficControls(new FakeElement("div"), FAMILIES, page.context, page.explorer);
  assert.deepEqual(opened, { ...EVERYTHING, period: "2025-q3" });
  globalThis.window.location = new URL(`${PAGE_ADDRESS}?family=kin&model=id-z`);
  await mountTrafficControls(new FakeElement("div"), FAMILIES, page.context, page.explorer);
  assert.deepEqual(page.replaced, ["period=2025-q3", "family=kin"]);
});

test("choosing a family reads its models into the model drop-down, then writes and draws it", async (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?endpoint=chat");
  const row = new FakeElement("div");
  await mountTrafficControls(row, FAMILIES, page.context, page.explorer);
  const { family, model } = controlsOf(row);
  family.value = "kin";
  family.dispatch("change");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(page.asked, ["kin"]);
  assert.deepEqual(optionsOf(model)[0], ["", "All Kin models"]);
  assert.equal(model.disabled, false);
  assert.deepEqual(page.replaced, ["endpoint=chat&family=kin"]);
  assert.deepEqual(page.drawn, [{ ...EVERYTHING, family: "kin", endpoint: "chat" }]);
});

test("a return to an entry of another choice shows and draws it, its family too; of the same, nothing", async (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?family=kin&model=id-a");
  const row = new FakeElement("div");
  await mountTrafficControls(row, FAMILIES, page.context, page.explorer);
  const [onReturn] = page.returns;
  await onReturn();
  assert.deepEqual(page.drawn, []);
  globalThis.window.location = new URL(`${PAGE_ADDRESS}?endpoint=completion`);
  await onReturn();
  assert.deepEqual(page.drawn, [{ ...EVERYTHING, endpoint: "completion" }]);
  assert.equal(controlsOf(row).family.value, "");
  assert.equal(controlsOf(row).model.disabled, true);
  globalThis.window.location = new URL(`${PAGE_ADDRESS}?family=kin`);
  await onReturn();
  assert.deepEqual(page.drawn.at(-1), { ...EVERYTHING, family: "kin" });
  assert.equal(controlsOf(row).family.value, "kin");
  assert.deepEqual(page.replaced, []);
});

test("a family whose models cannot be read puts the family drop-down back on the family shown", async (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?family=kin");
  const row = new FakeElement("div");
  await mountTrafficControls(row, FAMILIES, page.context, page.explorer);
  const errors = [];
  page.explorer.onError = (error) => errors.push(error.message);
  page.explorer.modelsOf = () => Promise.reject(new Error("Other's answer was not read"));
  const { family } = controlsOf(row);
  family.value = "other";
  family.dispatch("change");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(errors, ["Other's answer was not read"]);
  assert.equal(family.value, "kin");
  assert.deepEqual(page.replaced, []);
  assert.deepEqual(page.drawn, []);
});

test("a return whose family is still being read when the URL moves on is left for the later return", async (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?endpoint=chat");
  const row = new FakeElement("div");
  await mountTrafficControls(row, FAMILIES, page.context, page.explorer);
  const [onReturn] = page.returns;
  const kinModels = Promise.withResolvers();
  page.explorer.modelsOf = () => kinModels.promise;
  globalThis.window.location = new URL(`${PAGE_ADDRESS}?family=kin`);
  const returnToKin = onReturn();
  globalThis.window.location = new URL(`${PAGE_ADDRESS}?endpoint=completion`);
  await onReturn();
  kinModels.resolve(KIN_MODELS);
  await returnToKin;
  assert.deepEqual(page.drawn, [{ ...EVERYTHING, endpoint: "completion" }]);
  assert.equal(controlsOf(row).family.value, "");
  assert.equal(controlsOf(row).model.disabled, true);
});
