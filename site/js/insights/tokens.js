/**
 * An Insights topic, Request shape and latency: the paper's token-length and latency distributions of all
 * requests and three highlighted models, and median latency by request shape, as `page/topics.js` defines
 * a topic. The words are the paper's and the definitions the artifact README's; a line marked "placeholder" is not
 * the paper's own, for the authors to review.
 * A card's kind and chart say how its figure is drawn from its answer, as `insights/figure_card.js` defines them.
 */

import {
  formatCountTick, formatPercent, formatSeconds, formatSecondsTick, formatShare, formatSignificant, formatThousandsTick,
  formatWholeCount,
} from "../shared/format.js";
import { HIGHLIGHTED_LABELS, HIGHLIGHTED_SERIES } from "./card_series.js";
import { frozenCard } from "./figure_card.js";

// The y axis of every CDF of this topic: the share of requests at or below a value, in percent.
const SHARE_OF_REQUESTS = Object.freeze({ label: "Share of requests" });

// The latency grids' extent, as the paper draws them: input buckets up to 34K tokens, output buckets up to 8,200.
const INPUT_DOMAIN = Object.freeze([0, 34]);
const OUTPUT_DOMAIN = Object.freeze([0, 8200]);

// The hit-ratio grid's extent: its top row, 1.0 to 1.1, holds the requests whose input was all served from the cache.
const HIT_RATIO_DOMAIN = Object.freeze([0, 1.1]);
// The hit-ratio grid's ticks: every fifth of the ratio, the last, 1.05, at the centre of the all-cached top row.
const HIT_RATIO_TICKS = Object.freeze([0, 0.2, 0.4, 0.6, 0.8, 1.05]);

// The grids' height in pixels: the paper's grids are near-square, and the duration and TTFT grids share a row.
const GRID_HEIGHT = 320;

// How the latency grids write seconds: the cells kind gives their colour legend's ticks and their tooltips one format,
// and the ticks' "50 s" reads better there than "50.0 s".
const GRID_SECONDS = formatSecondsTick;

/**
 * A token hit ratio as the hit-ratio grid's axis writes it, a percentage, any ratio above one as "100%": the grid's top
 * row, 1.0 to 1.1, holds the requests whose whole input was cached, so it is labelled "100%" at its centre, 1.05.
 */
function formatHitRatio(ratio) {
  return formatPercent(Math.min(ratio, 1));
}

/** The topic "Request shape and latency". */
export const TOKENS_TOPIC = Object.freeze({
  id: "insights-tokens",
  // placeholder: the title is the site's name for the topic, for the authors.
  title: "Request shape and latency",
  // placeholder: the takeaway is the section's closing conclusion in plain words, for the authors.
  takeaway: "Requests are often prompt-heavy and most latency is decode; the three highlighted models spend it differently, on long outputs or on long prompts.",
  groups: Object.freeze([
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Three model profiles",
      takeaway: "DeepSeek R1 (reasoning) writes long outputs, MiniMax M2.5 (coding and agents) reads long inputs and answers briefly, DeepSeek V3.2 (general chat) sits near the global curve.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_token_length_input_cdf_by_model",
          title: "Input tokens",
          insight: "Requests are often prompt-heavy.",
          caption: "Input sizes vary from roughly 10² to 10⁵ tokens, with a heavy tail toward very long prompts.",
          definition: "Share of requests with at most this many input tokens, over all requests and for three highlighted models: DeepSeek V3.2, DeepSeek R1 and MiniMax M2.5.",
          kind: "cdf",
          series: HIGHLIGHTED_SERIES,
          chart: {
            // From 10, under which fewer than 1% of requests fall, to 1M, past every series' 99th percentile; the
            // decades 100 to 100k ticked and the ends left bare, since a label at either end would crowd its neighbour
            // on a phone.
            x: {
              label: "Input tokens", log: true, domain: [10, 1e6], ticks: [100, 1e3, 1e4, 1e5], tickFormat: formatCountTick,
            },
            y: SHARE_OF_REQUESTS,
            dashed: ["Global"],
            labels: HIGHLIGHTED_LABELS,
            valueLabel: "Input tokens",
            valueFormat: formatWholeCount,
          },
        }),
        frozenCard({
          figure: "fig_token_length_output_cdf_by_model",
          title: "Output tokens",
          insight: "Highlighted models show distinct usage profiles.",
          caption: "Output sizes are more concentrated, mostly between 10¹ and 10³ tokens. DeepSeek R1 has heavier output, consistent with reasoning workloads that generate longer completions.",
          definition: "Share of requests with at most this many output tokens, over all requests and for the three highlighted models.",
          kind: "cdf",
          series: HIGHLIGHTED_SERIES,
          chart: {
            x: { label: "Output tokens", log: true, domain: [1, 2e4], tickFormat: formatCountTick },
            y: SHARE_OF_REQUESTS,
            dashed: ["Global"],
            labels: HIGHLIGHTED_LABELS,
            valueLabel: "Output tokens",
            valueFormat: formatWholeCount,
          },
        }),
        frozenCard({
          figure: "fig_output_input_ratio_cdf_by_model",
          title: "Output-to-input ratio",
          // placeholder: the paragraph's lead-in is on the input tokens' card; this is its sentence on this panel.
          insight: "Most requests generate fewer output tokens than input tokens.",
          caption: "MiniMax-M2.5 has the lowest output-to-input ratio, consistent with coding and agentic workloads; DeepSeek R1 has the highest.",
          definition: "Share of requests whose output tokens divided by their input tokens is at most this ratio, over all requests and for the three highlighted models.",
          kind: "cdf",
          series: HIGHLIGHTED_SERIES,
          chart: {
            // Every decade from 0.01, the card taking its group's width; 0.001 is left out, since on a phone, where the
            // card is a column wide, its label runs into 0.01's.
            x: {
              label: "Output / input tokens", log: true, domain: [5e-4, 100], ticks: [0.01, 0.1, 1, 10, 100],
              tickFormat: String,
            },
            y: SHARE_OF_REQUESTS,
            dashed: ["Global"],
            labels: HIGHLIGHTED_LABELS,
            valueLabel: "Ratio",
            // A ratio to two significant figures, as the site writes one: "0.0047".
            valueFormat: formatSignificant,
          },
          // Wide, as the spec's table sets it, so its log axis of five decades and more, 0.0005 to 100, has the room.
          isWide: true,
        }),
      ]),
    }),
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Latency is mostly decode",
      takeaway: "End-to-end latency spans orders of magnitude, and the time to the first token is usually a small share of it.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_latency_e2e_cdf_by_model",
          title: "End-to-end latency",
          insight: "Models can be latency-bound for different reasons.",
          caption: "End-to-end latency spans several orders of magnitude, from sub-second requests to requests lasting tens of seconds. DeepSeek R1 has the longest, consistent with its long outputs.",
          definition: "Share of requests whose end-to-end latency is at most this many seconds, over all requests and for the three highlighted models.",
          kind: "cdf",
          series: HIGHLIGHTED_SERIES,
          chart: {
            x: { label: "End-to-end latency", log: true, domain: [0.1, 300], tickFormat: formatSecondsTick },
            y: SHARE_OF_REQUESTS,
            dashed: ["Global"],
            labels: HIGHLIGHTED_LABELS,
            valueLabel: "Latency",
            valueFormat: formatSeconds,
          },
        }),
        frozenCard({
          figure: "fig_prefill_fraction_cdf_by_model",
          title: "Fraction of TTFT",
          insight: "End-to-end latency is dominated by decode.",
          caption: "Time to first token is usually only a fraction of a request's duration. MiniMax-M2.5 completes faster overall, but a larger share of its latency comes from it.",
          definition: "Share of requests whose time to first token (TTFT, the prefill) is at most this fraction of the request's whole duration, over all requests and for the three highlighted models.",
          kind: "cdf",
          series: HIGHLIGHTED_SERIES,
          chart: {
            // Quarters rather than the paper's fifths: six percentages crowd a phone's axis.
            x: { label: "TTFT / duration", domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1], tickFormat: formatPercent },
            y: SHARE_OF_REQUESTS,
            dashed: ["Global"],
            labels: HIGHLIGHTED_LABELS,
            valueLabel: "Fraction of the duration",
            valueFormat: formatShare,
          },
        }),
      ]),
    }),
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "What drives latency",
      takeaway: "Duration grows with output length, time to first token with input length, and caching cuts it most for long inputs.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_duration_p50_heatmap",
          title: "Output tokens and duration",
          insight: "Output length drives duration; input length drives TTFT.",
          caption: "Median end-to-end duration increases proportionally to output length and is barely affected by input length, since completion time is decode dominated.",
          definition: "Median duration of the requests in each bucket of input tokens and output tokens.",
          kind: "cells",
          chart: {
            x: { label: "Input tokens", domain: INPUT_DOMAIN, tickFormat: formatThousandsTick },
            y: { label: "Output tokens", domain: OUTPUT_DOMAIN, tickFormat: formatCountTick },
            height: GRID_HEIGHT,
            scheme: "YlOrRd",
            valueLabel: "Median duration",
            valueFormat: GRID_SECONDS,
          },
        }),
        frozenCard({
          figure: "fig_ttft_p50_heatmap_input_output",
          title: "Input tokens and TTFT",
          // placeholder: the paragraph's lead-in is on the duration's card; this is its sentence on this panel.
          insight: "Time to first token grows primarily with input length.",
          caption: "Duration is governed by output length, and TTFT by input length.",
          definition: "Median time to first token of the requests in each bucket of input tokens and output tokens.",
          kind: "cells",
          chart: {
            x: { label: "Input tokens", domain: INPUT_DOMAIN, tickFormat: formatThousandsTick },
            y: { label: "Output tokens", domain: OUTPUT_DOMAIN, tickFormat: formatCountTick },
            height: GRID_HEIGHT,
            scheme: "YlOrRd",
            valueLabel: "Median TTFT",
            valueFormat: GRID_SECONDS,
          },
        }),
        frozenCard({
          figure: "fig_ttft_heatmap_input_cached",
          title: "TTFT and token hit ratio",
          // placeholder: the paragraph's lead-in is on the duration's card; this is the figure caption's claim.
          insight: "Caching cuts TTFT most aggressively on long-input requests.",
          caption: "For requests with similar input length, higher token hit ratios correspond to lower TTFT. For short inputs, even near-full cache hits remove little prefill work.",
          definition: "Median time to first token over buckets of input tokens and token hit ratio, the share of a request's input tokens served from the prefix cache.",
          kind: "cells",
          chart: {
            x: { label: "Input tokens", domain: INPUT_DOMAIN, tickFormat: formatThousandsTick },
            y: { label: "Token hit ratio", domain: HIT_RATIO_DOMAIN, ticks: HIT_RATIO_TICKS, tickFormat: formatHitRatio },
            height: GRID_HEIGHT,
            scheme: "YlOrRd",
            valueLabel: "Median TTFT",
            valueFormat: GRID_SECONDS,
          },
        }),
      ]),
    }),
  ]),
});
