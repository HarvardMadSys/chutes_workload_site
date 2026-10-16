/**
 * The Insights' fifth topic, Prefix caching: the paper's token hit ratios of requests, models and users, how soon users
 * return, and the eviction algorithms' hit ratios in simulation, as `insights/figure_sections.js` defines a topic. The
 * words are the paper's and the definitions the artifact's README or, for the simulation, its plotting script's; a
 * line marked "placeholder" is not the paper's own, for the authors to review.
 * A card's kind and chart say how its figure is drawn from its answer, as `insights/figure_card.js` defines them.
 */

import { formatCount, formatCountTick, formatPercent, formatSeconds, formatShare } from "../shared/format.js";
import { URLS } from "../shared/layout.js";

// The artifact's README of the trace's caching figures, which says how each is computed.
const SECTION_README = `${URLS.code}/blob/main/paper/04_prefix_caching/README.md`;

// The artifact's folder of the cache simulation, which draws the eviction figures; it has no README of its own.
const SIMULATION_FOLDER = `${URLS.code}/tree/main/pipeline/caching`;

/** The Prefix caching topic. */
export const CACHING_TOPIC = Object.freeze({
  selector: "#insights-caching",
  takeaway: "Cache reuse is common but uneven and strongly recency-driven, making simple policies such as FIFO and LRU highly competitive.",
  cards: Object.freeze([
    Object.freeze({
      figure: "fig_request_cached_fraction_cdf_by_input",
      title: "Prompt length and hit ratio",
      insight: "Request-level cached fractions are bimodal.",
      caption: "Most requests see either little to no prefix reuse or reuse nearly their entire input prefix. Short-input requests skew toward high reuse, long-input requests toward low.",
      definition: "Share of requests whose token hit ratio, the share of input tokens served from the prefix cache, is at most this value: all requests, and those under 1K and over 8K input tokens.",
      source: SECTION_README,
      kind: "cdf",
      chart: {
        x: { label: "Token hit ratio", tickFormat: formatPercent },
        valueLabel: "Token hit ratio",
        valueFormat: formatShare,
      },
    }),
    Object.freeze({
      figure: "fig_request_token_hit_rate_cdf_by_model",
      title: "Model token hit ratio",
      insight: "Cache behavior differs sharply across models.",
      caption: "The two DeepSeek models have many requests with zero cache hits, while MiniMax-M2.5 shows a broader distribution, with many requests at intermediate to high hit ratios.",
      definition: "Share of requests whose token hit ratio is at most this value, over all requests and for the three highlighted models.",
      source: SECTION_README,
      kind: "cdf",
      chart: {
        x: { label: "Token hit ratio", tickFormat: formatPercent },
        valueLabel: "Token hit ratio",
        valueFormat: formatShare,
      },
    }),
    Object.freeze({
      figure: "fig_model_nreq_vs_avg_hitratio_hexbin",
      title: "Per-model cache profile",
      // placeholder: the paragraph's lead-in, "Model and user cacheability.", names a topic, not a claim.
      insight: "Request volume alone does not determine a model's reuse.",
      caption: "Several models with modest request volumes achieve high token hit ratios; they may benefit from a small set of users repeatedly accessing them with similar contexts.",
      definition: "Each model placed by its request count and its average token hit ratio, binned into hexagons shaded by how many models fall in each.",
      source: SECTION_README,
      kind: "cells",
      chart: {
        x: { label: "Requests", log: true, tickFormat: formatCountTick },
        y: { label: "Average token hit ratio", tickFormat: formatPercent },
        valueLabel: "Models",
        valueFormat: formatCount,
      },
    }),
    Object.freeze({
      figure: "fig_user_nreq_vs_avg_hitratio_hexbin",
      title: "Per-user cache profile",
      // placeholder: the paragraph's lead-in, "Model and user cacheability.", names a topic, not a claim.
      insight: "Most users exhibit little reuse, while a smaller group achieves high hit ratios.",
      caption: "The high-reuse users likely repeatedly access a limited set of models, with low inter-arrival times and proper context engineering.",
      definition: "Each user placed by their request count and their average token hit ratio, binned into hexagons shaded by how many users fall in each.",
      source: SECTION_README,
      kind: "cells",
      chart: {
        x: { label: "Requests", log: true, tickFormat: formatCountTick },
        y: { label: "Average token hit ratio", tickFormat: formatPercent },
        valueLabel: "Users",
        valueFormat: formatCount,
      },
    }),
    Object.freeze({
      figure: "fig_iat_monthly_per_user_band",
      title: "Per-user IAT over time",
      insight: "User IAT trends downwards over time.",
      caption: "Per-user inter-arrival time remains on the order of minutes for most of the trace, but declines toward early 2026 with a widened spread.",
      definition: "Each user's time between consecutive requests (inter-arrival time, IAT), by trace month: the median over users of each user's median, with bands between the medians of each user's 10th and 90th and 25th and 75th percentiles.",
      source: SECTION_README,
      kind: "bands",
      chart: {
        x: { label: "Trace month" },
        y: { label: "Per-user IAT (s)" },
        valueLabel: "Per-user IAT",
        valueFormat: formatSeconds,
      },
    }),
    Object.freeze({
      figure: "fig_per_user_iat_p50_by_model",
      title: "Per-user IAT across models",
      // placeholder: the paragraph's lead-in is on the IAT over time card; this is its sentence on this panel.
      insight: "The recurrence pattern also varies significantly by model.",
      caption: "MiniMax-M2.5 has the lowest per-user IAT, consistent with coding or agentic workflows; DeepSeek R1 has the longest, which may reflect more human-paced reasoning interactions.",
      definition: "For each highlighted model, a box plot over users of each user's median time between consecutive requests to that model.",
      source: SECTION_README,
      kind: "boxes",
      chart: { y: { label: "Median IAT per user (s)" }, valueLabel: "Median IAT per user", valueFormat: formatSeconds },
    }),
    Object.freeze({
      figure: "fig_iat_pair_ttl_coverage",
      title: "Per-user-model IAT",
      insight: "A short TTL covers most repeat arrivals.",
      caption: "99% of reuse arrives within 15 minutes of the previous request. Cache locality is concentrated at short timescales.",
      definition: "Share of requests that follow the previous request of the same user and model within this time, weighted by request: the reuse a cache time-to-live (TTL) of that length would cover.",
      source: SECTION_README,
      kind: "lines",
      chart: {
        x: { label: "Time to live (s)", log: true, tickFormat: String },
        y: { label: "Requests covered", tickFormat: formatPercent },
        valueLabel: "Requests covered",
        valueFormat: formatShare,
      },
    }),
    Object.freeze({
      figure: "fig_hit_ratio_minimax_m25",
      title: "Eviction algorithms on MiniMax-M2.5",
      // placeholder: the results paragraph has no lead-in; this is its first finding.
      insight: "Simple eviction policies are already highly competitive for LLM prefix caching.",
      caption: "MiniMax-M2.5 is cache-friendly: its hit ratio increases quickly, and most policies approach the size-aware Belady oracle at moderate cache sizes.",
      definition: "Token hit ratio (1 minus the byte miss ratio) against cache size in tokens, for seven eviction algorithms in libCacheSim replaying MiniMax-M2.5's reconstructed sessions.",
      source: SIMULATION_FOLDER,
      kind: "lines",
      chart: {
        x: { label: "Cache size (tokens)", log: true, tickFormat: formatCountTick },
        y: { label: "Token hit ratio", tickFormat: formatPercent },
        markers: true,
        valueLabel: "Token hit ratio",
        valueFormat: formatShare,
      },
    }),
    Object.freeze({
      figure: "fig_hit_ratio_deepseek_v32",
      title: "Eviction algorithms on DeepSeek V3.2",
      // placeholder: the results paragraph has no lead-in; this is its second finding.
      insight: "Cache effectiveness is workload-dependent.",
      caption: "DeepSeek V3.2 is more cache-constrained: its hit ratio increases gradually with cache size, and practical policies remain below the Belady oracle even at large capacities.",
      definition: "Token hit ratio (1 minus the byte miss ratio) against cache size in tokens, for seven eviction algorithms in libCacheSim replaying DeepSeek V3.2's reconstructed sessions.",
      source: SIMULATION_FOLDER,
      kind: "lines",
      chart: {
        x: { label: "Cache size (tokens)", log: true, tickFormat: formatCountTick },
        y: { label: "Token hit ratio", tickFormat: formatPercent },
        markers: true,
        valueLabel: "Token hit ratio",
        valueFormat: formatShare,
      },
    }),
  ]),
});
