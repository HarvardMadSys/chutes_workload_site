/**
 * The Traffic Explorer's tests' fixtures: the choice of everything, the trace's days and families as the controls are
 * mounted with them, the family Kin's daily answer by model and a daily row of an answer, the controls of a controls row and
 * which period buttons show pressed, and the page's part the controls are given, recording what they ask of it.
 */

import assert from "node:assert/strict";

import { familyChoices, modelChoices, NO_FAMILY_MODEL_CHOICES } from "../site/js/traffic/traffic_choice.js";

/** The Traffic Explorer's choice of everything: every family, every model, every endpoint group, requests, every day. */
export const EVERYTHING = Object.freeze({ family: "", model: "", endpoint: "", metric: "", from: "", to: "" });

/** The trace's days, as far as the controls read them: its first and last, and each quarter's first and last. */
export const DAYS = Object.freeze([
  "2025-04-11", "2025-06-30", "2025-07-01", "2025-09-30", "2025-10-01", "2025-12-31", "2026-01-01", "2026-03-31",
  "2026-04-12",
]);

/** Two families, Kin and Other, as the family drop-down offers them. */
export const FAMILIES = familyChoices([
  { family: "Kin", family_slug: "kin", requests: 45 },
  { family: "Other", family_slug: "other", requests: 5 },
]);

/** What the controls are mounted with: the families and the trace's days. */
export const MOUNT_ENTRIES = Object.freeze({ families: FAMILIES, days: DAYS });

/** The controls' entries with no family chosen: the families, the model drop-down's waiting entry, the trace's days. */
export const NO_FAMILY_ENTRIES = Object.freeze({ families: FAMILIES, models: NO_FAMILY_MODEL_CHOICES, days: DAYS });

/**
 * A row of a daily answer of the explorer, by family or by model: on 2025-07-01, of the endpoint group chat, its
 * requests and every count zero and every sum null, but for the fields given.
 */
export function dayRow(fields) {
  return {
    day: "2025-07-01", endpoint_group: "chat", requests: 0, input_tokens: null, input_counted: 0,
    output_tokens: null, output_counted: 0, ttft_sum: null, ttft_counted: 0, ...fields,
  };
}

/** The family Kin's daily answer by model: its two named models and its Other over three days and two endpoint groups. */
export const KIN_ROWS = Object.freeze([
  dayRow({ day: "2025-06-30", chute_id: "id-a", model: "A", requests: 10 }),
  dayRow({ chute_id: "id-a", model: "A", endpoint_group: "chat_stream", requests: 30 }),
  dayRow({ chute_id: "id-b", model: "B", requests: 50 }),
  dayRow({ chute_id: null, model: "Other Kin", requests: 5 }),
  dayRow({ day: "2025-10-01", chute_id: "id-b", model: "B", endpoint_group: "chat_stream", requests: 20 }),
]);

/**
 * The Traffic Explorer's controls in its controls row `row`: `{ family, model, endpoint, metric, periods }`, the
 * family, model, endpoint and metric drop-downs, in the row's order, and the group of period buttons.
 */
export function controlsOf(row) {
  const [family, model, endpoint, metric] = row.querySelectorAll(".control-field select");
  return { family, model, endpoint, metric, periods: row.querySelector(".period-buttons") };
}

/** Whether each of the period buttons `buttons` shows pressed, "true" or "false". */
export function pressedButtons(buttons) {
  return buttons.map((button) => button.getAttribute("aria-pressed"));
}

/**
 * The page's part the controls are given, recording what they ask of it: `{ context, explorer, replaced, returns,
 * drawn, asked }`, the context and the explorer's part to mount the controls with, then the queries written through
 * the context's `replaceQuery`, the functions given to its `onReturn`, which Back and Forward call, the choices the
 * explorer was asked to draw, and the families whose models were asked for, each in order. A family's models are
 * Kin's (`KIN_ROWS`); an error the controls give back fails the test.
 */
export function recordingExplorer() {
  const recorded = { replaced: [], returns: [], drawn: [], asked: [] };
  recorded.context = {
    replaceQuery: (params) => recorded.replaced.push(params.toString()),
    onReturn: (redraw) => recorded.returns.push(redraw),
  };
  recorded.explorer = {
    modelsOf: async (family) => modelsAskedFor(recorded, family),
    onChange: (choice) => recorded.drawn.push(choice),
    onError: (error) => assert.fail(error),
  };
  return recorded;
}

// The model drop-down's entries of the family `family`, Kin's for each, the family recorded as asked for.
function modelsAskedFor(recorded, family) {
  recorded.asked.push(family);
  return modelChoices(KIN_ROWS, "Kin");
}
