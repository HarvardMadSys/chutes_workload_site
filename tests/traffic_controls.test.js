/**
 * The Traffic Explorer's controls (`traffic/traffic_controls.js`): the drop-downs, their entries and changes, the URL's
 * choice they open on and write, and Back and Forward. The period buttons and the slider's released range are tested
 * in `traffic_controls_period_buttons.test.js`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { mountTrafficControls, renderControls } from "../site/js/traffic/traffic_controls.js";
import { familyChoices, modelChoices, NO_FAMILY_MODEL_CHOICES } from "../site/js/traffic/traffic_filter.js";
import { controlsOf, EVERYTHING, FakeElement, PAGE_ADDRESS, useFakeDocument } from "./fake_page.js";

// The trace's days, as far as the period buttons read them: its first and last, and each quarter's first and last.
const DAYS = [
  "2025-04-11", "2025-06-30", "2025-07-01", "2025-09-30", "2025-10-01", "2025-12-31", "2026-01-01", "2026-03-31",
  "2026-04-12",
];

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

// The controls' entries with no family chosen, and what they are mounted with: the families and the trace's days.
const NO_FAMILY_ENTRIES = { families: FAMILIES, models: NO_FAMILY_MODEL_CHOICES, days: DAYS };
const MOUNT_ENTRIES = { families: FAMILIES, days: DAYS };

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

// Whether each period button of the controls row `row` shows pressed, "true" or "false".
function pressedButtons(row) {
  return row.querySelectorAll(".period-button").map((button) => button.getAttribute("aria-pressed"));
}

// The options of a drop-down as `[value, text]`.
function optionsOf(select) {
  return select.children.map((option) => [option.value, option.textContent]);
}

test("the family drop-down lists All families and the families; the model one waits for a family", (context) => {
  useFakeDocument(context);
  const row = new FakeElement("div");
  renderControls(row, EVERYTHING, NO_FAMILY_ENTRIES, () => undefined);
  const { family, model, endpoint, metric } = controlsOf(row);
  assert.deepEqual(optionsOf(family), [["", "All families"], ["kin", "Kin"], ["other", "Other"]]);
  assert.deepEqual(optionsOf(model), [["", "Choose a family"]]);
  assert.equal(model.disabled, true);
  assert.deepEqual(endpoint.children.map((option) => option.textContent), [
    "All endpoints", "Chat", "Chat stream", "Completion", "Completion stream", "Other",
  ]);
  const metrics = [["", "Requests"], ["input_tokens", "Input tokens"], ["output_tokens", "Output tokens"]];
  assert.deepEqual(optionsOf(metric), metrics);
  const names = row.querySelectorAll(".control-field-name").map((name) => name.textContent);
  assert.deepEqual(names, ["Family", "Model", "Endpoint", "Metric", "Period"]);
});

test("with a family chosen the model drop-down lists its models by requests, then Other <family>", (context) => {
  useFakeDocument(context);
  const row = new FakeElement("div");
  const choice = { ...EVERYTHING, family: "kin", model: "id-a" };
  renderControls(row, choice, { families: FAMILIES, models: KIN_MODELS, days: DAYS }, () => undefined);
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
  renderControls(row, choice, { families: FAMILIES, models: KIN_MODELS, days: DAYS }, (part) => chosen.push(part));
  const { family, model, endpoint, metric } = controlsOf(row);
  model.value = "id-b";
  model.dispatch("change");
  endpoint.value = "chat_stream";
  endpoint.dispatch("change");
  metric.value = "output_tokens";
  metric.dispatch("change");
  family.value = "other";
  family.dispatch("change");
  assert.deepEqual(chosen, [
    { model: "id-b" }, { endpoint: "chat_stream" }, { metric: "output_tokens" }, { family: "other", model: "" },
  ]);
});

test("the controls open on the URL's choice; a change writes it, other keys kept, and draws it", async (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?tab=x&from=2025-07-01&to=2025-09-30&metric=input_tokens#traffic");
  const row = new FakeElement("div");
  const opened = await mountTrafficControls(row, MOUNT_ENTRIES, page.context, page.explorer);
  const range = { from: "2025-07-01", to: "2025-09-30" };
  assert.deepEqual(opened.choice, { ...EVERYTHING, ...range, metric: "input_tokens" });
  assert.deepEqual(page.asked, []);
  assert.deepEqual(pressedButtons(row), ["false", "false", "true", "false", "false"]);
  const { endpoint } = controlsOf(row);
  endpoint.value = "chat";
  endpoint.dispatch("change");
  assert.deepEqual(page.replaced, ["tab=x&from=2025-07-01&to=2025-09-30&metric=input_tokens&endpoint=chat"]);
  assert.deepEqual(page.drawn, [{ ...EVERYTHING, ...range, endpoint: "chat", metric: "input_tokens" }]);
});

test("a URL's family and model open with the family's models read and the model chosen", async (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?family=kin&model=id-b");
  const row = new FakeElement("div");
  const opened = await mountTrafficControls(row, MOUNT_ENTRIES, page.context, page.explorer);
  assert.deepEqual(opened.choice, { ...EVERYTHING, family: "kin", model: "id-b" });
  assert.deepEqual(page.asked, ["kin"]);
  assert.equal(controlsOf(row).model.value, "id-b");
  assert.deepEqual(page.replaced, [], "a URL the choice keeps whole is not rewritten");
});

test("a model key without its family or outside it is ignored, a day outside the trace clipped, and the URL rewritten",
  async (context) => {
    useFakeDocument(context);
    const page = useFakeWindow(context, "?model=id-a&from=2024-01-01&to=2025-09-30");
    const opened = await mountTrafficControls(new FakeElement("div"), MOUNT_ENTRIES, page.context, page.explorer);
    assert.deepEqual(opened.choice, { ...EVERYTHING, to: "2025-09-30" });
    globalThis.window.location = new URL(`${PAGE_ADDRESS}?family=kin&model=id-z&from=2025-10-01&to=2025-07-01`);
    await mountTrafficControls(new FakeElement("div"), MOUNT_ENTRIES, page.context, page.explorer);
    assert.deepEqual(page.replaced, ["to=2025-09-30", "family=kin"], "a from after its to is dropped with it");
  });

test("choosing a family reads its models into the model drop-down, then writes and draws it", async (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?endpoint=chat");
  const row = new FakeElement("div");
  await mountTrafficControls(row, MOUNT_ENTRIES, page.context, page.explorer);
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
  await mountTrafficControls(row, MOUNT_ENTRIES, page.context, page.explorer);
  const [onReturn] = page.returns;
  await onReturn();
  assert.deepEqual(page.drawn, []);
  globalThis.window.location = new URL(`${PAGE_ADDRESS}?endpoint=completion&from=2026-01-01&to=2026-03-31`);
  await onReturn();
  const range = { from: "2026-01-01", to: "2026-03-31" };
  assert.deepEqual(page.drawn, [{ ...EVERYTHING, endpoint: "completion", ...range }]);
  assert.equal(controlsOf(row).family.value, "");
  assert.equal(controlsOf(row).model.disabled, true);
  assert.deepEqual(pressedButtons(row), ["false", "false", "false", "false", "true"]);
  globalThis.window.location = new URL(`${PAGE_ADDRESS}?family=kin`);
  await onReturn();
  assert.deepEqual(page.drawn.at(-1), { ...EVERYTHING, family: "kin" });
  assert.equal(controlsOf(row).family.value, "kin");
  assert.deepEqual(pressedButtons(row), ["true", "false", "false", "false", "false"]);
  assert.deepEqual(page.replaced, []);
});

test("a family whose models cannot be read puts the family drop-down back on the family shown", async (context) => {
  useFakeDocument(context);
  const page = useFakeWindow(context, "?family=kin");
  const row = new FakeElement("div");
  await mountTrafficControls(row, MOUNT_ENTRIES, page.context, page.explorer);
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
  await mountTrafficControls(row, MOUNT_ENTRIES, page.context, page.explorer);
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

test("a URL's family that cannot be read opens the controls without it, the error given back to show",
  async (context) => {
    useFakeDocument(context);
    const page = useFakeWindow(context, "?family=kin&endpoint=chat");
    const failing = { ...page.explorer, modelsOf: async () => Promise.reject(new Error("no kin")) };
    const row = new FakeElement("div");
    const opened = await mountTrafficControls(row, MOUNT_ENTRIES, page.context, failing);
    assert.deepEqual(opened.choice, { ...EVERYTHING, endpoint: "chat" });
    assert.equal(opened.error.message, "no kin");
    assert.equal(controlsOf(row).family.value, "");
    assert.equal(controlsOf(row).model.disabled, true);
    assert.equal(controlsOf(row).endpoint.value, "chat");
    assert.deepEqual(page.replaced, [], "the URL keeps the family, so that a reload reads it again");
  });
