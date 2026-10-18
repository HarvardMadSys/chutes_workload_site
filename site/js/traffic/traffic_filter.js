/**
 * The rows a Traffic Explorer's choice keeps and what follows from them: the tiles' sums, the bars' breakdown and their
 * metric per day. These are plain functions, tested with `node --test`; the choice itself, its URL keys and the
 * drop-downs' entries are `traffic/traffic_choice.js`'s.
 *
 * The rows are those of the `explore/daily_by_family` answer while no family is chosen, `{ day, family, family_slug,
 * endpoint_group, requests, input_tokens, input_counted, output_tokens, output_counted, ttft_sum, ttft_counted }`, and
 * those of the family's `explore/daily_by_model/<family_slug>` answer once one is, `{ day, chute_id, model,
 * endpoint_group, ... }` with the same measures, `chute_id` null for the family's other models.
 */

import { foldedRows } from "../charts/stacked_bars.js";
import { BY_ENDPOINT, BY_FAMILY, BY_MODEL } from "../shared/series.js";
import { OTHER_NAME } from "../theme/colours.js";
import { metricOf, OTHER_MODEL, otherModelsText } from "./traffic_choice.js";

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
 * The breakdown the bars stack by: by family (`BY_FAMILY`) while no family is chosen; by the models of the chosen
 * family once one is (`BY_MODEL`, its "Other" written as the model drop-down writes it, `otherModelsText`); by endpoint
 * group (`BY_ENDPOINT`) once a model is. `family` is the chosen family's answer, `{ name, rows }`, null for every
 * family.
 */
export function choiceBreakdown(choice, family) {
  if (choice.family === "") {
    return BY_FAMILY;
  }
  if (choice.model === "") {
    // The family's other models fold into the models' "Other" (`modelColours`), named here as the drop-down names them.
    const otherText = otherModelsText(family.rows, family.name);
    return Object.freeze({ ...BY_MODEL, labels: Object.freeze({ [OTHER_NAME]: otherText }) });
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
  const { column } = metricOf(metric);
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

// The `chute_id` of the rows of the model `model`: null, the answer's, for the family's other models.
function modelChuteId(model) {
  return model === OTHER_MODEL ? null : model;
}
