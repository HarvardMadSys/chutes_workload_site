/**
 * The Insights' sixth topic, Load balancing: the paper's two months of one popular model's load across its instances,
 * latency against instance load, one user's requests across instances, and the routing simulation's trade-off, as
 * `page/topics.js` defines a topic. The words are the paper's and the definitions the artifact's README
 * or, for the simulation, its plotting script's; a line marked "placeholder" is not the paper's own, for the authors
 * to review. The routing simulation's series and panels are made by `insights/routing_panels.js`.
 * A card's kind and chart say how its figure is drawn from its answer, as `insights/figure_card.js` defines them.
 */

import {
  formatCompactCount, formatCount, formatCountTick, formatHours, formatHoursTick, formatPercentage, formatSecondsTick,
  formatWholeCountTick,
} from "../shared/format.js";
import { frozenCard, TRACE_DAY_AXIS } from "./figure_card.js";
import { routingFigurePanels, routingFigureSeries } from "./routing_panels.js";

// The largest step, in days, the three hourly lines are drawn across: an hour and a half, so a line breaks where an
// hour is missing from its answer, as the paper's does, and joins every two hours that follow each other.
const HOURLY_GAP = 1.5 / 24;

// The occupancy's x axis: the minutes of its 24-hour window, which starts at 17:00 UTC on day 317 of the trace,
// labelled every sixth hour as the paper's, written as hours elapsed, "6 h", so that no tick reads as a clock time; a
// cell's minute in its tooltip is in hours too, to a tenth, "13.9 h".
const WINDOW_AXIS = Object.freeze({
  label: "Hours into the window", ticks: [0, 360, 720, 1080, 1440], tickFormat: formatHoursTick,
  tipFormat: formatHours,
});

// The instance load's axis of the two P90 grids, labelled every second power of ten as the paper's.
const INSTANCE_LOAD_AXIS = Object.freeze({
  label: "Instance load (tokens/s)", log: true, ticks: [10, 1e3, 1e5], tickFormat: formatWholeCountTick,
});

// The two panels of a user zoom over `instances` instances whose request shares reach up to `requestShareTop` percent:
// per instance, the user's share of the hour's requests, on the paper's 0 to `requestShareTop`, with a dashed rule at
// an even split, 100 / `instances` percent, to read the bars against, and its token hit ratio, on 0 to 100.
// placeholder: the panel titles are the paper's axis titles, for the authors to confirm.
function userZoomPanels(requestShareTop, instances) {
  const evenSplit = { value: 100 / instances, label: "even split" };
  return [
    {
      panel: "request_share",
      title: "User request (%)",
      chart: { y: { domain: [0, requestShareTop] }, reference: evenSplit, valueLabel: "User request" },
    },
    { panel: "token_hit", title: "Token hit (%)", chart: { y: { domain: [0, 100] }, valueLabel: "Token hit" } },
  ];
}

// The request share's top on each zoom, as the paper sets it: 1.25 times the largest share, and at least 8.
const HIGH_LOAD_SHARE_TOP = 11.5; // 1.25 × 9.2%
const LOW_LOAD_SHARE_TOP = 34.5; // 1.25 × 27.6%

// The instances each zoom's user sent requests to in its hour, a bar each in its answer: an even split of the user's
// requests gives each 100 / instances percent, the level the request-share panel marks.
const HIGH_LOAD_INSTANCES = 12;
const LOW_LOAD_INSTANCES = 11;

/** The Load balancing topic. */
export const BALANCING_TOPIC = Object.freeze({
  selector: "#insights-balancing",
  // placeholder: the takeaway is the paper's finding for the section in plain words, for the authors.
  takeaway: "Routing for cache locality fights load balancing: spreading a user over instances duplicates cache state, keeping them together costs a little imbalance.",
  groups: Object.freeze([
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Balanced on average, not every hour",
      takeaway: "The fleet shrinks with token load, imbalance grows as it does, and the busiest instances pay in time to first token.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_lb_request_rate",
          title: "Requests per hour",
          // placeholder: the overview paragraph has no lead-in; this is the figure caption's line on this panel.
          insight: "Request rate stays roughly stationary.",
          caption: "Request rate remains bursty but roughly stationary throughout the trace's last two months.",
          definition: "Requests per hour to DeepSeek-V3-0324 over trace days 306 to 364, the trace's last two months.",
          kind: "lines",
          chart: {
            x: TRACE_DAY_AXIS,
            gap: HOURLY_GAP,
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
          kind: "lines",
          chart: {
            x: TRACE_DAY_AXIS,
            gap: HOURLY_GAP,
            // From zero, so the last days' single instance does not lie on the axis, to past the most, 17; labelled
            // every five, the zero among them.
            y: { label: "Active instances", domain: [0, 18], ticks: [0, 5, 10, 15] },
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
          kind: "lines",
          chart: {
            x: TRACE_DAY_AXIS,
            gap: HOURLY_GAP,
            // From 1, where every instance carries the mean load, to past the highest hour's 2.07.
            y: { label: "Max/mean token load", domain: [1, 2.1] },
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
          // placeholder: the window's start, which the axis no longer shows, for the authors to confirm.
          definition: "Requests per instance of DeepSeek-V3-0324 and minute, over the 24 hours with the most active instances, from 17:00 UTC on day 317 of the trace.",
          kind: "cells",
          chart: {
            x: WINDOW_AXIS,
            y: { label: "Instance index" },
            // The paper's: viridis on a log scale, clipped to the 5th and 99th percentiles of the minutes' requests.
            scheme: "viridis",
            colourLog: true,
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
          // placeholder: "cells of a log grid", not "hexagons": the cells drawn are squares.
          definition: "Requests of DeepSeek-V3.2 binned into cells of a log grid by their instance's load in tokens per second and their input tokens, each cell coloured by the 90th percentile of time to first token.",
          kind: "cells",
          chart: {
            x: INSTANCE_LOAD_AXIS,
            y: { label: "Input tokens", log: true, tickFormat: formatWholeCountTick },
            // The latency grids' scheme, its darkest values keeping their ink on either card; clipped as the paper's,
            // to the 5th and 95th percentiles of every request's TTFT.
            scheme: "YlOrRd",
            // From a tenth along the scheme, so the lightest cells keep a tint on the card.
            schemeStart: 0.1,
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
          // placeholder: "cells of a log grid", not "hexagons": the cells drawn are squares.
          definition: "Requests of DeepSeek-V3.2 binned into cells of a log grid by their instance's load in tokens per second and their output tokens, each cell coloured by the 90th percentile of decode time.",
          kind: "cells",
          chart: {
            x: INSTANCE_LOAD_AXIS,
            y: { label: "Output tokens", log: true, tickFormat: formatWholeCountTick },
            // As the TTFT grid's, clipped to the 5th and 95th percentiles of every request's decode time.
            scheme: "YlOrRd",
            // As the TTFT grid's, so the cells of the shortest outputs, near 0 s, stay visible.
            schemeStart: 0.1,
            colourDomain: [0, 153],
            valueLabel: "P90 decode time",
            valueFormat: formatSecondsTick,
          },
        }),
      ]),
    }),
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Locality against balance",
      takeaway: "Under high load the router spreads a user over many instances and duplicates their cache; under low load it keeps most of their requests on one.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_lb_user_zoom_top",
          title: "High load",
          // placeholder: the paragraph has no lead-in; this is its sentence on this panel.
          insight: "Under high load, the load balancer spreads a user across many instances to avoid overloading any one.",
          caption: "The user's traffic resembles the global load distribution, but several instances still show measurable hit ratios: routing duplicates KV state across instances.",
          // placeholder: the definition says "a high token hit ratio" for the README's cut-off.
          definition: "The busiest hour of the busiest DeepSeek-V3.2 user with a high token hit ratio that hour: per instance, the user's share of requests and its token hit ratio.",
          kind: "bars",
          chart: { x: { label: "Instance index" }, valueFormat: formatPercentage },
          panels: userZoomPanels(HIGH_LOAD_SHARE_TOP, HIGH_LOAD_INSTANCES),
        }),
        frozenCard({
          figure: "fig_lb_user_zoom_min",
          title: "Low load",
          // placeholder: the paragraph has no lead-in; this is its sentence on this panel.
          insight: "Under low load, the user stays mostly on one instance, and cache hits concentrate there.",
          caption: "Keeping a user's requests on one instance preserves its prefix state and maximizes reuse.",
          // placeholder: the definition leaves out the README's least request count in that hour.
          definition: "The same for the least busy such user.",
          kind: "bars",
          chart: { x: { label: "Instance index" }, valueFormat: formatPercentage },
          panels: userZoomPanels(LOW_LOAD_SHARE_TOP, LOW_LOAD_INSTANCES),
        }),
      ]),
    }),
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Cache-aware routing",
      takeaway: "Larger caches raise hit ratios only when routing keeps a session together; the price is a few percent of imbalance.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_routing_tradeoff",
          title: "Load balance simulation",
          insight: "Cache-aware routing unlocks fleet-wide KV capacity.",
          caption: "Cache-aware routing turns larger KV caches into higher hit ratios and less replication, while cache-blind policies remain highly replicated. Cache-first routing pays a modest load imbalance.",
          definition: "A simulated fleet of LRU caches replaying DeepSeek V3.2 (top) and MiniMax-M2.5 (bottom) under four routing policies: hit ratio (a) and replication (b) against cache size on 20 instances; replication (c) and load imbalance (d) against the number of instances.",
          kind: "lines",
          series: routingFigureSeries(),
          palette: "policies",
          chart: { markers: true, valueFormat: formatCount },
          panels: routingFigurePanels(),
          isWide: true,
        }),
      ]),
    }),
  ]),
});
