/**
 * The Traffic Explorer's period buttons in its controls (`traffic/traffic_controls.js`): the one pressed for a range, a
 * press choosing its quarter's days, and the range the sliders are released on, written to the URL and followed by the
 * buttons.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { mountTrafficControls, renderControls } from "../site/js/traffic/traffic_controls.js";
import { familyChoices, NO_FAMILY_MODEL_CHOICES } from "../site/js/traffic/traffic_filter.js";
import { EVERYTHING, FakeElement, PAGE_ADDRESS, useFakeDocument } from "./fake_page.js";

// The trace's days, as far as the period buttons read them: its first and last, and each quarter's first and last.
const DAYS = [
  "2025-04-11", "2025-06-30", "2025-07-01", "2025-09-30", "2025-10-01", "2025-12-31", "2026-01-01", "2026-03-31",
  "2026-04-12",
];

// One family, Kin, as the family drop-down offers it; no test here chooses it.
const FAMILIES = familyChoices([{ family: "Kin", family_slug: "kin", requests: 45 }]);

// The controls' entries with no family chosen, and what they are mounted with: the families and the trace's days.
const NO_FAMILY_ENTRIES = { families: FAMILIES, models: NO_FAMILY_MODEL_CHOICES, days: DAYS };
const MOUNT_ENTRIES = { families: FAMILIES, days: DAYS };

/**
 * Make a stand-in the global window for the test of `context`, opened at `query`: `{ replaced, drawn, context,
 * explorer }`, the queries written through the context's `replaceQuery`, in order, the choices the explorer was asked
 * to draw, and the context and the explorer's part given to the controls.
 */
function useFakeWindow(context, query) {
  globalThis.window = { location: new URL(`${PAGE_ADDRESS}${query}`) };
  context.after(() => delete globalThis.window);
  const page = { replaced: [], drawn: [] };
  page.context = { replaceQuery: (params) => page.replaced.push(params.toString()), onReturn: () => undefined };
  page.explorer = {
    modelsOf: async () => assert.fail("no family is chosen"),
    onChange: (choice) => page.drawn.push(choice),
    onError: (error) => assert.fail(error),
  };
  return page;
}

// The group of period buttons of the controls row `row`, its fifth field's.
function periodButtons(row) {
  return row.children[4].children[1];
}

// Whether each period button of the controls row `row` shows pressed, "true" or "false".
function pressedButtons(row) {
  return periodButtons(row).children.map((button) => button.getAttribute("aria-pressed"));
}

test("the button whose days are the range is pressed alone; a press presses it and chooses its days", (context) => {
  useFakeDocument(context);
  const row = new FakeElement("div");
  const chosen = [];
  const choice = { ...EVERYTHING, from: "2026-01-01", to: "2026-03-31" };
  renderControls(row, choice, NO_FAMILY_ENTRIES, (part) => chosen.push(part));
  const buttons = periodButtons(row).children;
  assert.deepEqual(buttons.map((button) => button.textContent), ["All", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26"]);
  assert.deepEqual(pressedButtons(row), ["false", "false", "false", "false", "true"]);
  buttons[2].dispatch("click");
  assert.deepEqual(pressedButtons(row), ["false", "false", "true", "false", "false"]);
  buttons[1].dispatch("click");
  buttons[0].dispatch("click");
  assert.deepEqual(pressedButtons(row), ["true", "false", "false", "false", "false"]);
  const quarters = [{ from: "2025-07-01", to: "2025-09-30" }, { from: "", to: "2025-06-30" }, { from: "", to: "" }];
  assert.deepEqual(chosen, quarters);
  assert.equal(periodButtons(row).getAttribute("role"), "group");
});

test("the sliders' range, once released, is written to the URL and presses its button, and is not drawn again",
  async (context) => {
    useFakeDocument(context);
    const page = useFakeWindow(context, "?endpoint=chat");
    const row = new FakeElement("div");
    const controls = await mountTrafficControls(row, MOUNT_ENTRIES, page.context, page.explorer);
    controls.chooseRange({ from: "2025-10-01", to: "2025-12-31" });
    assert.deepEqual(page.replaced, ["endpoint=chat&from=2025-10-01&to=2025-12-31"]);
    assert.deepEqual(pressedButtons(row), ["false", "false", "false", "true", "false"]);
    controls.chooseRange({ from: "2025-10-01", to: "2025-12-01" });
    assert.deepEqual(pressedButtons(row), ["false", "false", "false", "false", "false"]);
    assert.deepEqual(page.drawn, []);
    const metric = row.children[3].children[1]; // the metric drop-down, the row's fourth field's
    metric.value = "input_tokens";
    metric.dispatch("change");
    const range = { from: "2025-10-01", to: "2025-12-01" };
    assert.deepEqual(page.drawn, [{ ...EVERYTHING, endpoint: "chat", metric: "input_tokens", ...range }]);
  });
