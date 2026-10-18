/**
 * The Traffic Explorer's choice: the URL keys that hold it, its metrics with the bars' words for each, and the
 * drop-downs' entries, plain functions tested with `node --test`. The rows it keeps are `traffic/traffic_filter.js`'s.
 *
 * A choice is `{ family, model, endpoint, metric, from, to }`, each "" for everything: `family` a family's slug;
 * `model`, within the family, a named model's `chute_id`, or `other` for the rows of the family's other models;
 * `endpoint` an endpoint group (`chat`, `chat_stream`, …); `metric` the value of one of `METRICS` ("" for requests);
 * `from` and `to` the first and last chosen day, "YYYY-MM-DD", each "" for the trace's end on its side, within the
 * trace's days (`traffic/traffic_range.js`).
 */

import { ENDPOINT_LABELS } from "../shared/series.js";
import { OTHER_NAME } from "../theme/colours.js";
import { clippedRange } from "./traffic_range.js";

// The URL keys the choice is written in, one value each.
const FAMILY_KEY = "family";
const MODEL_KEY = "model";
const ENDPOINT_KEY = "endpoint";
const METRIC_KEY = "metric";
const FROM_KEY = "from";
const TO_KEY = "to";

/** The model of the rows of a family's models past its eight named ones, in a choice and in the URL. */
export const OTHER_MODEL = "other";

// The text of each drop-down's first entry, which chooses everything.
const EVERY_FAMILY_TEXT = "All families";
const EVERY_ENDPOINT_TEXT = "All endpoints";

/** The model drop-down's one entry while no family is chosen, when it is disabled. */
export const NO_FAMILY_MODEL_CHOICES = Object.freeze([Object.freeze({ value: "", text: "Choose a family" })]);

// placeholder: what a token metric's bars sum, closing its caption, for the authors.
const TOKENS_NOTE = " Tokens are summed over the requests that record them.";

/**
 * The metrics the bars stack, in the order of the metric drop-down: each by its value in a choice and in the URL (""
 * for requests, the default), its drop-down text, the column of the daily answers it sums, and the bars' words for
 * it: the chart's title; what a bar counts, named in its tooltip ("Input tokens: 1,234") and opening the caption; and
 * the caption's closing note.
 */
export const METRICS = Object.freeze([
  Object.freeze({
    value: "", text: "Requests", column: "requests", title: "Requests per day", valueLabel: "Requests", note: "",
  }),
  // placeholder: the token metrics' titles and value labels, for the authors.
  Object.freeze({
    value: "input_tokens", text: "Input tokens", column: "input_tokens",
    title: "Input tokens per day", valueLabel: "Input tokens", note: TOKENS_NOTE,
  }),
  Object.freeze({
    value: "output_tokens", text: "Output tokens", column: "output_tokens",
    title: "Output tokens per day", valueLabel: "Output tokens", note: TOKENS_NOTE,
  }),
]);

/** The entry of `METRICS` whose value is `value`, or undefined for a value that is none of theirs. */
export function metricOf(value) {
  return METRICS.find((metric) => metric.value === value);
}

/**
 * The choice the URL's `family`, `model`, `endpoint`, `metric`, `from` and `to` name. A value that is not one of
 * `familyValues` (the family drop-down's values), an endpoint group or a metric's value falls back to "", everything,
 * and so does a model with no family or not one of `modelValues` (the model drop-down's values for that family). The
 * days are clipped to `days`, the trace's, as `clippedRange` clips them.
 */
export function readTrafficChoice(params, familyValues, modelValues, days) {
  const family = params.get(FAMILY_KEY) ?? "";
  const model = params.get(MODEL_KEY) ?? "";
  const endpoint = params.get(ENDPOINT_KEY) ?? "";
  const metric = params.get(METRIC_KEY) ?? "";
  const knownFamily = familyValues.includes(family) ? family : "";
  return {
    family: knownFamily,
    model: knownFamily !== "" && modelValues.includes(model) ? model : "",
    endpoint: Object.hasOwn(ENDPOINT_LABELS, endpoint) ? endpoint : "",
    metric: metricOf(metric) === undefined ? "" : metric,
    ...clippedRange(params.get(FROM_KEY) ?? "", params.get(TO_KEY) ?? "", days),
  };
}

/** A copy of `params` with `choice` written and every other key untouched; a part chosen as "" writes no key. */
export function writeTrafficChoice(params, choice) {
  const written = new URLSearchParams(params);
  setOrDelete(written, FAMILY_KEY, choice.family);
  setOrDelete(written, MODEL_KEY, choice.model);
  setOrDelete(written, ENDPOINT_KEY, choice.endpoint);
  setOrDelete(written, METRIC_KEY, choice.metric);
  setOrDelete(written, FROM_KEY, choice.from);
  setOrDelete(written, TO_KEY, choice.to);
  return written;
}

/** True when the choices `first` and `second` choose the same family, model, endpoint group, metric and days. */
export function isSameChoice(first, second) {
  return first.family === second.family && first.model === second.model && first.endpoint === second.endpoint
    && first.metric === second.metric && first.from === second.from && first.to === second.to;
}

/**
 * The family drop-down's entries, `[{ value, text }]`: "All families" (value ""), then each family of `families`,
 * the rows of `explore/family_mix` (`{ family, family_slug, requests }`) in their order, by its name, valued by its
 * slug.
 */
export function familyChoices(families) {
  const choices = [{ value: "", text: EVERY_FAMILY_TEXT }];
  for (const { family, family_slug: slug } of families) {
    choices.push({ value: slug, text: family });
  }
  return choices;
}

/**
 * The named models of `rows`, a family's rows of `explore/daily_by_model`: `[{ chute_id, model, requests }]`, each
 * once with its requests over the rows, most requested first; the family's other models, a null `chute_id`, are left
 * out.
 */
export function modelOrder(rows) {
  const models = new Map();
  for (const row of rows) {
    if (row.chute_id !== null) {
      const model = models.get(row.chute_id) ?? { chute_id: row.chute_id, model: row.model, requests: 0 };
      model.requests += row.requests;
      models.set(row.chute_id, model);
    }
  }
  return [...models.values()].sort((first, second) => second.requests - first.requests);
}

/**
 * The model drop-down's entries for the family named `familyName`, from its rows `rows`, `[{ value, text }]`: "All
 * <family> models" (value ""), each named model of `modelOrder(rows)` by its name, valued by its `chute_id`, and
 * the family's other models by `otherModelsText` (value `other`) where the rows hold them.
 */
export function modelChoices(rows, familyName) {
  const choices = [{ value: "", text: `All ${familyName} models` }];
  for (const { chute_id: chuteId, model } of modelOrder(rows)) {
    choices.push({ value: chuteId, text: model });
  }
  if (rows.some((row) => row.chute_id === null)) {
    choices.push({ value: OTHER_MODEL, text: otherModelsText(rows, familyName) });
  }
  return choices;
}

/** The endpoint drop-down's entries, `[{ value, text }]`: "All endpoints" (value ""), then each group by its label. */
export function endpointChoices() {
  const choices = [{ value: "", text: EVERY_ENDPOINT_TEXT }];
  for (const [group, label] of Object.entries(ENDPOINT_LABELS)) {
    choices.push({ value: group, text: label });
  }
  return choices;
}

/** The metric drop-down's entries, `[{ value, text }]`, one per metric of `METRICS`, requests first. */
export function metricChoices() {
  return METRICS.map((metric) => ({ value: metric.value, text: metric.text }));
}

// placeholder: the family Other's other models, which its answer names "Other Other", for the authors.
const REST_OF_OTHER_TEXT = "Rest of Other";

/**
 * The text of the other models, past the eight named ones, of the family named `familyName`, whose rows of
 * `explore/daily_by_model` are `rows`: the `model` the answer writes on its rows whose `chute_id` is null, "Other
 * DeepSeek", and `REST_OF_OTHER_TEXT` for the family Other; undefined for a family whose rows hold no other models.
 */
export function otherModelsText(rows, familyName) {
  if (familyName === OTHER_NAME) {
    return REST_OF_OTHER_TEXT;
  }
  return rows.find((row) => row.chute_id === null)?.model;
}

function setOrDelete(params, key, value) {
  if (value === "") {
    params.delete(key);
  } else {
    params.set(key, value);
  }
}
