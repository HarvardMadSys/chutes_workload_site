/**
 * The Insights' first topic, Workload overview: the five panels of the paper's figure of daily demand over the year,
 * as `explore/figure_sections.js` defines a topic. The words are the paper's and the definitions the artifact
 * README's; a line marked "placeholder" is not the paper's own, for the authors to review.
 * A card's cache is where the artifact keeps the results its figure is drawn from, as the artifact's READMEs say.
 */

import { URLS } from "../shared/layout.js";

// The artifact's README of these figures, which says how each is computed.
const SECTION_README = `${URLS.code}/blob/main/paper/01_workload_overview/README.md`;

/** The Workload overview topic. */
export const OVERVIEW_TOPIC = Object.freeze({
  selector: "#insights-overview",
  // placeholder: the paper has no finding box for this section; this is its first figure's conclusion.
  takeaway: "Production load is non-stationary and cannot be summarized by request count alone.",
  cards: Object.freeze([
    Object.freeze({
      image: "fig_request_rate_day",
      title: "Daily request rate",
      insight: "Aggregate demand is non-stationary.",
      caption: "Daily request volume rises through mid-2025, peaks around late summer and fall, and then declines into early 2026.",
      definition: "Requests per day over the trace's year.",
      cache: "daily_requests.parquet, shipped in data/paper/cache/",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_token_rate_day",
      title: "Daily token rate",
      // placeholder: the paragraph's lead-in is on the request rate's card; this is its sentence on this panel.
      insight: "Similar request volumes can represent different amounts of serving work.",
      caption: "Daily token volume follows a similar but not identical trend: it grows quickly early in the trace, remains elevated for much of the year, and drops more sharply near the end.",
      definition: "Input plus output tokens per day, over the requests that completed.",
      cache: "daily_tokens.parquet, shipped in data/paper/cache/",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_daily_unique_models",
      title: "Daily active models",
      insight: "Active models and API mix shift over the year.",
      caption: "The number of active models per day grows from fewer than 100 early in the trace to more than 400 at its peak, before settling at a lower but still elevated level.",
      definition: "Distinct models with at least one request that day.",
      cache: "daily_unique_users_models.parquet, shipped in data/paper/cache/",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_function_name_daily_requests",
      title: "Daily API calls",
      // placeholder: the paragraph's lead-in is on the active models' card; this is its sentence on this panel.
      insight: "Chat-based traffic becomes more prominent, while completion-based traffic declines.",
      caption: "Streaming calls also become less dominant, with non-streaming functions accounting for a larger share later in the trace.",
      definition: "Requests per day by API function: chat, chat stream, completion, completion stream, and Other for every other function.",
      cache: "function_name_daily_requests.parquet, shipped in data/paper/cache/",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_seasonality",
      title: "Requests by hour of the week",
      insight: "Weekly and diurnal patterns persist throughout.",
      caption: "Traffic is highest during UTC afternoon and evening hours, especially on weekdays, and lower during overnight hours and weekends.",
      definition: "Average requests in each hour of the week, by weekday and hour of day, in millions. Each weekday's total is divided by the number of days that fall on that weekday.",
      cache: "hour_of_week_requests.parquet, with daily_requests.parquet for the weekdays' day counts, both shipped in data/paper/cache/",
      source: SECTION_README,
    }),
  ]),
});
