/**
 * The Insights' sixth topic, Load balancing: the paper's two months of one popular model's load across its instances,
 * latency against instance load, one user's requests across instances, and the routing simulation's trade-off, as
 * `insights/figure_sections.js` defines a topic. The words are the paper's and the definitions the artifact's README
 * or, for the simulation, its plotting script's; a line marked "placeholder" is not the paper's own, for the authors
 * to review.
 * A card's kind and chart say how its figure is drawn from its answer, as `insights/figure_card.js` defines them.
 */

import {
  formatCompactCount, formatCount, formatCountTick, formatMinutesTick, formatPercentage, formatSecondsTick,
  formatWholeCountTick,
} from "../shared/format.js";
import { URLS } from "../shared/layout.js";
import { frozenCard } from "./figure_card.js";

// The artifact's README of the trace's load-balancing figures, which says how each is computed.
const SECTION_README = `${URLS.code}/blob/main/paper/05_load_balancing/README.md`;

// The artifact's folder of the routing simulation, which draws its figure; it has no README of its own.
const SIMULATION_FOLDER = `${URLS.code}/tree/main/pipeline/routing`;

// The x axis of the three hourly lines: the hour's start, as a day of the trace.
const TRACE_DAY_AXIS = Object.freeze({ label: "Day of the trace" });

// The occupancy's x axis: the minutes of its 24-hour window, which starts at 17:00 UTC on day 317 of the trace,
// labelled every eighth hour (every fourth runs together on a phone), written as hours and minutes from its start.
const WINDOW_AXIS = Object.freeze({
  label: "Time from day 317, 17:00 UTC", ticks: [0, 480, 960, 1440], tickFormat: formatMinutesTick,
});

// The instance load's axis of the two P90 grids, labelled every second power of ten as the paper's.
const INSTANCE_LOAD_AXIS = Object.freeze({
  label: "Instance load (tokens/s)", log: true, ticks: [10, 1e3, 1e5], tickFormat: formatWholeCountTick,
});

// The two panels of a user zoom: per instance, the user's share of the hour's requests and its token hit ratio, both
// in percent, the token hit on the paper's 0 to 100.
// placeholder: the panel titles are the paper's axis titles, for the authors to confirm.
const USER_ZOOM_PANELS = [
  { panel: "request_share", title: "User request (%)", chart: { valueLabel: "User request" } },
  { panel: "token_hit", title: "Token hit (%)", chart: { y: { domain: [0, 100] }, valueLabel: "Token hit" } },
];

// The routing figure's eight series, a policy of the four for each of the two models, in the paper's legend order;
// MiniMax-M2.5's, the paper's lower row, dashed.
const ROUTING_POLICIES = ["Round-robin", "Load-first", "Cache-first", "Sticky"];
const ROUTING_DEEPSEEK = ROUTING_POLICIES.map((policy) => `DeepSeek V3.2, ${policy}`);
const ROUTING_MINIMAX = ROUTING_POLICIES.map((policy) => `MiniMax M2.5, ${policy}`);

// The routing panels' x axes: the cache size of an instance, on the paper's 10³ to past 10⁶, and the instances.
const CACHE_SIZE_AXIS = { label: "Instance cache size", log: true, domain: [1e3, 6e6], tickFormat: formatCountTick };
const INSTANCES_AXIS = { label: "Instances", ticks: [5, 10, 15, 20], tickFormat: String };

/** The Load balancing topic. */
export const BALANCING_TOPIC = Object.freeze({
  selector: "#insights-balancing",
  takeaway: "LLM serving faces a fundamental tension between cache locality and load balance: stickiness preserves locality but conflicts with balancing.",
  cards: Object.freeze([
    frozenCard({
      figure: "fig_lb_request_rate",
      title: "Requests per hour",
      // placeholder: the overview paragraph has no lead-in; this is the figure caption's line on this panel.
      insight: "Request rate stays roughly stationary.",
      caption: "Request rate remains bursty but roughly stationary throughout the trace's last two months.",
      definition: "Requests per hour to DeepSeek-V3-0324 over trace days 306 to 364, the trace's last two months.",
      source: SECTION_README,
      kind: "lines",
      chart: {
        x: TRACE_DAY_AXIS,
        y: { label: "Requests per hour", tickFormat: formatCountTick },
        valueLabel: "Requests",
        valueFormat: formatCompactCount,
      },
    }),
    frozenCard({
      figure: "fig_lb_active_instances",
      title: "Active instances per hour",
      // placeholder: the overview paragraph has no lead-in; this is its sentence on this panel.
      insight: "Replica count tracks serving utilization rather than request volume alone.",
      caption: "The number of active instances declines, closely following the reduction in total tokens processed per hour: scaling responds to token work, not just request arrivals.",
      definition: "Active instances of DeepSeek-V3-0324 in each minute, the median of each hour, over the trace's last two months.",
      source: SECTION_README,
      kind: "lines",
      chart: {
        x: TRACE_DAY_AXIS,
        y: { label: "Active instances" },
        valueLabel: "Active instances",
        valueFormat: formatCount,
      },
    }),
    frozenCard({
      figure: "fig_lb_maxmean_tokens",
      title: "Token max/mean ratio",
      // placeholder: the overview paragraph has no lead-in; this is its sentence on this panel.
      insight: "Load is not always evenly distributed across active instances.",
      caption: "The per-hour max/mean token-load ratio drifts upward as the model scales down, so the imbalance worsens as the serving pool shrinks.",
      definition: "Each minute's highest token load on one instance of DeepSeek-V3-0324 divided by the mean across its instances, averaged over each hour.",
      source: SECTION_README,
      kind: "lines",
      chart: {
        x: TRACE_DAY_AXIS,
        y: { label: "Max/mean token load" },
        valueLabel: "Max/mean token load",
        valueFormat: formatCount,
      },
    }),
    frozenCard({
      figure: "fig_lb_concurrency",
      title: "Per-instance occupancy",
      // placeholder: the overview paragraph has no lead-in; this is its sentence on this panel.
      insight: "Load is balanced in aggregate, but not perfectly balanced at every instant.",
      caption: "On the busiest day most active instances remain busy with similar per-minute request rates, while a small number become quiet around mid-day.",
      definition: "Requests per instance of DeepSeek-V3-0324 and minute, over the 24 hours with the most active instances.",
      source: SECTION_README,
      kind: "cells",
      chart: {
        x: WINDOW_AXIS,
        y: { label: "Instance index" },
        // The paper's: viridis, clipped to the 5th and 99th percentiles of the minutes' requests.
        scheme: "viridis",
        colourDomain: [36, 80],
        valueLabel: "Requests per minute",
        valueFormat: formatCount,
      },
    }),
    frozenCard({
      figure: "fig_lb_ttft_p90_vs_load",
      title: "Load and TTFT",
      // placeholder: the overview paragraph has no lead-in; this is its sentence on this panel.
      insight: "P90 TTFT rises sharply once an instance exceeds a high tokens-per-second threshold.",
      caption: "The rise is sharpest for long-input requests: TTFT climbs once long-token requests land on heavily loaded instances.",
      definition: "Requests of DeepSeek-V3.2 binned into hexagons by their instance's load in tokens per second and their input tokens, each hexagon coloured by the 90th percentile of time to first token.",
      source: SECTION_README,
      kind: "cells",
      chart: {
        x: INSTANCE_LOAD_AXIS,
        y: { label: "Input tokens", log: true, tickFormat: formatWholeCountTick },
        // The latency grids' scheme, its darkest values keeping their ink on either card; clipped as the paper's, to
        // the 5th and 95th percentiles of every request's TTFT.
        scheme: "YlOrRd",
        colourDomain: [1.1, 13.6],
        valueLabel: "P90 TTFT",
        valueFormat: formatSecondsTick,
      },
    }),
    frozenCard({
      figure: "fig_lb_decode_p90_vs_load",
      title: "Load and decode time",
      // placeholder: the overview paragraph has no lead-in; this is its sentence on this panel.
      insight: "P90 decode time mainly follows output length and is largely insensitive to instance throughput.",
      caption: "Overload primarily affects prefill, making input-heavy traffic the most vulnerable to load imbalance.",
      definition: "Requests of DeepSeek-V3.2 binned into hexagons by their instance's load in tokens per second and their output tokens, each hexagon coloured by the 90th percentile of decode time.",
      source: SECTION_README,
      kind: "cells",
      chart: {
        x: INSTANCE_LOAD_AXIS,
        y: { label: "Output tokens", log: true, tickFormat: formatWholeCountTick },
        // As the TTFT grid's, clipped to the 5th and 95th percentiles of every request's decode time.
        scheme: "YlOrRd",
        colourDomain: [0, 153],
        valueLabel: "P90 decode time",
        valueFormat: formatSecondsTick,
      },
    }),
    frozenCard({
      figure: "fig_lb_user_zoom_top",
      title: "High load",
      // placeholder: the paragraph has no lead-in; this is its sentence on this panel.
      insight: "Under high load, the load balancer spreads a user across many instances to avoid overloading any one.",
      caption: "The user's traffic resembles the global load distribution, but several instances still show measurable hit ratios: routing duplicates KV state across instances.",
      definition: "The busiest hour of the busiest DeepSeek-V3.2 user whose token hit ratio that hour is at least 0.4: per instance, the user's share of requests and its token hit ratio.",
      source: SECTION_README,
      kind: "bars",
      chart: { x: { label: "Instance index" }, valueFormat: formatPercentage },
      panels: USER_ZOOM_PANELS,
    }),
    frozenCard({
      figure: "fig_lb_user_zoom_min",
      title: "Low load",
      // placeholder: the paragraph has no lead-in; this is its sentence on this panel.
      insight: "Under low load, the user stays mostly on one instance, and cache hits concentrate there.",
      caption: "Keeping a user's requests on one instance preserves its prefix state and maximizes reuse.",
      definition: "The same for the least busy such user, still with at least 200 requests in that hour.",
      source: SECTION_README,
      kind: "bars",
      chart: { x: { label: "Instance index" }, valueFormat: formatPercentage },
      panels: USER_ZOOM_PANELS,
    }),
    frozenCard({
      figure: "fig_routing_tradeoff",
      title: "Load balance simulation",
      insight: "Cache-aware routing unlocks fleet-wide KV capacity.",
      caption: "Cache-aware routing turns larger KV caches into higher hit ratios and less replication, while cache-blind policies remain highly replicated. Cache-first routing pays a modest load imbalance.",
      definition: "A simulated fleet of LRU caches replaying DeepSeek V3.2 (top) and MiniMax-M2.5 (bottom) under four routing policies: hit ratio (a) and replication (b) against cache size on 20 instances; replication (c) and load imbalance (d) against the number of instances.",
      source: SIMULATION_FOLDER,
      kind: "lines",
      series: [...ROUTING_DEEPSEEK, ...ROUTING_MINIMAX],
      chart: { markers: true, dashed: ROUTING_MINIMAX, valueFormat: formatCount },
      // placeholder: the panel titles are the figure's own subcaptions, for the authors to confirm.
      panels: [
        {
          panel: "a",
          title: "(a) Hit ratio vs cache size",
          chart: { x: CACHE_SIZE_AXIS, y: { label: "Token hit ratio" }, valueLabel: "Token hit ratio" },
        },
        {
          panel: "b",
          title: "(b) Replication vs cache size",
          chart: { x: CACHE_SIZE_AXIS, y: { label: "Replication ratio" }, valueLabel: "Replication ratio" },
        },
        {
          panel: "c",
          title: "(c) Replication vs instance count",
          chart: { x: INSTANCES_AXIS, y: { label: "Replication ratio" }, valueLabel: "Replication ratio" },
        },
        {
          panel: "d",
          title: "(d) Imbalance vs instance count",
          chart: { x: INSTANCES_AXIS, y: { label: "Load imbalance (%)" }, valueLabel: "Load imbalance (%)" },
        },
      ],
      isWide: true,
    }),
  ]),
});
