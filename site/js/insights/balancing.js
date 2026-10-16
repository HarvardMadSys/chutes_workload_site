/**
 * The Insights' sixth topic, Load balancing: the paper's two months of one popular model's load across its instances,
 * latency against instance load, one user's requests across instances, and the routing simulation's trade-off, as
 * `explore/figure_sections.js` defines a topic. The words are the paper's and the definitions the artifact's README
 * or, for the simulation, its plotting script's; a line marked "placeholder" is not the paper's own, for the authors
 * to review.
 * A card's cache is where the artifact keeps the results its figure is drawn from, as the artifact's READMEs say.
 */

import { URLS } from "../shared/layout.js";

// The artifact's README of the trace's load-balancing figures, which says how each is computed.
const SECTION_README = `${URLS.code}/blob/main/paper/05_load_balancing/README.md`;

// The artifact's folder of the routing simulation, which draws its figure; it has no README of its own.
const SIMULATION_FOLDER = `${URLS.code}/tree/main/pipeline/routing`;

/** The Load balancing topic. */
export const BALANCING_TOPIC = Object.freeze({
  selector: "#insights-balancing",
  takeaway: "LLM serving faces a fundamental tension between cache locality and load balance: stickiness preserves locality but conflicts with balancing.",
  cards: Object.freeze([
    Object.freeze({
      image: "fig_lb_request_rate",
      title: "Requests per hour",
      // placeholder: the overview paragraph has no lead-in; this is the figure caption's line on this panel.
      insight: "Request rate stays roughly stationary.",
      caption: "Request rate remains bursty but roughly stationary throughout the trace's last two months.",
      definition: "Requests per hour to DeepSeek-V3-0324 over trace days 306 to 364, the trace's last two months.",
      cache: "instance_minute_stats_deepseek_v3_0324.parquet (40 MB), not shipped: built from the trace into output/paper/cache/ on the first run",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_active_instances",
      title: "Active instances per hour",
      // placeholder: the overview paragraph has no lead-in; this is its sentence on this panel.
      insight: "Replica count tracks serving utilization rather than request volume alone.",
      caption: "The number of active instances declines, closely following the reduction in total tokens processed per hour: scaling responds to token work, not just request arrivals.",
      definition: "Active instances of DeepSeek-V3-0324 in each minute, the median of each hour, over the trace's last two months.",
      cache: "instance_minute_stats_deepseek_v3_0324.parquet (40 MB), not shipped: built from the trace into output/paper/cache/ on the first run",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_maxmean_tokens",
      title: "Token max/mean ratio",
      // placeholder: the overview paragraph has no lead-in; this is its sentence on this panel.
      insight: "Load is not always evenly distributed across active instances.",
      caption: "The per-hour max/mean token-load ratio drifts upward as the model scales down, so the imbalance worsens as the serving pool shrinks.",
      definition: "Each minute's highest token load on one instance of DeepSeek-V3-0324 divided by the mean across its instances, averaged over each hour.",
      cache: "instance_minute_stats_deepseek_v3_0324.parquet (40 MB), not shipped: built from the trace into output/paper/cache/ on the first run",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_concurrency",
      title: "Per-instance occupancy",
      // placeholder: the overview paragraph has no lead-in; this is its sentence on this panel.
      insight: "Load is balanced in aggregate, but not perfectly balanced at every instant.",
      caption: "On the busiest day most active instances remain busy with similar per-minute request rates, while a small number become quiet around mid-day.",
      definition: "Requests per instance of DeepSeek-V3-0324 and minute, over the 24 hours with the most active instances.",
      cache: "instance_minute_stats_deepseek_v3_0324.parquet (40 MB), not shipped: built from the trace into output/paper/cache/ on the first run",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_ttft_p90_vs_load",
      title: "Load and TTFT",
      // placeholder: the overview paragraph has no lead-in; this is its sentence on this panel.
      insight: "P90 TTFT rises sharply once an instance exceeds a high tokens-per-second threshold.",
      caption: "The rise is sharpest for long-input requests: TTFT climbs once long-token requests land on heavily loaded instances.",
      definition: "Requests of DeepSeek-V3.2 binned into hexagons by their instance's load in tokens per second and their input tokens, each hexagon coloured by the 90th percentile of time to first token.",
      cache: "request_latency_vs_load_deepseek_v32.parquet (455 MB), not shipped: built from the trace into output/paper/cache/ on the first run",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_decode_p90_vs_load",
      title: "Load and decode time",
      // placeholder: the overview paragraph has no lead-in; this is its sentence on this panel.
      insight: "P90 decode time mainly follows output length and is largely insensitive to instance throughput.",
      caption: "Overload primarily affects prefill, making input-heavy traffic the most vulnerable to load imbalance.",
      definition: "Requests of DeepSeek-V3.2 binned into hexagons by their instance's load in tokens per second and their output tokens, each hexagon coloured by the 90th percentile of decode time.",
      cache: "request_latency_vs_load_deepseek_v32.parquet (455 MB), not shipped: built from the trace into output/paper/cache/ on the first run",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_user_zoom_top",
      title: "High load",
      // placeholder: the paragraph has no lead-in; this is its sentence on this panel.
      insight: "Under high load, the load balancer spreads a user across many instances to avoid overloading any one.",
      caption: "The user's traffic resembles the global load distribution, but several instances still show measurable hit ratios: routing duplicates KV state across instances.",
      definition: "The busiest hour of the busiest DeepSeek-V3.2 user whose token hit ratio that hour is at least 0.4: per instance, the user's share of requests and its token hit ratio.",
      cache: "user_busiest_hour_deepseek_v32.parquet and instance_minute_stats_deepseek_v32.parquet, not shipped: built from the trace into output/paper/cache/ on the first run",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_user_zoom_min",
      title: "Low load",
      // placeholder: the paragraph has no lead-in; this is its sentence on this panel.
      insight: "Under low load, the user stays mostly on one instance, and cache hits concentrate there.",
      caption: "Keeping a user's requests on one instance preserves its prefix state and maximizes reuse.",
      definition: "The same for the least busy such user, still with at least 200 requests in that hour.",
      cache: "user_busiest_hour_deepseek_v32.parquet and instance_minute_stats_deepseek_v32.parquet, not shipped: built from the trace into output/paper/cache/ on the first run",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_routing_tradeoff",
      title: "Load balance simulation",
      insight: "Cache-aware routing unlocks fleet-wide KV capacity.",
      caption: "Cache-aware routing turns larger KV caches into higher hit ratios and less replication, while cache-blind policies remain highly replicated. Cache-first routing pays a modest load imbalance.",
      definition: "A simulated fleet of LRU caches replaying DeepSeek V3.2 (top) and MiniMax-M2.5 (bottom) under four routing policies: hit ratio (a) and replication (b) against cache size on 20 instances; replication (c) and load imbalance (d) against the number of instances.",
      cache: "data/routing/figure20_sweep.csv, the routing sweep's results, committed in the artifact",
      source: SIMULATION_FOLDER,
      isWide: true,
    }),
  ]),
});
