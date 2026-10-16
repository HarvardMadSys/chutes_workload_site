/**
 * The Traffic Explorer's choice and what follows from it: the URL keys that hold it, the drop-downs' entries, the rows
 * it keeps, their sums for the tiles and their requests per day for the bars. These are plain functions, tested with
 * `node --test`.
 *
 * A choice is `{ family, model, endpoint, period }`, each "" for everything: `family` a family's slug; `model`, within
 * the family, a named model's `chute_id`, or `other` for the rows of the family's other models; `endpoint` an endpoint
 * group (`chat`, `chat_stream`, …); `period` a key of `PERIODS`. The rows are those of the `explore/daily_by_family`
 * answer while no family is chosen, `{ day, family, family_slug, endpoint_group, requests, input_tokens,
 * input_counted, output_tokens, output_counted, ttft_sum, ttft_counted }`, and those of the family's
 * `explore/daily_by_model/<family_slug>` answer once one is, `{ day, chute_id, model, endpoint_group, ... }` with the
 * same measures, `chute_id` null for the family's other models.
 */

import { foldedRows } from "../charts/stacked_bars.js";
import { ENDPOINT_LABELS, ENDPOINT_SERIES, FAMILY_SERIES, MODEL_SERIES } from "../shared/series.js";
import { OTHER_NAME } from "../theme/colours.js";

// The URL keys the choice is written in, one value each.
const FAMILY_KEY = "family";
const MODEL_KEY = "model";
const ENDPOINT_KEY = "endpoint";
const PERIOD_KEY = "period";

/** The model of the rows of a family's models past its eight named ones, in a choice and in the URL. */
export const OTHER_MODEL = "other";

// The text of each drop-down's first entry, which chooses everything.
const EVERY_FAMILY_TEXT = "All families";
const EVERY_ENDPOINT_TEXT = "All endpoints";

/** The model drop-down's one entry while no family is chosen, when it is disabled. */
export const NO_FAMILY_MODEL_CHOICES = Object.freeze([Object.freeze({ value: "", text: "Choose a family" })]);

/**
 * The periods, in the order of their buttons: All, then the calendar quarters the trace spans, each by its key in the
 * URL, its button's label and its first and last calendar day ("YYYY-MM-DD"), null for no bound. The trace starts on
 * April 11, 2025, so Q2 '25 holds its days from then; the trace's last twelve days, April 1 to 12, 2026, begin a
 * quarter the trace does not finish, so they are shown under All only.
 */
export const PERIODS = Object.freeze([
  Object.freeze({ value: "", label: "All", firstDay: null, lastDay: null }),
  Object.freeze({ value: "2025-q2", label: "Q2 '25", firstDay: "2025-04-01", lastDay: "2025-06-30" }),
  Object.freeze({ value: "2025-q3", label: "Q3 '25", firstDay: "2025-07-01", lastDay: "2025-09-30" }),
  Object.freeze({ value: "2025-q4", label: "Q4 '25", firstDay: "2025-10-01", lastDay: "2025-12-31" }),
  Object.freeze({ value: "2026-q1", label: "Q1 '26", firstDay: "2026-01-01", lastDay: "2026-03-31" }),
]);

/**
 * The choice the URL's `family`, `model`, `endpoint` and `period` name; a value that is not one of `familyValues` (the
 * family drop-down's values), an endpoint group or a period falls back to "", everything, and so does a model with no
 * family or not one of `modelValues` (the model drop-down's values for that family).
 */
export function readTrafficChoice(params, familyValues, modelValues) {
  const family = params.get(FAMILY_KEY) ?? "";
  const model = params.get(MODEL_KEY) ?? "";
  const endpoint = params.get(ENDPOINT_KEY) ?? "";
  const period = params.get(PERIOD_KEY) ?? "";
  const knownFamily = familyValues.includes(family) ? family : "";
  return {
    family: knownFamily,
    model: knownFamily !== "" && modelValues.includes(model) ? model : "",
    endpoint: Object.hasOwn(ENDPOINT_LABELS, endpoint) ? endpoint : "",
    period: PERIODS.some((entry) => entry.value === period) ? period : "",
  };
}

/** A copy of `params` with `choice` written and every other key untouched; a part chosen as "" writes no key. */
export function writeTrafficChoice(params, choice) {
  const written = new URLSearchParams(params);
  setOrDelete(written, FAMILY_KEY, choice.family);
  setOrDelete(written, MODEL_KEY, choice.model);
  setOrDelete(written, ENDPOINT_KEY, choice.endpoint);
  setOrDelete(written, PERIOD_KEY, choice.period);
  return written;
}

/** True when the choices `first` and `second` choose the same family, model, endpoint group and period. */
export function isSameChoice(first, second) {
  return first.family === second.family && first.model === second.model && first.endpoint === second.endpoint
    && first.period === second.period;
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
 * "Other <family>" (value `other`) where the rows hold the family's other models.
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

/**
 * The rows of `rows`, the answer of the choice's family (or of every family), that `choice` keeps: of its model, its
 * endpoint group and a day of its period, in their order.
 */
export function rowsInChoice(rows, choice) {
  const { firstDay, lastDay } = periodOf(choice.period);
  const kept = [];
  for (const row of rows) {
    const isOfModel = choice.model === "" || row.chute_id === modelChuteId(choice.model);
    const isOfEndpoint = choice.endpoint === "" || row.endpoint_group === choice.endpoint;
    const isInPeriod = isDayInPeriod(row.day, firstDay, lastDay);
    if (isOfModel && isOfEndpoint && isInPeriod) {
      kept.push(row);
    }
  }
  return kept;
}

/** The days of `days` (calendar days, "YYYY-MM-DD") that fall in the period whose key is `period`, in their order. */
export function periodDays(days, period) {
  const { firstDay, lastDay } = periodOf(period);
  return days.filter((day) => isDayInPeriod(day, firstDay, lastDay));
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
 * The series the bars stack by: the families (`FAMILY_SERIES`) while no family is chosen; the models of the family
 * named `familyName` once one is (`MODEL_SERIES`, its "Other" written "Other <family>"); the endpoint groups
 * (`ENDPOINT_SERIES`) once a model is.
 */
export function choiceSeries(choice, familyName) {
  if (choice.family === "") {
    return FAMILY_SERIES;
  }
  if (choice.model === "") {
    // The family's other models fold into the models' "Other" (`modelColours`), named here for the family.
    return Object.freeze({ ...MODEL_SERIES, labels: Object.freeze({ [OTHER_NAME]: otherModelsName(familyName) }) });
  }
  return ENDPOINT_SERIES;
}

/**
 * The bars' rows: `{ day, [seriesColumn], requests }`, the requests of `rows` per day and series, each series that
 * `colours` (a Map from series name to colour) does not name folded into "Other", in order of first appearance.
 */
export function dailyRequests(rows, seriesColumn, colours) {
  const daily = [];
  for (const row of rows) {
    daily.push({ day: row.day, [seriesColumn]: row[seriesColumn], requests: row.requests });
  }
  return foldedRows(daily, colours, { xColumn: "day", seriesColumn, valueColumn: "requests" });
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

// The period whose key is `period`; every key a choice holds is one, as `readTrafficChoice` keeps no other.
function periodOf(period) {
  return PERIODS.find((entry) => entry.value === period);
}

// Days are "YYYY-MM-DD", so their order as text is their order in time.
function isDayInPeriod(day, firstDay, lastDay) {
  return (firstDay === null || day >= firstDay) && (lastDay === null || day <= lastDay);
}

// The name of a family's models past its eight named ones, as its answer writes it: "Other DeepSeek".
function otherModelsName(familyName) {
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
