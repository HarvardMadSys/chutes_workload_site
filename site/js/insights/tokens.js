/**
 * The Insights' second topic, Token shape and latency: the paper's token-length and latency distributions of all
 * requests and three highlighted models, and median latency by request shape, as `explore/figure_sections.js` defines
 * a topic.
 */

import { URLS } from "../shared/layout.js";

// The artifact's README of these figures, which says how each is computed.
const SECTION_README = `${URLS.code}/blob/main/paper/02_token_shape_latency/README.md`;

/** The Token shape and latency topic. */
export const TOKENS_TOPIC = Object.freeze({
  selector: "#insights-tokens",
  takeaway: "",
  cards: Object.freeze([
    Object.freeze({
      image: "fig_token_length_input_cdf_by_model",
      title: "Input tokens",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_token_length_output_cdf_by_model",
      title: "Output tokens",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_output_input_ratio_cdf_by_model",
      title: "Output-to-input ratio",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_latency_e2e_cdf_by_model",
      title: "End-to-end latency",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_prefill_fraction_cdf_by_model",
      title: "Fraction of TTFT",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_duration_p50_heatmap",
      title: "Output tokens and duration",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_ttft_p50_heatmap_input_output",
      title: "Input tokens and TTFT",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_ttft_heatmap_input_cached",
      title: "TTFT and token hit ratio",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
  ]),
});
