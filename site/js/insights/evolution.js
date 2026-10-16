/**
 * The Insights' fourth topic, Workload evolution: the paper's monthly model mix, monthly token-length bands and the
 * token lengths of each release cohort of users, as `explore/figure_sections.js` defines a topic. The two share
 * panels show the legend the paper draws once above both.
 */

import { URLS } from "../shared/layout.js";

// The artifact's README of these figures, which says how each is computed.
const SECTION_README = `${URLS.code}/blob/main/paper/03_workload_evolution/README.md`;

// The legend of the two monthly share panels: the ten most requested models and Others.
const SHARE_LEGEND = "fig_top10_model_monthly_share_legend";

/** The Workload evolution topic. */
export const EVOLUTION_TOPIC = Object.freeze({
  selector: "#insights-evolution",
  takeaway: "",
  cards: Object.freeze([
    Object.freeze({
      image: "fig_top10_model_monthly_request_share",
      title: "Request share",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
      legendImage: SHARE_LEGEND,
    }),
    Object.freeze({
      image: "fig_top10_model_monthly_token_share",
      title: "Token share",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
      legendImage: SHARE_LEGEND,
    }),
    Object.freeze({
      image: "fig_monthly_input_token_intervals",
      title: "Monthly input intervals",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_monthly_output_token_intervals",
      title: "Monthly output intervals",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_user_release_cohort_input_band",
      title: "Median input by cohort",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_user_release_cohort_output_band",
      title: "Median output by cohort",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
  ]),
});
