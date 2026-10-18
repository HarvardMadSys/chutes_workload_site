/**
 * The Traffic Explorer's choice and what follows from it: the URL keys that hold it, the drop-downs' entries, the rows
 * it keeps, their sums for the tiles and their metric per day for the bars. These are plain functions, tested with
 * `node --test`.
 *
 * A choice is `{ family, model, endpoint, metric, from, to }`, each "" for everything: `family` a family's slug;
 * `model`, within the family, a named model's `chute_id`, or `other` for the rows of the family's other models;
 * `endpoint` an endpoint group (`chat`, `chat_stream`, …); `metric` the value of one of `METRICS` ("" for requests);
 * `from` and `to` the first and last chosen day, "YYYY-MM-DD", each "" for the trace's end on its side, within the
 * trace's days (`traffic/traffic_range.js`). The rows are those of the `explore/daily_by_family` answer while no family
 * is chosen, `{ day, family, family_slug, endpoint_group, requests, input_tokens, input_counted, output_tokens,
 * output_counted, ttft_sum, ttft_counted }`, and those of the family's `explore/daily_by_model/<family_slug>` answer
 * once one is, `{ day, chute_id, model, endpoint_group, ... }` with the same measures, `chute_id` null for the family's
 * other models.
 */

import { foldedRows } from "../charts/stacked_bars.js";
import { BY_ENDPOINT, BY_FAMILY, BY_MODEL, ENDPOINT_LABELS } from "../shared/series.js";
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

// The name of the other models of the family named Other, which the rule for every other family would name "Other
// Other".
const REST_OF_OTHER_TEXT = "Rest of Other";

/** The model drop-down's one entry while no family is chosen, when it is disabled. */
export const NO_FAMILY_MODEL_CHOICES = Object.freeze([Object.freeze({ value: "", text: "Choose a family" })]);

/**
 * The metrics the bars stack, in the order of the metric drop-down: each by its value in a choice and in the URL (""
 * for requests, the default), its drop-down text and the column of the daily answers it sums.
 */
export const METRICS = Object.freeze([
  Object.freeze({ value: "", text: "Requests", column: "requests" }),
  Object.freeze({ value: "input_tokens", text: "Input tokens", column: "input_tokens" }),
  Object.freeze({ value: "output_tokens", text: "Output tokens", column: "output_tokens" }),
]);

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
    metric: METRICS.some((entry) => entry.value === metric) ? metric : "",
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
 * The families of `familyRows`, the rows of `explore/daily_by_family`: `[{ family, family_slug, requests }]`, each
 * family once with its requests over the rows, most requested first and "Other", the models in no family, last.
 */
export function familyOrder(familyRows) {
  const families = new Map();
  for (const row of familyRows) {
    const family = families.get(row.family) ?? { family: row.family, family_slug: row.family_slug, requests: 0 };
    family.requests += row.requests;
    families.set(row.family, family);
  }
  return [...families.values()].sort(otherLastByRequests);
}

/**
 * The family drop-down's entries, `[{ value, text }]`: "All families" (value ""), then each family of `families`
 * (`familyOrder`'s rows, in their order) by its name, valued by its slug.
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
 * "Other <family>" ("Rest of Other" for the family Other; value `other`) where the rows hold the family's other
 * models.
 */
export function modelChoices(rows, familyName) {
  const choices = [{ value: "", text: `All ${familyName} models` }];
  for (const { chute_id: chuteId, model } of modelOrder(rows)) {
    choices.push({ value: chuteId, text: model });
  }
  if (rows.some((row) => row.chute_id === null)) {
    choices.push({ value: OTHER_MODEL, text: otherModelsName(familyName) });
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

/**
 * The rows of `rows`, the answer of the choice's family (or of every family), that `choice` keeps: of its model, its
 * endpoint group and a day of its range, in their order.
 */
export function rowsInChoice(rows, choice) {
  const kept = [];
  for (const row of rows) {
    if (isOfModelAndEndpoint(row, choice) && isDayInRange(row.day, choice)) {
      kept.push(row);
    }
  }
  return kept;
}

/** True when `row`, of a daily or a histogram answer, is of the model and the endpoint group `choice` chooses. */
export function isOfModelAndEndpoint(row, choice) {
  const isOfModel = choice.model === "" || row.chute_id === modelChuteId(choice.model);
  return isOfModel && (choice.endpoint === "" || row.endpoint_group === choice.endpoint);
}

/** The days of `days` (calendar days, "YYYY-MM-DD") in the day range of `choice`, in their order: the bars' days. */
export function periodDays(days, choice) {
  return days.filter((day) => isDayInRange(day, choice));
}

/**
 * The tiles' numbers over `rows`: `{ requests, inputAverage, outputAverage, ttftAverage, ttftShare }`, the requests,
 * the average input and output tokens and the average TTFT in seconds, each over the requests that record the value,
 * and the share of the requests that record a TTFT; an average or a share over no requests is null.
 */
export function trafficSummary(rows) {
  const sums = columnSums(rows);
  return {
    requests: sums.requests,
    inputAverage: averageOrNull(sums.inputTokens, sums.inputCounted),
    outputAverage: averageOrNull(sums.outputTokens, sums.outputCounted),
    ttftAverage: averageOrNull(sums.ttftSum, sums.ttftCounted),
    ttftShare: shareOrNull(sums.ttftCounted, sums.requests),
  };
}

/**
 * The breakdown the bars stack by: by family (`BY_FAMILY`) while no family is chosen; by the models of the family
 * named `familyName` once one is (`BY_MODEL`, its "Other" written as the model drop-down names it, "Other
 * <family>"); by endpoint group (`BY_ENDPOINT`) once a model is.
 */
export function choiceBreakdown(choice, familyName) {
  if (choice.family === "") {
    return BY_FAMILY;
  }
  if (choice.model === "") {
    // The family's other models fold into the models' "Other" (`modelColours`), named here for the family.
    return Object.freeze({ ...BY_MODEL, labels: Object.freeze({ [OTHER_NAME]: otherModelsName(familyName) }) });
  }
  return BY_ENDPOINT;
}

/**
 * The bars' rows: `{ day, [seriesColumn], value }`, the sum of `rows`' column of the metric whose value is `metric`
 * (one of `METRICS`) per day and series, each series that `colours` (a Map from series name to colour) does not name
 * folded into "Other", in order of first appearance. A token sum is null on a row none of whose requests records it,
 * and adds nothing.
 */
export function dailyValues(rows, seriesColumn, metric, colours) {
  const { column } = METRICS.find((entry) => entry.value === metric);
  const daily = [];
  for (const row of rows) {
    daily.push({ day: row.day, [seriesColumn]: row[seriesColumn], value: row[column] ?? 0 });
  }
  return foldedRows(daily, colours, { xColumn: "day", seriesColumn, valueColumn: "value" });
}

// The sums of the rows' requests, token and TTFT columns with their counts. A sum over no recording request is null in
// the answer, and adds nothing.
function columnSums(rows) {
  const sums = {
    requests: 0, inputTokens: 0, inputCounted: 0, outputTokens: 0, outputCounted: 0, ttftSum: 0, ttftCounted: 0,
  };
  for (const row of rows) {
    sums.requests += row.requests;
    sums.inputTokens += row.input_tokens ?? 0;
    sums.inputCounted += row.input_counted;
    sums.outputTokens += row.output_tokens ?? 0;
    sums.outputCounted += row.output_counted;
    sums.ttftSum += row.ttft_sum ?? 0;
    sums.ttftCounted += row.ttft_counted;
  }
  return sums;
}

function averageOrNull(sum, count) {
  return count === 0 ? null : sum / count;
}

function shareOrNull(part, whole) {
  return whole === 0 ? null : part / whole;
}

// Days are "YYYY-MM-DD", so their order as text is their order in time.
function isDayInRange(day, { from, to }) {
  return (from === "" || day >= from) && (to === "" || day <= to);
}

// The name of a family's models past its eight named ones, "Other DeepSeek", as its answer writes it; "Rest of Other"
// for the family Other.
function otherModelsName(familyName) {
  if (familyName === OTHER_NAME) {
    return REST_OF_OTHER_TEXT;
  }
  return `${OTHER_NAME} ${familyName}`;
}

// For sorting families: "Other" after every other family, the rest by requests, most first.
function otherLastByRequests(first, second) {
  const firstIsOther = first.family === OTHER_NAME;
  const secondIsOther = second.family === OTHER_NAME;
  if (firstIsOther !== secondIsOther) {
    return firstIsOther ? 1 : -1;
  }
  return second.requests - first.requests;
}

// The `chute_id` of the rows of the model `model`: null, the answer's, for the family's other models.
function modelChuteId(model) {
  return model === OTHER_MODEL ? null : model;
}

function setOrDelete(params, key, value) {
  if (value === "") {
    params.delete(key);
  } else {
    params.set(key, value);
  }
}
