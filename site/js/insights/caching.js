/**
 * The Insights' fifth topic, Prefix caching: the paper's token hit ratios of requests, models and users, how soon users
 * return, and the eviction algorithms' hit ratios in simulation, as `explore/figure_sections.js` defines a topic.
 */

import { URLS } from "../shared/layout.js";

// The artifact's README of the trace's caching figures, which says how each is computed.
const SECTION_README = `${URLS.code}/blob/main/paper/04_prefix_caching/README.md`;

// The artifact's folder of the cache simulation, which draws the eviction figures; it has no README of its own.
const SIMULATION_FOLDER = `${URLS.code}/tree/main/pipeline/caching`;

/** The Prefix caching topic. */
export const CACHING_TOPIC = Object.freeze({
  selector: "#insights-caching",
  takeaway: "",
  cards: Object.freeze([
    Object.freeze({
      image: "fig_request_cached_fraction_cdf_by_input",
      title: "Prompt length and hit ratio",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_request_token_hit_rate_cdf_by_model",
      title: "Model token hit ratio",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_model_nreq_vs_avg_hitratio_hexbin",
      title: "Per-model cache profile",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_user_nreq_vs_avg_hitratio_hexbin",
      title: "Per-user cache profile",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_iat_monthly_per_user_band",
      title: "Per-user IAT over time",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_per_user_iat_p50_by_model",
      title: "Per-user IAT across models",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_iat_pair_ttl_coverage",
      title: "Per-user-model IAT",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_hit_ratio_minimax_m25",
      title: "Eviction algorithms on MiniMax-M2.5",
      insight: "",
      caption: "",
      definition: "",
      source: SIMULATION_FOLDER,
    }),
    Object.freeze({
      image: "fig_hit_ratio_deepseek_v32",
      title: "Eviction algorithms on DeepSeek V3.2",
      insight: "",
      caption: "",
      definition: "",
      source: SIMULATION_FOLDER,
    }),
  ]),
});
