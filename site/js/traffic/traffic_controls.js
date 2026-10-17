/**
 * The Traffic Explorer's controls, a family drop-down, a model drop-down, an endpoint drop-down and the period buttons,
 * kept in step with the URL, which holds the explorer's choice (`traffic/traffic_filter.js` defines the choice and its
 * keys). The model drop-down is disabled until a family is chosen, and then offers the family's models, which come
 * from the family's answer. A change writes the new choice to the URL; Back or Forward to a history entry of another
 * choice shows that one. Either then hands the explorer the choice to draw, `{ family, model, endpoint, period }`.
 *
 * The explorer gives the controls `{ modelsOf, onChange, onError }`: `modelsOf(family)` resolves to the model
 * drop-down's entries (`modelChoices`') for the family whose slug is `family`; `onChange(choice)` draws a choice; and
 * `onError(error)` shows a family's answer that cannot be read.
 */

import {
  endpointChoices, isSameChoice, NO_FAMILY_MODEL_CHOICES, PERIODS, readTrafficChoice, writeTrafficChoice,
} from "./traffic_filter.js";

// The period field's name, which also names its group of buttons for a screen reader, and the id that ties the two.
const PERIOD_FIELD_NAME = "Period";
const PERIOD_NAME_ID = "traffic-period-name";

/**
 * Draw the controls into `row` showing the URL's choice, `families` being the family drop-down's entries
 * (`familyChoices`'), and resolve to that choice once its family's models are read. A key of the URL the choice does
 * not keep, such as a model with no family or not among the family's, is then rewritten with `context.replaceQuery`.
 * If the URL's family cannot be read, the controls show the choice without it, as a failed choice of a family leaves
 * them, the error goes to `explorer.onError` and the promise resolves to null: there is no choice to draw.
 * A change writes the new choice to the URL the same way and calls `explorer.onChange(choice)`; a return to a history
 * entry (`context.onReturn`) whose URL holds another choice than the one shown draws the controls again showing it and
 * calls `explorer.onChange(choice)`.
 */
export async function mountTrafficControls(row, families, context, explorer) {
  const params = new URLSearchParams(window.location.search);
  const opened = await openedChoice(params, families, explorer.modelsOf);
  const controls = { row, families, context, explorer, shown: opened.choice, models: opened.models };
  const written = writeTrafficChoice(params, opened.choice);
  // A family that could not be read stays in the URL, so that a reload tries it again.
  if (opened.error === null && written.toString() !== params.toString()) {
    context.replaceQuery(written);
  }
  context.onReturn(() => showReturnedChoice(controls).catch(explorer.onError));
  drawControls(controls);
  if (opened.error !== null) {
    explorer.onError(opened.error);
    return null;
  }
  return opened.choice;
}

/**
 * Fill `row` with the controls showing `choice`: the family drop-down of `entries.families`, the model drop-down of
 * `entries.models` (disabled while no family is chosen), the endpoint drop-down and the period buttons, the chosen one
 * pressed. A change calls `onChoose` with the part of the choice it changes: `{ family, model: "" }`, `{ model }`,
 * `{ endpoint }` or `{ period }`. Returns the drop-downs of families and of models, `{ family, model }`.
 */
export function renderControls(row, choice, entries, onChoose) {
  const family = choiceSelect(entries.families, choice.family);
  family.addEventListener("change", () => onChoose({ family: family.value, model: "" }));
  const model = choiceSelect(entries.models, choice.model);
  model.disabled = choice.family === "";
  model.addEventListener("change", () => onChoose({ model: model.value }));
  const endpoint = choiceSelect(endpointChoices(), choice.endpoint);
  endpoint.addEventListener("change", () => onChoose({ endpoint: endpoint.value }));
  const period = periodField(choice, onChoose);
  row.replaceChildren(
    labelledField("Family", family), labelledField("Model", model), labelledField("Endpoint", endpoint), period,
  );
  return { family, model };
}

/**
 * The choice the URL's keys `params` name, `{ choice, models }`: the choice among the family drop-down's entries
 * `families` and the models of the URL's family, which `modelsOf` gives, and those models' entries.
 */
async function urlChoice(params, families, modelsOf) {
  const familyValues = families.map((entry) => entry.value);
  const { family } = readTrafficChoice(params, familyValues, []);
  const models = await familyModels(modelsOf, family);
  const choice = readTrafficChoice(params, familyValues, models.map((entry) => entry.value));
  return { choice, models };
}

/**
 * The choice the URL's keys `params` name when the page opens, `{ choice, models, error }`, as `urlChoice` gives it with
 * `error` null; if the URL's family's models cannot be read, the choice without the family, the model drop-down's
 * "Choose a family", and the error.
 */
async function openedChoice(params, families, modelsOf) {
  try {
    return { ...(await urlChoice(params, families, modelsOf)), error: null };
  } catch (error) {
    const familyValues = families.map((entry) => entry.value);
    const choice = { ...readTrafficChoice(params, familyValues, []), family: "" };
    return { choice, models: NO_FAMILY_MODEL_CHOICES, error };
  }
}

// The model drop-down's entries for the family whose slug is `family`; with none chosen, its one "Choose a family".
async function familyModels(modelsOf, family) {
  return family === "" ? NO_FAMILY_MODEL_CHOICES : modelsOf(family);
}

// Draw the controls showing the choice shown, and keep their drop-downs of families and of models.
function drawControls(controls) {
  const entries = { families: controls.families, models: controls.models };
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
  const returned = await urlChoice(new URLSearchParams(search), controls.families, controls.explorer.modelsOf);
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

// The period buttons under their name, one per period, the chosen one pressed; a press presses its button alone.
function periodField(choice, onChoose) {
  const field = textElement("div", "control-field period-field", "");
  const name = textElement("span", "control-field-name", PERIOD_FIELD_NAME);
  name.id = PERIOD_NAME_ID;
  const group = textElement("div", "period-buttons", "");
  group.setAttribute("role", "group");
  group.setAttribute("aria-labelledby", PERIOD_NAME_ID);
  const buttons = PERIODS.map((period) => textElement("button", "period-button", period.label));
  for (const [index, button] of buttons.entries()) {
    button.type = "button";
    button.setAttribute("aria-pressed", String(PERIODS[index].value === choice.period));
    button.addEventListener("click", () => choosePeriod(buttons, index, onChoose));
  }
  group.append(...buttons);
  field.append(name, group);
  return field;
}

// Press the period button at `index` of `buttons` alone, and choose its period.
function choosePeriod(buttons, index, onChoose) {
  for (const [other, button] of buttons.entries()) {
    button.setAttribute("aria-pressed", String(other === index));
  }
  onChoose({ period: PERIODS[index].value });
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

// An element of `tagName` with the class `className` (none when "") holding `text`.
function textElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className !== "") {
    element.className = className;
  }
  element.textContent = text;
  return element;
}
