/**
 * The Insights' fifth topic, Prefix caching: the paper's token hit ratios of requests, models and users, how soon users
 * return, and the eviction algorithms' hit ratios in simulation, as `explore/figure_sections.js` defines a topic. The
 * words are the paper's and the definitions the artifact's README or, for the simulation, its plotting script's; a
 * line marked "placeholder" is not the paper's own, for the authors to review.
 * A card's kind and chart say how its figure is drawn from its answer, as `insights/figure_card.js` defines them.
 */

import {
  formatCount, formatCountTick, formatDurationTick, formatPercent, formatSeconds, formatSecondsTick, formatShare,
  formatWholeCountTick,
} from "../shared/format.js";
import { HIGHLIGHTED_LABELS, HIGHLIGHTED_SERIES } from "../shared/series.js";
import { COUNT_COLOUR, frozenCard, TRACE_MONTH_AXIS } from "./figure_card.js";

// An axis of the token hit ratio, 0 to 1, labelled every fifth as the paper's.
const HIT_RATIO_AXIS = Object.freeze({
  label: "Token hit ratio", domain: [0, 1], ticks: [0, 0.2, 0.4, 0.6, 0.8, 1], tickFormat: String,
});

// The y axis of the hit-ratio CDFs: the share of requests at or below a ratio, in percent.
const SHARE_OF_REQUESTS = Object.freeze({ label: "Share of requests" });

// The CDF by input length's series, in the paper's legend order.
const INPUT_LENGTH_SERIES = Object.freeze(["Global", "<1K input", ">8K input"]);

// The eviction algorithms, in the paper's legend order, the size-aware Belady oracle last and dashed.
const EVICTION_ALGORITHMS = Object.freeze(["FIFO", "LRU", "ARC", "LRB", "GDSF", "Sieve", "Belady (size-aware)"]);
const ORACLE = Object.freeze(["Belady (size-aware)"]);

// The three highlighted models, without the global series: the boxes of the per-user IAT.
const HIGHLIGHTED_MODELS = Object.freeze(HIGHLIGHTED_SERIES.filter((name) => name !== "Global"));

// The top of the per-user IAT band card's linear y axis, in seconds: the 90th percentile passes it in the last months
// and is cut off there, so that a linear axis shows the median's move, which a log axis hid.
const IAT_CAP_SECONDS = 400;

/** The Prefix caching topic. */
export const CACHING_TOPIC = Object.freeze({
  selector: "#insights-caching",
  // placeholder: the takeaway is the paper's finding for the section in plain words, for the authors.
  takeaway: "Cache reuse is common but uneven: a request reuses nearly all of its prefix or none, and most reuse returns within minutes, so simple eviction works.",
  groups: Object.freeze([
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Reuse is all or nothing",
      takeaway: "A request reuses nearly all of its prefix or none; DeepSeek's models mostly see none, MiniMax M2.5 a broad range, so cacheability follows the use case and the user base.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_request_cached_fraction_cdf_by_input",
          title: "Prompt length and hit ratio",
          insight: "Request-level cached fractions are bimodal.",
          caption: "Most requests see either little to no prefix reuse or reuse nearly their entire input prefix. Short-input requests skew toward high reuse, long-input requests toward low.",
          definition: "Share of requests whose token hit ratio, the share of input tokens served from the prefix cache, is at most this value: all requests, and those under 1K and over 8K input tokens.",
          kind: "cdf",
          series: INPUT_LENGTH_SERIES,
          chart: {
            x: HIT_RATIO_AXIS,
            y: SHARE_OF_REQUESTS,
            dashed: ["Global"],
            valueLabel: "Token hit ratio",
            valueFormat: formatCount,
          },
        }),
        frozenCard({
          figure: "fig_request_token_hit_rate_cdf_by_model",
          title: "Model token hit ratio",
          insight: "Cache behavior differs sharply across models.",
          // placeholder: "most" and "near-zero" as the answer shows, and what MiniMax-M2.5 is used for, are the site's.
          caption: "Most requests to the two DeepSeek models have near-zero cache hits, while MiniMax-M2.5, used for coding and agents, shows a broader distribution, with many requests at intermediate to high hit ratios.",
          definition: "Share of requests whose token hit ratio is at most this value, over all requests and for the three highlighted models.",
          kind: "cdf",
          series: HIGHLIGHTED_SERIES,
          chart: {
            x: HIT_RATIO_AXIS,
            y: SHARE_OF_REQUESTS,
            dashed: ["Global"],
            labels: HIGHLIGHTED_LABELS,
            valueLabel: "Token hit ratio",
            valueFormat: formatCount,
          },
        }),
        frozenCard({
          figure: "fig_model_nreq_vs_avg_hitratio_hexbin",
          title: "Per-model cache profile",
          // placeholder: the paragraph's lead-in, "Model and user cacheability.", names a topic, not a claim.
          insight: "Request volume alone does not determine a model's reuse.",
          caption: "Several models with modest request volumes achieve high token hit ratios; they may benefit from a small set of users repeatedly accessing them with similar contexts.",
          // placeholder: "cells of a log grid", not "hexagons": the cells drawn are squares.
          definition: "Each model placed by its request count and its average token hit ratio, binned into cells of a log grid shaded by how many models fall in each.",
          kind: "cells",
          chart: {
            // From 100, the least requests of a model drawn (101), to past the most, 141M; every second decade
            // labelled, the left edge among them, so that six labels do not run together on a phone.
            x: {
              label: "Requests", log: true, domain: [100, 2e8], ticks: [100, 1e4, 1e6, 1e8],
              tickFormat: formatWholeCountTick,
            },
            y: { ...HIT_RATIO_AXIS, label: "Average token hit ratio" },
            ...COUNT_COLOUR,
            valueLabel: "Models",
            valueFormat: formatCount,
          },
        }),
        frozenCard({
          figure: "fig_user_nreq_vs_avg_hitratio_hexbin",
          title: "Per-user cache profile",
          // placeholder: the paragraph's lead-in, "Model and user cacheability.", names a topic, not a claim.
          insight: "Most users exhibit little reuse, while a smaller group achieves high hit ratios.",
          caption: "The high-reuse users likely repeatedly access a limited set of models, with low inter-arrival times and proper context engineering.",
          // placeholder: "cells of a log grid", not "hexagons": the cells drawn are squares.
          definition: "Each user placed by their request count and their average token hit ratio, binned into cells of a log grid shaded by how many users fall in each.",
          kind: "cells",
          chart: {
            // From 10, the least requests of a user drawn (11), to past the most, 158M; labelled at every second decade
            // from the left edge, 1k among them, where most users fall.
            x: {
              label: "Requests", log: true, domain: [10, 2e8], ticks: [10, 1e3, 1e5, 1e7],
              tickFormat: formatWholeCountTick,
            },
            y: { ...HIT_RATIO_AXIS, label: "Average token hit ratio" },
            ...COUNT_COLOUR,
            valueLabel: "Users",
            valueFormat: formatCount,
          },
        }),
      ]),
    }),
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Reuse comes back fast",
      takeaway: "Per-user inter-arrival times run to minutes and shorten over the year, and 99% of repeat requests to a model return within 15 minutes, so a short TTL keeps most reuse.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_iat_monthly_per_user_band",
          title: "Per-user IAT over time",
          insight: "User IAT trends downwards over time.",
          caption: "Per-user inter-arrival time remains on the order of minutes for most of the trace, but declines toward early 2026 with a widened spread.",
          // placeholder: the last sentence explains the star of the partial last month.
          definition: "Each user's time between consecutive requests (inter-arrival time, IAT), by trace month: the median over users of each user's median, with bands between the medians of each user's 10th and 90th and 25th and 75th percentiles. Apr '26* holds only the trace's last two days.",
          kind: "bands",
          chart: {
            x: TRACE_MONTH_AXIS,
            y: { label: "Inter-arrival time (s)", domain: [0, IAT_CAP_SECONDS] },
            valueLabel: "Per-user IAT",
            valueFormat: formatSeconds,
          },
        }),
        frozenCard({
          figure: "fig_per_user_iat_p50_by_model",
          title: "Per-user IAT across models",
          // placeholder: the paragraph's lead-in is on the IAT over time card; this is its sentence on this panel.
          insight: "The recurrence pattern also varies significantly by model.",
          // placeholder: the caption names all three profiles, DeepSeek V3.2 and MiniMax-M2.5's rapid succession added.
          caption: "MiniMax-M2.5 has the lowest per-user IAT, consistent with coding or agentic workflows sending requests in rapid succession; DeepSeek R1 has the longest, which may reflect more human-paced reasoning interactions. DeepSeek V3.2 falls between.",
          definition: "For each highlighted model, a box plot over users of each user's median time between consecutive requests to that model.",
          kind: "boxes",
          series: HIGHLIGHTED_MODELS,
          chart: {
            // Slanted as the paper's, so the three names keep clear of one another on a phone, with room below for
            // them.
            x: { tickRotate: -25 },
            // From zero, as the paper's, to past the highest whisker, 538.8 s.
            y: { label: "Per-user median IAT", domain: [0, 560], tickFormat: formatSecondsTick },
            // Room for the slanted names, which reach 67 px below the plot at any width: at 52 "DeepSeek V3.2" is cut
            // off.
            margins: { marginBottom: 72 },
            labels: HIGHLIGHTED_LABELS,
            valueLabel: "Median IAT per user",
            valueFormat: formatSeconds,
          },
        }),
        frozenCard({
          figure: "fig_iat_pair_ttl_coverage",
          title: "Per-user-model IAT",
          insight: "A short TTL covers most repeat arrivals.",
          caption: "99% of reuse arrives within 15 minutes of the previous request. Cache locality is concentrated at short timescales.",
          definition: "Share of requests that follow the previous request of the same user and model within this time, weighted by request: the reuse a cache time-to-live (TTL) of that length would cover.",
          kind: "lines",
          chart: {
            // Ticked at 1 ms, where the coverage starts, and at the thresholds the paper quotes, 0.1 s, 10 s and 15
            // min, about two decades apart; from 0.3 ms, so "1 ms" clears the y axis's lowest label.
            x: {
              label: "Time to live", log: true, domain: [3e-4, 1e4], ticks: [0.001, 0.1, 10, 900],
              tickFormat: formatDurationTick,
            },
            y: { label: "Request-weighted coverage", domain: [0, 1], tickFormat: formatPercent },
            valueLabel: "Requests covered",
            valueFormat: formatShare,
          },
          // Wide, so it does not sit alone in half a row under the two inter-arrival cards of its group.
          isWide: true,
        }),
      ]),
    }),
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Simple eviction is enough",
      takeaway: "FIFO and LRU match or beat newer policies; the gap to Belady is what session-aware caching could still win, more so on DeepSeek V3.2.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_hit_ratio_minimax_m25",
          title: "Eviction algorithms on MiniMax-M2.5",
          // placeholder: the results paragraph has no lead-in; this is its first finding.
          insight: "Simple eviction policies are already highly competitive for LLM prefix caching.",
          caption: "MiniMax-M2.5 is cache-friendly: its hit ratio increases quickly, and most policies approach the size-aware Belady oracle at moderate cache sizes.",
          definition: "Token hit ratio (1 minus the byte miss ratio) against cache size in tokens, for seven eviction algorithms in libCacheSim replaying MiniMax-M2.5's reconstructed sessions.",
          kind: "lines",
          series: EVICTION_ALGORITHMS,
          chart: {
            x: { label: "Cache size (tokens)", log: true, tickFormat: formatCountTick },
            // 0 to 1 on both eviction cards, so the pair compares at a glance and the axis's ends are labelled.
            y: HIT_RATIO_AXIS,
            markers: true,
            // LRB's line covers LRU's: the tooltip lists every algorithm at the hovered cache size.
            tipAllSeries: true,
            dashed: ORACLE,
            valueLabel: "Token hit ratio",
            valueFormat: formatCount,
          },
        }),
        frozenCard({
          figure: "fig_hit_ratio_deepseek_v32",
          title: "Eviction algorithms on DeepSeek V3.2",
          // placeholder: the results paragraph has no lead-in; this is its second finding.
          insight: "Cache effectiveness is workload-dependent.",
          caption: "DeepSeek V3.2 is more cache-constrained: its hit ratio increases gradually with cache size, and practical policies remain below the Belady oracle even at large capacities.",
          definition: "Token hit ratio (1 minus the byte miss ratio) against cache size in tokens, for seven eviction algorithms in libCacheSim replaying DeepSeek V3.2's reconstructed sessions.",
          kind: "lines",
          series: EVICTION_ALGORITHMS,
          chart: {
            x: { label: "Cache size (tokens)", log: true, tickFormat: formatCountTick },
            // 0 to 1 on both eviction cards, so the pair compares at a glance and the axis's ends are labelled.
            y: HIT_RATIO_AXIS,
            markers: true,
            // LRB's line covers LRU's: the tooltip lists every algorithm at the hovered cache size.
            tipAllSeries: true,
            dashed: ORACLE,
            valueLabel: "Token hit ratio",
            valueFormat: formatCount,
          },
        }),
      ]),
    }),
  ]),
});
