/**
 * The Insights' first topic, The workload at a glance: the five panels of the paper's figure of daily demand over the
 * year, as `page/topics.js` defines a topic. The words are the paper's and the definitions the artifact
 * README's; a line marked "placeholder" is not the paper's own, for the authors to review.
 * A card's kind and chart say how its figure is drawn from its answer, as `insights/figure_card.js` defines them.
 */

import { formatCompactCount, formatCount, formatCountTick } from "../shared/format.js";
import { ENDPOINT_LABELS } from "../shared/series.js";
import { frozenCard, TRACE_DAY_AXIS } from "./figure_card.js";

// The API functions' labels where the answer writes a function's name otherwise than the site's endpoint groups.
const FUNCTION_LABELS = Object.freeze({
  "Chat Stream": ENDPOINT_LABELS.chat_stream,
  "Completion Stream": ENDPOINT_LABELS.completion_stream,
});

// The seasonality's columns, the hours of the day 0..23, and the hours its axis labels, every fourth as the paper's.
const HOURS = Object.freeze(Array.from({ length: 24 }, (unused, hour) => hour));
const LABELLED_HOURS = Object.freeze([0, 4, 8, 12, 16, 20]);

// The seasonality's rows' labels, in the order of its `y_low` 0..6: the row i holds the weekday DuckDB's `dayofweek`
// numbers i, 0 being Sunday, as the artifact README defines the rows.
const WEEKDAY_LABELS = Object.freeze(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);

/** The topic "The workload at a glance". */
export const OVERVIEW_TOPIC = Object.freeze({
  selector: "#insights-overview",
  // placeholder: the takeaway is the section's closing conclusion in plain words, for the authors.
  takeaway: "Demand changes all year, in volume, in which models are active and in how the API is called; one request rate would not describe it.",
  groups: Object.freeze([
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Demand over the year",
      takeaway: "Requests and tokens rise to a peak in late 2025 and fall into 2026, the set of active models swings, and chat calls grow while completion calls fall back.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_request_rate_day",
          title: "Daily request rate",
          insight: "Aggregate demand is non-stationary.",
          caption: "Daily request volume rises through mid-2025, peaks around late summer and fall, and then declines into early 2026.",
          definition: "Requests per day over the trace's year.",
          kind: "lines",
          chart: {
            x: TRACE_DAY_AXIS,
            // From zero, so the caption's growth reads at its true ratio; the busiest day, 34.9M, sits under the top.
            y: { label: "Requests per day", domain: [0, 36e6], tickFormat: formatCountTick },
            valueLabel: "Requests",
            valueFormat: formatCompactCount,
          },
        }),
        frozenCard({
          figure: "fig_token_rate_day",
          title: "Daily token rate",
          // placeholder: the paragraph's lead-in is on the request rate's card; this is its sentence on this panel.
          insight: "Similar request volumes can represent different amounts of serving work.",
          caption: "Daily token volume follows a similar but not identical trend: it grows quickly early in the trace, remains elevated for much of the year, and drops more sharply near the end.",
          definition: "Input plus output tokens per day, over the requests that completed.",
          kind: "lines",
          chart: {
            x: TRACE_DAY_AXIS,
            // From zero, as the request rate's beside it; the busiest day, 218B tokens, sits under the top.
            y: { label: "Tokens per day", domain: [0, 225e9], tickFormat: formatCountTick },
            valueLabel: "Tokens",
            valueFormat: formatCompactCount,
          },
        }),
        frozenCard({
          figure: "fig_daily_unique_models",
          title: "Daily active models",
          insight: "Active models and API mix shift over the year.",
          caption: "The number of active models per day grows from fewer than 100 early in the trace to more than 400 at its peak, before settling at a lower but still elevated level.",
          definition: "Distinct models with at least one request that day.",
          kind: "lines",
          chart: {
            x: TRACE_DAY_AXIS,
            // From zero, so the caption's rise from under 100 to over 400 reads as the fourfold it is; the most, 422,
            // fits.
            y: { label: "Active models", domain: [0, 450] },
            valueLabel: "Models",
            valueFormat: formatCount,
          },
        }),
        frozenCard({
          figure: "fig_function_name_daily_requests",
          title: "Daily API calls",
          // placeholder: the paragraph's lead-in is on the active models' card; this is its sentence on this panel.
          insight: "Chat-based traffic becomes more prominent, while completion-based traffic declines.",
          caption: "Streaming calls also become less dominant, with non-streaming functions accounting for a larger share later in the trace.",
          definition: "Requests per day by API function: chat, chat stream, completion, completion stream, and Other for every other function.",
          kind: "lines",
          palette: "endpoints",
          chart: {
            x: TRACE_DAY_AXIS,
            // The paper's limits: the busiest function's busiest day, 21.1M requests, sits under its top.
            y: { label: "Requests per day", domain: [0, 23e6], tickFormat: formatCountTick },
            labels: FUNCTION_LABELS,
            valueLabel: "Requests",
            valueFormat: formatCompactCount,
          },
        }),
      ]),
    }),
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "The weekly rhythm",
      takeaway: "Through all of it traffic keeps a weekly and daily cycle, busiest in UTC afternoons.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_seasonality",
          title: "Requests by hour of the week",
          insight: "Weekly and diurnal patterns persist throughout.",
          caption: "Traffic is highest during UTC afternoon and evening hours, especially on weekdays, and lower during overnight hours and weekends.",
          // placeholder: the definition leaves out the README's unit, millions, which the site's colour legend does not
          // use.
          definition: "Average requests in each hour of the week, by weekday and hour of day. Each weekday's total is divided by the number of days that fall on that weekday.",
          kind: "cells",
          chart: {
            x: { label: "Hour of the day (UTC)", ticks: LABELLED_HOURS },
            xTicks: HOURS,
            // Reversed, so the first row, Sunday, is at the top.
            y: { domain: [7, 0] },
            yTicks: WEEKDAY_LABELS,
            scheme: "YlOrRd",
            // A cell's value is one hour's average, so the colour legend and the tooltip name it so.
            valueLabel: "Average requests in the hour",
            valueFormat: formatCountTick,
          },
        }),
      ]),
    }),
  ]),
});
