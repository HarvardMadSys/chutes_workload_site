/**
 * The Insights' third topic, Users and models: the paper's request volume, token shape, access rasters and
 * burstiness of each model and user, as `explore/figure_sections.js` defines a topic.
 */

import { URLS } from "../shared/layout.js";

// The artifact's README of these figures, which says how each is computed.
const SECTION_README = `${URLS.code}/blob/main/paper/06_users_models/README.md`;

/** The Users and models topic. */
export const USERS_TOPIC = Object.freeze({
  selector: "#insights-users",
  takeaway: "",
  cards: Object.freeze([
    Object.freeze({
      image: "fig_model_requests_vs_users_density",
      title: "Models: requests and users",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_user_requests_distinct_models_heatmap",
      title: "Users: requests and models",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_model_median_input_output_heatmap",
      title: "Models: input and output",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_user_median_input_output_heatmap",
      title: "Users: input and output",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_model_raster_qwen3_next_80b",
      title: "Periodic user access",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_model_raster_gpt_oss_20b",
      title: "Correlated access",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_user_raster_periodic",
      title: "Periodic user usage",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_user_raster_explore",
      title: "Model exploration",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_model_heatmap_fixedxy_density",
      title: "Popularity and burstiness",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_model_heatmap_fixedxy_scatter_colored_metrics",
      title: "Lag-1 IAT autocorrelation",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
  ]),
});
