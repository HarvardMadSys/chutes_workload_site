/**
 * The Traffic Explorer's controls, a model drop-down, an endpoint drop-down and the period buttons, kept in step with
 * the URL, which holds the explorer's choice (`explore/traffic_filter.js` defines the choice and its keys). A change
 * writes the new choice to the URL; Back or Forward to a history entry of another choice shows that one. Either then
 * hands the explorer the choice to draw, `{ model, endpoint, period }`.
 */

import { endpointChoices, isSameChoice, PERIODS, readTrafficChoice, writeTrafficChoice } from "./traffic_filter.js";

// The period field's name, which also names its group of buttons for a screen reader, and the id that ties the two.
const PERIOD_FIELD_NAME = "Period";
const PERIOD_NAME_ID = "traffic-period-name";

/**
 * Draw the controls into `row` showing the URL's choice, `modelEntries` being the model drop-down's entries
 * (`modelChoices`'), and return that choice. A change writes the new choice to the URL with `context.replaceQuery` and
 * calls `onChange(choice)`; a return to a history entry (`context.onReturn`) whose URL holds another choice than the
 * one shown draws the controls again showing it and calls `onChange(choice)`.
 */
export function mountTrafficControls(row, modelEntries, context, onChange) {
  const controls = { row, modelEntries, context, onChange, shown: urlChoice(modelEntries) };
  context.onReturn(() => showReturnedChoice(controls));
  drawControls(controls);
  return controls.shown;
}

/**
 * Fill `row` with the controls showing `choice`: the model drop-down of `modelEntries` (`modelChoices`' entries), the
 * endpoint drop-down and the period buttons, the chosen one pressed. A change calls `onChoose` with the part of the
 * choice it changes, `{ model }`, `{ endpoint }` or `{ period }`.
 */
export function renderControls(row, choice, modelEntries, onChoose) {
  const model = choiceSelect(modelEntries, choice.model);
  model.addEventListener("change", () => onChoose({ model: model.value }));
  const endpoint = choiceSelect(endpointChoices(), choice.endpoint);
  endpoint.addEventListener("change", () => onChoose({ endpoint: endpoint.value }));
  const period = periodField(choice, onChoose);
  row.replaceChildren(labelledField("Model", model), labelledField("Endpoint", endpoint), period);
}

// The choice the URL's keys name now, among the model drop-down's `modelEntries`.
function urlChoice(modelEntries) {
  const modelValues = modelEntries.map((entry) => entry.value);
  return readTrafficChoice(new URLSearchParams(window.location.search), modelValues);
}

function drawControls(controls) {
  renderControls(controls.row, controls.shown, controls.modelEntries, (part) => choosePart(controls, part));
}

// A control changed `part` of the choice shown: write the new choice to the URL, then hand it on to be drawn.
function choosePart(controls, part) {
  controls.shown = { ...controls.shown, ...part };
  controls.context.replaceQuery(writeTrafficChoice(new URLSearchParams(window.location.search), controls.shown));
  controls.onChange(controls.shown);
}

// Back or Forward: an entry whose URL holds another choice is shown and drawn; the same choice, after a change of
// topic, is left as drawn, so its legend keeps the series hidden in it.
function showReturnedChoice(controls) {
  const returned = urlChoice(controls.modelEntries);
  if (isSameChoice(returned, controls.shown)) {
    return;
  }
  controls.shown = returned;
  drawControls(controls);
  controls.onChange(returned);
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
  for (const entry of entries) {
    const option = textElement("option", "", entry.text);
    option.value = entry.value;
    select.append(option);
  }
  select.value = current;
  return select;
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
