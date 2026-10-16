/**
 * The Traffic Explorer's choice and what follows from it: the URL keys that hold it, the drop-downs' entries, the rows
 * it keeps of the `explore/daily_rollup` answer, their sums for the tiles and their requests per day for the bars.
 * These are plain functions, tested with `node --test`.
 *
 * A choice is `{ model, endpoint, period }`, each "" for everything: `model` a named model's `chute_id`, or `other` for
 * the rows of every other model; `endpoint` an endpoint group (`chat`, `chat_stream`, …); `period` a key of `PERIODS`.
 * A row of the answer is `{ day, chute_id, model, endpoint_group, requests, input_tokens, input_counted, output_tokens,
 * output_counted, ttft_sum, ttft_counted }`: one calendar day, model and endpoint group, `chute_id` null for Other.
 */

import { foldedRows } from "../charts/stacked_bars.js";
import { ENDPOINT_LABELS, ENDPOINT_SERIES, MODEL_SERIES } from "../shared/series.js";
import { OTHER_NAME } from "../theme/colours.js";

// The URL keys the choice is written in, one value each.
const MODEL_KEY = "model";
const ENDPOINT_KEY = "endpoint";
const PERIOD_KEY = "period";

/** The model of the rows of every model but the twenty named ones, in a choice and in the URL. */
export const OTHER_MODEL = "other";

/** The choice of everything: every model, every endpoint group, every day. It writes no URL key. */
export const DEFAULT_CHOICE = Object.freeze({ model: "", endpoint: "", period: "" });

// The text of each drop-down's first entry, which chooses everything.
const EVERY_MODEL_TEXT = "All models";
const EVERY_ENDPOINT_TEXT = "All endpoints";

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
 * The choice the URL's `model`, `endpoint` and `period` name; a value that is not one of `modelValues` (the model
 * drop-down's values), an endpoint group or a period falls back to "", everything.
 */
export function readTrafficChoice(params, modelValues) {
  const model = params.get(MODEL_KEY) ?? "";
  const endpoint = params.get(ENDPOINT_KEY) ?? "";
  const period = params.get(PERIOD_KEY) ?? "";
  return {
    model: modelValues.includes(model) ? model : "",
    endpoint: Object.hasOwn(ENDPOINT_LABELS, endpoint) ? endpoint : "",
    period: PERIODS.some((entry) => entry.value === period) ? period : "",
  };
}

/** A copy of `params` with `choice` written and every other key untouched; a part chosen as "" writes no key. */
export function writeTrafficChoice(params, choice) {
  const written = new URLSearchParams(params);
  setOrDelete(written, MODEL_KEY, choice.model);
  setOrDelete(written, ENDPOINT_KEY, choice.endpoint);
  setOrDelete(written, PERIOD_KEY, choice.period);
  return written;
}

/**
 * The model drop-down's entries, `[{ value, text }]`: "All models" (value ""), each named model of `rows` by its name,
 * most requested over the rows first, valued by its `chute_id`, and "Other" (value `other`).
 */
export function modelChoices(rows) {
  const requestsByModel = new Map();
  const names = new Map();
  for (const row of rows) {
    if (row.chute_id !== null) {
      requestsByModel.set(row.chute_id, (requestsByModel.get(row.chute_id) ?? 0) + row.requests);
      names.set(row.chute_id, row.model);
    }
  }
  const ranked = [...requestsByModel.keys()];
  ranked.sort((first, second) => requestsByModel.get(second) - requestsByModel.get(first));
  const choices = [{ value: "", text: EVERY_MODEL_TEXT }];
  for (const chuteId of ranked) {
    choices.push({ value: chuteId, text: names.get(chuteId) });
  }
  choices.push({ value: OTHER_MODEL, text: OTHER_NAME });
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

/** The rows of `rows` that `choice` keeps: of its model, its endpoint group and a day of its period, in their order. */
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
 * The series the bars stack by: the models (`MODEL_SERIES`) while no model is chosen, the endpoint groups
 * (`ENDPOINT_SERIES`) once one is.
 */
export function choiceSeries(choice) {
  return choice.model === "" ? MODEL_SERIES : ENDPOINT_SERIES;
}

/**
 * The bars' rows: `{ day, [seriesColumn], requests }`, the requests of `rows` per day and series, each series past the
 * eight named in `colours` (a Map from series name to colour) folded into "Other", in order of first appearance. By
 * model, the twelve named models the Overview does not name are among them.
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

// The `chute_id` of the rows of the model `model`: null, the answer's, for Other.
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
