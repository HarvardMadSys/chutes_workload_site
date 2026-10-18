/**
 * The Traffic Explorer's controls (`traffic/traffic_controls.js`): the drop-downs, their entries and changes, the URL's
 * choice they open on and write, and Back and Forward. The period buttons and the slider's released range are tested
 * in `traffic_controls_period_buttons.test.js`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { mountTrafficControls, renderControls } from "../site/js/traffic/traffic_controls.js";
import { modelChoices } from "../site/js/traffic/traffic_choice.js";
import { FakeElement, settled, useFakePage } from "./fake_page.js";
import {
  controlsOf, DAYS, EVERYTHING, FAMILIES, KIN_ROWS, MOUNT_ENTRIES, NO_FAMILY_ENTRIES, pressedButtons,
  recordingExplorer,
} from "./traffic_fixtures.js";

// The model drop-down's entries with Kin chosen.
const KIN_MODELS = modelChoices(KIN_ROWS, "Kin");

// The options of a drop-down as `[value, text]`.
function optionsOf(select) {
  return select.children.map((option) => [option.value, option.textContent]);
}

test("the family drop-down lists All families and the families; the model one waits for a family", (context) => {
  useFakePage(context);
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
  useFakePage(context);
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
  useFakePage(context);
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
  useFakePage(context, { query: "?tab=x&from=2025-07-01&to=2025-09-30&metric=input_tokens#traffic" });
  const recorded = recordingExplorer();
  const row = new FakeElement("div");
  const opened = await mountTrafficControls(row, MOUNT_ENTRIES, recorded.context, recorded.explorer);
  const range = { from: "2025-07-01", to: "2025-09-30" };
  assert.deepEqual(opened.choice, { ...EVERYTHING, ...range, metric: "input_tokens" });
  assert.deepEqual(recorded.asked, []);
  assert.deepEqual(pressedButtons(row.querySelectorAll(".period-button")), ["false", "false", "true", "false", "false"]);
  const { endpoint } = controlsOf(row);
  endpoint.value = "chat";
  endpoint.dispatch("change");
  assert.deepEqual(recorded.replaced, ["tab=x&from=2025-07-01&to=2025-09-30&metric=input_tokens&endpoint=chat"]);
  assert.deepEqual(recorded.drawn, [{ ...EVERYTHING, ...range, endpoint: "chat", metric: "input_tokens" }]);
});

test("a URL's family and model open with the family's models read and the model chosen", async (context) => {
  useFakePage(context, { query: "?family=kin&model=id-b" });
  const recorded = recordingExplorer();
  const row = new FakeElement("div");
  const opened = await mountTrafficControls(row, MOUNT_ENTRIES, recorded.context, recorded.explorer);
  assert.deepEqual(opened.choice, { ...EVERYTHING, family: "kin", model: "id-b" });
  assert.deepEqual(recorded.asked, ["kin"]);
  assert.equal(controlsOf(row).model.value, "id-b");
  assert.deepEqual(recorded.replaced, [], "a URL the choice keeps whole is not rewritten");
});

test("a model key without its family or outside it is ignored, a day outside the trace clipped, and the URL rewritten",
  async (context) => {
    const { history } = useFakePage(context, { query: "?model=id-a&from=2024-01-01&to=2025-09-30" });
    const recorded = recordingExplorer();
    const opened = await mountTrafficControls(new FakeElement("div"), MOUNT_ENTRIES, recorded.context, recorded.explorer);
    assert.deepEqual(opened.choice, { ...EVERYTHING, to: "2025-09-30" });
    history.replaceState(null, "", "?family=kin&model=id-z&from=2025-10-01&to=2025-07-01");
    await mountTrafficControls(new FakeElement("div"), MOUNT_ENTRIES, recorded.context, recorded.explorer);
    assert.deepEqual(recorded.replaced, ["to=2025-09-30", "family=kin"], "a from after its to is dropped with it");
  });

test("choosing a family reads its models into the model drop-down, then writes and draws it", async (context) => {
  useFakePage(context, { query: "?endpoint=chat" });
  const recorded = recordingExplorer();
  const row = new FakeElement("div");
  await mountTrafficControls(row, MOUNT_ENTRIES, recorded.context, recorded.explorer);
  const { family, model } = controlsOf(row);
  family.value = "kin";
  family.dispatch("change");
  await settled();
  assert.deepEqual(recorded.asked, ["kin"]);
  assert.deepEqual(optionsOf(model)[0], ["", "All Kin models"]);
  assert.equal(model.disabled, false);
  assert.deepEqual(recorded.replaced, ["endpoint=chat&family=kin"]);
  assert.deepEqual(recorded.drawn, [{ ...EVERYTHING, family: "kin", endpoint: "chat" }]);
});

test("a return to an entry of another choice shows and draws it, its family too; of the same, nothing", async (context) => {
  const { history } = useFakePage(context, { query: "?family=kin&model=id-a" });
  const recorded = recordingExplorer();
  const row = new FakeElement("div");
  await mountTrafficControls(row, MOUNT_ENTRIES, recorded.context, recorded.explorer);
  const [onReturn] = recorded.returns;
  await onReturn();
  assert.deepEqual(recorded.drawn, []);
  history.pushState(null, "", "?endpoint=completion&from=2026-01-01&to=2026-03-31");
  await onReturn();
  const range = { from: "2026-01-01", to: "2026-03-31" };
  assert.deepEqual(recorded.drawn, [{ ...EVERYTHING, endpoint: "completion", ...range }]);
  assert.equal(controlsOf(row).family.value, "");
  assert.equal(controlsOf(row).model.disabled, true);
  assert.deepEqual(pressedButtons(row.querySelectorAll(".period-button")), ["false", "false", "false", "false", "true"]);
  history.pushState(null, "", "?family=kin");
  await onReturn();
  assert.deepEqual(recorded.drawn.at(-1), { ...EVERYTHING, family: "kin" });
  assert.equal(controlsOf(row).family.value, "kin");
  assert.deepEqual(pressedButtons(row.querySelectorAll(".period-button")), ["true", "false", "false", "false", "false"]);
  assert.deepEqual(recorded.replaced, []);
});

test("a family whose models cannot be read puts the family drop-down back on the family shown", async (context) => {
  useFakePage(context, { query: "?family=kin" });
  const recorded = recordingExplorer();
  const row = new FakeElement("div");
  await mountTrafficControls(row, MOUNT_ENTRIES, recorded.context, recorded.explorer);
  const errors = [];
  recorded.explorer.onError = (error) => errors.push(error.message);
  recorded.explorer.modelsOf = () => Promise.reject(new Error("Other's answer was not read"));
  const { family } = controlsOf(row);
  family.value = "other";
  family.dispatch("change");
  await settled();
  assert.deepEqual(errors, ["Other's answer was not read"]);
  assert.equal(family.value, "kin");
  assert.deepEqual(recorded.replaced, []);
  assert.deepEqual(recorded.drawn, []);
});

test("a return whose family is still being read when the URL moves on is left for the later return", async (context) => {
  const { history } = useFakePage(context, { query: "?endpoint=chat" });
  const recorded = recordingExplorer();
  const row = new FakeElement("div");
  await mountTrafficControls(row, MOUNT_ENTRIES, recorded.context, recorded.explorer);
  const [onReturn] = recorded.returns;
  const kinModels = Promise.withResolvers();
  recorded.explorer.modelsOf = () => kinModels.promise;
  history.pushState(null, "", "?family=kin");
  const returnToKin = onReturn();
  history.pushState(null, "", "?endpoint=completion");
  await onReturn();
  kinModels.resolve(KIN_MODELS);
  await returnToKin;
  assert.deepEqual(recorded.drawn, [{ ...EVERYTHING, endpoint: "completion" }]);
  assert.equal(controlsOf(row).family.value, "");
  assert.equal(controlsOf(row).model.disabled, true);
});

test("a URL's family that cannot be read opens the controls without it, the error given back to show",
  async (context) => {
    useFakePage(context, { query: "?family=kin&endpoint=chat" });
    const recorded = recordingExplorer();
    const failing = { ...recorded.explorer, modelsOf: async () => Promise.reject(new Error("no kin")) };
    const row = new FakeElement("div");
    const opened = await mountTrafficControls(row, MOUNT_ENTRIES, recorded.context, failing);
    assert.deepEqual(opened.choice, { ...EVERYTHING, endpoint: "chat" });
    assert.equal(opened.error.message, "no kin");
    assert.equal(controlsOf(row).family.value, "");
    assert.equal(controlsOf(row).model.disabled, true);
    assert.equal(controlsOf(row).endpoint.value, "chat");
    assert.deepEqual(recorded.replaced, [], "the URL keeps the family, so that a reload reads it again");
  });
