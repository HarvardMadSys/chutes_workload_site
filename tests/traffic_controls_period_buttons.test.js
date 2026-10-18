/**
 * The Traffic Explorer's period buttons in its controls (`traffic/traffic_controls.js`): the one pressed for a range, a
 * press choosing its quarter's days, and the range a handle of the slider is released on, written to the URL and
 * followed by the buttons.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { mountTrafficControls, renderControls } from "../site/js/traffic/traffic_controls.js";
import { FakeElement, useFakePage } from "./fake_page.js";
import {
  controlsOf, EVERYTHING, MOUNT_ENTRIES, NO_FAMILY_ENTRIES, pressedButtons, recordingExplorer,
} from "./traffic_fixtures.js";

test("the button whose days are the range is pressed alone; a press presses it and chooses its days", (context) => {
  useFakePage(context);
  const row = new FakeElement("div");
  const chosen = [];
  const choice = { ...EVERYTHING, from: "2026-01-01", to: "2026-03-31" };
  renderControls(row, choice, NO_FAMILY_ENTRIES, (part) => chosen.push(part));
  const buttons = row.querySelectorAll(".period-button");
  assert.deepEqual(buttons.map((button) => button.textContent), ["All", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26"]);
  assert.deepEqual(pressedButtons(buttons), ["false", "false", "false", "false", "true"]);
  buttons[2].dispatch("click");
  assert.deepEqual(pressedButtons(buttons), ["false", "false", "true", "false", "false"]);
  buttons[1].dispatch("click");
  buttons[0].dispatch("click");
  assert.deepEqual(pressedButtons(buttons), ["true", "false", "false", "false", "false"]);
  const quarters = [{ from: "2025-07-01", to: "2025-09-30" }, { from: "", to: "2025-06-30" }, { from: "", to: "" }];
  assert.deepEqual(chosen, quarters);
  assert.equal(controlsOf(row).periods.getAttribute("role"), "group");
});

test("the range a handle is released on is written to the URL and presses its button, and is not drawn again",
  async (context) => {
    useFakePage(context, { query: "?endpoint=chat" });
    const recorded = recordingExplorer();
    const row = new FakeElement("div");
    const controls = await mountTrafficControls(row, MOUNT_ENTRIES, recorded.context, recorded.explorer);
    const buttons = row.querySelectorAll(".period-button");
    controls.chooseRange({ from: "2025-10-01", to: "2025-12-31" });
    assert.deepEqual(recorded.replaced, ["endpoint=chat&from=2025-10-01&to=2025-12-31"]);
    assert.deepEqual(pressedButtons(buttons), ["false", "false", "false", "true", "false"]);
    controls.chooseRange({ from: "2025-10-01", to: "2025-12-01" });
    assert.deepEqual(pressedButtons(buttons), ["false", "false", "false", "false", "false"]);
    assert.deepEqual(recorded.drawn, []);
    const { metric } = controlsOf(row);
    metric.value = "input_tokens";
    metric.dispatch("change");
    const range = { from: "2025-10-01", to: "2025-12-01" };
    assert.deepEqual(recorded.drawn, [{ ...EVERYTHING, endpoint: "chat", metric: "input_tokens", ...range }]);
    assert.deepEqual(recorded.asked, [], "no family is chosen");
  });
