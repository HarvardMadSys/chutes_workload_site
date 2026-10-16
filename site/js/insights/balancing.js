/**
 * The Insights' sixth topic, Load balancing: the paper's two months of one popular model's load across its instances,
 * latency against instance load, one user's requests across instances, and the routing simulation's trade-off, as
 * `explore/figure_sections.js` defines a topic.
 */

import { URLS } from "../shared/layout.js";

// The artifact's README of the trace's load-balancing figures, which says how each is computed.
const SECTION_README = `${URLS.code}/blob/main/paper/05_load_balancing/README.md`;

// The artifact's folder of the routing simulation, which draws its figure; it has no README of its own.
const SIMULATION_FOLDER = `${URLS.code}/tree/main/pipeline/routing`;

/** The Load balancing topic. */
export const BALANCING_TOPIC = Object.freeze({
  selector: "#insights-balancing",
  takeaway: "",
  cards: Object.freeze([
    Object.freeze({
      image: "fig_lb_request_rate",
      title: "Requests per hour",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_active_instances",
      title: "Active instances per hour",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_maxmean_tokens",
      title: "Token max/mean ratio",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_concurrency",
      title: "Per-instance occupancy",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_ttft_p90_vs_load",
      title: "Load and TTFT",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_decode_p90_vs_load",
      title: "Load and decode time",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_user_zoom_top",
      title: "High load",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_lb_user_zoom_min",
      title: "Low load",
      insight: "",
      caption: "",
      definition: "",
      source: SECTION_README,
    }),
    Object.freeze({
      image: "fig_routing_tradeoff",
      title: "Load balance simulation",
      insight: "",
      caption: "",
      definition: "",
      source: SIMULATION_FOLDER,
      isWide: true,
    }),
  ]),
});
