/**
 * The Insights' first topic, Workload overview: the five panels of the paper's figure of daily demand over the year,
 * as `explore/figure_sections.js` defines a topic.
 */

import { URLS } from "../shared/layout.js";

// The artifact's README of these figures, which says how each is computed.
const SECTION_README = `${URLS.code}/blob/main/paper/01_workload_overview/README.md`;

/** The Workload overview topic. */
export const OVERVIEW_TOPIC = Object.freeze({
  selector: "#insights-overview",
  takeaway: "",
  cards: Object.freeze([
    Object.freeze({
      image: "fig_request_rate_day",
      title: "Daily request rate",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_token_rate_day",
      title: "Daily token rate",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_daily_unique_models",
      title: "Daily active models",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_function_name_daily_requests",
      title: "Daily API calls",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_seasonality",
      title: "Requests by hour of the week",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
  ]),
});
