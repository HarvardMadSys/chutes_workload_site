/**
 * The Traffic Explorer's controls: the family, model, endpoint and metric drop-downs and the period buttons, kept in
 * step with the URL, which holds the explorer's choice (`TrafficChoice` of `traffic/traffic_choice.js`). The model
 * drop-down is disabled until a family is chosen, then offers the family's models, read from the family's answer. A
 * period button sets the day range to its days and shows pressed while the range is its days
 * (`traffic/traffic_range.js`). A change writes the new choice to the URL; Back or Forward to an entry of another
 * choice shows that one; either then hands the choice to the explorer to draw. What the two give each other is
 * `ControlsCallbacks` and `MountedControls`.
 */

import { textElement } from "../shared/figure.js";
import {
  endpointChoices, isSameChoice, metricChoices, NO_FAMILY_MODEL_CHOICES, readTrafficChoice, writeTrafficChoice,
} from "./traffic_choice.js";
import { PERIODS, periodRange, pressedPeriod } from "./traffic_range.js";

// The period field's name, which also names its group of buttons for a screen reader, and the id that ties the two.
const PERIOD_FIELD_NAME = "Period";
const PERIOD_NAME_ID = "traffic-period-name";

/**
 * What the explorer gives the controls.
 * @typedef {object} ControlsCallbacks
 * @property {function} modelsOf  `modelsOf(family)` resolves to the model drop-down's entries (`modelChoices`) for
 *   the family whose slug is `family`
 * @property {function} onChange  `onChange(choice)` draws a `TrafficChoice`
 * @property {function} onError  `onError(error)` shows a family's answer that cannot be read
 */

/**
 * What the controls give the explorer once mounted.
 * @typedef {object} MountedControls
 * @property {TrafficChoice} choice  the choice shown
 * @property {Error|null} error  the error of a URL's family that cannot be read, which the explorer shows rather than
 *   draw; null when it is read
 * @property {function} chooseRange  `chooseRange(range)`, the slider's way in: the range a handle is released on,
 *   which the slider has drawn, is written to the URL and the period buttons follow it; the explorer is not asked to
 *   draw it again
 */

/**
 * Draw the controls into `row` showing the URL's choice, and resolve to the `MountedControls` once the choice's
 * family's models are read. `entries` is `{ families, days }`, the family drop-down's entries (`familyChoices`) and
 * the trace's days; `explorer` is the `ControlsCallbacks`. Then:
 * - a key of the URL the choice does not keep, such as a model with no family or not among the family's, or a day
 *   outside the trace's, is rewritten with `context.replaceQuery`;
 * - if the URL's family cannot be read, the controls show the choice without it, as a failed choice of a family leaves
 *   them;
 * - a change writes the new choice to the URL the same way and calls `explorer.onChange(choice)`;
 * - a return to a history entry (`context.onReturn`) whose URL holds another choice than the one shown draws the
 *   controls again showing it and calls `explorer.onChange(choice)`.
 */
export async function mountTrafficControls(row, entries, context, explorer) {
  const params = new URLSearchParams(window.location.search);
  const opened = await openedChoice(params, entries, explorer.modelsOf);
  const controls = { row, ...entries, context, explorer, shown: opened.choice, models: opened.models };
  const written = writeTrafficChoice(params, opened.choice);
  // A family that could not be read stays in the URL, so that a reload tries it again.
  if (opened.error === null && written.toString() !== params.toString()) {
    context.replaceQuery(written);
  }
  context.onReturn(() => showReturnedChoice(controls).catch(explorer.onError));
  drawControls(controls);
  return { choice: opened.choice, error: opened.error, chooseRange: (range) => chooseRange(controls, range) };
}

/**
 * Fill `row` with the controls showing `choice`: the family drop-down of `entries.families`, the model drop-down of
 * `entries.models` (disabled while no family is chosen), the endpoint and metric drop-downs and the period buttons over
 * the trace's `entries.days`, the one whose days are the choice's pressed (`pressedPeriod`). A change calls `onChoose`
 * with the part of the choice it changes: `{ family, model: "" }`, `{ model }`, `{ endpoint }`, `{ metric }` or a
 * button's `{ from, to }`. Returns the drop-downs of families and of models and the period buttons,
 * `{ family, model, periods }`.
 */
export function renderControls(row, choice, entries, onChoose) {
  const family = choiceSelect(entries.families, choice.family);
  family.addEventListener("change", () => onChoose({ family: family.value, model: "" }));
  const model = choiceSelect(entries.models, choice.model);
  model.disabled = choice.family === "";
  model.addEventListener("change", () => onChoose({ model: model.value }));
  const endpoint = choiceSelect(endpointChoices(), choice.endpoint);
  endpoint.addEventListener("change", () => onChoose({ endpoint: endpoint.value }));
  const metric = choiceSelect(metricChoices(), choice.metric);
  metric.addEventListener("change", () => onChoose({ metric: metric.value }));
  const periods = periodButtons(choice, entries.days, onChoose);
  row.replaceChildren(
    labelledField("Family", family), labelledField("Model", model), labelledField("Endpoint", endpoint),
    labelledField("Metric", metric), periodField(periods),
  );
  return { family, model, periods };
}

/** Press the period button of `buttons` that `pressedPeriod(choice, days)` gives alone; none where it gives none. */
export function pressPeriodButtons(buttons, choice, days) {
  const pressed = pressedPeriod(choice, days);
  for (const [index, button] of buttons.entries()) {
    button.setAttribute("aria-pressed", String(PERIODS[index] === pressed));
  }
}

/**
 * The choice the URL's keys `params` name, among the families and the trace's days of `entries` and the URL's family's
 * models, which `modelsOf` gives. Resolves to `{ choice, models }`, `models` being the model drop-down's entries.
 */
async function urlChoice(params, { families, days }, modelsOf) {
  const familyValues = families.map((entry) => entry.value);
  const { family } = readTrafficChoice(params, familyValues, [], days);
  const models = await familyModels(modelsOf, family);
  const choice = readTrafficChoice(params, familyValues, models.map((entry) => entry.value), days);
  return { choice, models };
}

/**
 * The choice the URL's keys `params` name when the page opens, `{ choice, models, error }`: as `urlChoice` gives it,
 * with `error` null; if the URL's family's models cannot be read, the choice without the family, the model
 * drop-down's "Choose a family", and the error.
 */
async function openedChoice(params, entries, modelsOf) {
  try {
    return { ...(await urlChoice(params, entries, modelsOf)), error: null };
  } catch (error) {
    const familyValues = entries.families.map((entry) => entry.value);
    const choice = { ...readTrafficChoice(params, familyValues, [], entries.days), family: "" };
    return { choice, models: NO_FAMILY_MODEL_CHOICES, error };
  }
}

// The model drop-down's entries for the family whose slug is `family`; with none chosen, its one "Choose a family".
async function familyModels(modelsOf, family) {
  return family === "" ? NO_FAMILY_MODEL_CHOICES : modelsOf(family);
}

// Draw the controls showing the choice shown, and keep their drop-downs of families and of models and their buttons.
function drawControls(controls) {
  const entries = { families: controls.families, models: controls.models, days: controls.days };
  const onChoose = (part) => choosePart(controls, part).catch(controls.explorer.onError);
  controls.selects = renderControls(controls.row, controls.shown, entries, onChoose);
}

// A control changed `part` of the choice shown. A new family's models are read and fill the model drop-down first; the
// new choice is then written to the URL and handed on to be drawn.
async function choosePart(controls, part) {
  if (Object.hasOwn(part, "family")) {
    const models = await chosenFamilyModels(controls, part.family);
    if (controls.selects.family.value !== part.family) {
      return; // another family was chosen while this one's models were read, and that choice is drawn instead
    }
    controls.models = models;
    fillSelect(controls.selects.model, models, "");
    controls.selects.model.disabled = part.family === "";
  }
  controls.shown = { ...controls.shown, ...part };
  controls.context.replaceQuery(writeTrafficChoice(new URLSearchParams(window.location.search), controls.shown));
  controls.explorer.onChange(controls.shown);
}

// A handle of the slider was released on `range`, which the slider has drawn: it joins the choice shown and is
// written to the URL, and the period buttons follow it.
function chooseRange(controls, range) {
  controls.shown = { ...controls.shown, ...range };
  controls.context.replaceQuery(writeTrafficChoice(new URLSearchParams(window.location.search), controls.shown));
  pressPeriodButtons(controls.selects.periods, controls.shown, controls.days);
}

// The model drop-down's entries of `family`, just chosen in the family drop-down. If they cannot be read, the family
// drop-down goes back to the family shown, which the URL and the model drop-down still hold, and the error is thrown
// on; null if another family has been chosen since, as `choosePart` then leaves this one.
async function chosenFamilyModels(controls, family) {
  try {
    return await familyModels(controls.explorer.modelsOf, family);
  } catch (error) {
    if (controls.selects.family.value !== family) {
      return null;
    }
    controls.selects.family.value = controls.shown.family;
    throw error;
  }
}

// Back or Forward: an entry whose URL holds another choice is shown and drawn; the same choice, after a change of
// topic, is left as drawn, so its legend keeps the series hidden in it.
async function showReturnedChoice(controls) {
  const search = window.location.search;
  const entries = { families: controls.families, days: controls.days };
  const returned = await urlChoice(new URLSearchParams(search), entries, controls.explorer.modelsOf);
  if (window.location.search !== search) {
    return; // the URL moved on while this entry's family was read, and the entry it moved to is shown instead
  }
  if (isSameChoice(returned.choice, controls.shown)) {
    return;
  }
  controls.shown = returned.choice;
  controls.models = returned.models;
  drawControls(controls);
  controls.explorer.onChange(returned.choice);
}

// One button per period, the one whose days are the range of `choice` pressed; a press chooses its days within the
// trace's `days` and presses its button alone.
function periodButtons(choice, days, onChoose) {
  const buttons = PERIODS.map((period) => textElement("button", "period-button", period.label));
  for (const [index, button] of buttons.entries()) {
    const range = periodRange(PERIODS[index], days);
    button.type = "button";
    button.addEventListener("click", () => choosePeriod(buttons, range, days, onChoose));
  }
  pressPeriodButtons(buttons, choice, days);
  return buttons;
}

// A period button was pressed: press it alone among `buttons` and choose its `range`.
function choosePeriod(buttons, range, days, onChoose) {
  pressPeriodButtons(buttons, range, days);
  onChoose(range);
}

// The period buttons `buttons` under their name, as one field of the controls row, a group for a screen reader.
function periodField(buttons) {
  const field = textElement("div", "control-field period-field", "");
  const name = textElement("span", "control-field-name", PERIOD_FIELD_NAME);
  name.id = PERIOD_NAME_ID;
  const group = textElement("div", "period-buttons", "");
  group.setAttribute("role", "group");
  group.setAttribute("aria-labelledby", PERIOD_NAME_ID);
  group.append(...buttons);
  field.append(name, group);
  return field;
}

// `control` under its name in small capitals, as one field of the controls row.
function labelledField(name, control) {
  const field = textElement("label", "control-field", "");
  field.append(textElement("span", "control-field-name", name), control);
  return field;
}

// A drop-down of `entries`, `[{ value, text }]`, showing the one whose value is `current`.
function choiceSelect(entries, current) {
  const select = document.createElement("select");
  fillSelect(select, entries, current);
  return select;
}

// Make `entries`, `[{ value, text }]`, the options of `select`, showing the one whose value is `current`.
function fillSelect(select, entries, current) {
  const options = [];
  for (const entry of entries) {
    const option = textElement("option", "", entry.text);
    option.value = entry.value;
    options.push(option);
  }
  select.replaceChildren(...options);
  select.value = current;
}
