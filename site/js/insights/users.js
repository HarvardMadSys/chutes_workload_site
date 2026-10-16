/**
 * The Insights' third topic, Users and models: the paper's request volume, token shape, access rasters and
 * burstiness of each model and user, as `insights/figure_sections.js` defines a topic. The words are the paper's and
 * the definitions the artifact README's; a line marked "placeholder" is not the paper's own, for the authors to
 * review.
 * A card's kind and chart say how its figure is drawn from its answer, as `insights/figure_card.js` defines them.
 */

import { formatCount, formatCountTick } from "../shared/format.js";
import { URLS } from "../shared/layout.js";

// The artifact's README of these figures, which says how each is computed.
const SECTION_README = `${URLS.code}/blob/main/paper/06_users_models/README.md`;

/** The Users and models topic. */
export const USERS_TOPIC = Object.freeze({
  selector: "#insights-users",
  takeaway: "Users and models exhibit distinct temporal access patterns, and model burstiness is often persistent and correlated.",
  cards: Object.freeze([
    Object.freeze({
      figure: "fig_model_requests_vs_users_density",
      title: "Models: requests and users",
      insight: "Models and users span wide ranges of request volume.",
      caption: "Models with more requests often serve more users, yet models with similar request counts can differ by orders of magnitude in user count.",
      definition: "Each model placed by its request count and its number of distinct users, binned into hexagons shaded by how many models fall in each.",
      source: SECTION_README,
      kind: "cells",
      chart: {
        x: { label: "Requests", log: true, tickFormat: formatCountTick },
        y: { label: "Users", log: true, tickFormat: formatCountTick },
        valueLabel: "Models",
        valueFormat: formatCount,
      },
    }),
    Object.freeze({
      figure: "fig_user_requests_distinct_models_heatmap",
      title: "Users: requests and models",
      // placeholder: the paragraph's lead-in is on the models' card; this is its sentence on this panel.
      insight: "Most users issue relatively few requests and access only a small number of models.",
      caption: "A sparse tail of users sends many requests across a much broader model set. These may be automated applications, proxy services, model routers or agentic workflows.",
      definition: "Each user placed by their request count and the number of distinct models they used, binned into hexagons shaded by how many users fall in each.",
      source: SECTION_README,
      kind: "cells",
      chart: {
        x: { label: "Requests", log: true, tickFormat: formatCountTick },
        y: { label: "Models", log: true, tickFormat: formatCountTick },
        valueLabel: "Users",
        valueFormat: formatCount,
      },
    }),
    Object.freeze({
      figure: "fig_model_median_input_output_heatmap",
      title: "Models: input and output",
      insight: "Token shape varies substantially across models and users.",
      caption: "Most points fall below the dashed line of equal size, so most models are input heavy at the median. Some are strongly input-heavy, others output-heavy.",
      definition: "Each model placed by its median input tokens and median output tokens per request, binned into hexagons shaded by how many models fall in each.",
      source: SECTION_README,
      kind: "cells",
      chart: {
        x: { label: "Median input tokens", log: true, tickFormat: formatCountTick },
        y: { label: "Median output tokens", log: true, tickFormat: formatCountTick },
        valueLabel: "Models",
        valueFormat: formatCount,
      },
    }),
    Object.freeze({
      figure: "fig_user_median_input_output_heatmap",
      title: "Users: input and output",
      // placeholder: the paragraph's lead-in is on the models' card; this is its sentence on this panel.
      insight: "The user view is more concentrated, but still spans a broad range.",
      caption: "Some users consistently send short prompts, while others work with much larger contexts; output lengths also vary substantially.",
      definition: "Each user placed by their median input tokens and median output tokens per request, binned into hexagons shaded by how many users fall in each.",
      source: SECTION_README,
      kind: "cells",
      chart: {
        x: { label: "Median input tokens", log: true, tickFormat: formatCountTick },
        y: { label: "Median output tokens", log: true, tickFormat: formatCountTick },
        valueLabel: "Users",
        valueFormat: formatCount,
      },
    }),
    Object.freeze({
      figure: "fig_model_raster_qwen3_next_80b",
      title: "Periodic user access",
      insight: "Popular models can exhibit very different user-level access patterns.",
      caption: "Many users remain active across long portions of the window, forming horizontal bands that persist over days or weeks, while new users appear gradually throughout the month.",
      definition: "Thirty-one days of Qwen3-Next-80B-A3B-Instruct: one row per user, a mark for each request. At most 800 of the model's users are shown, picked by a seeded shuffle.",
      source: SECTION_README,
      kind: "raster",
      chart: { x: { label: "Hour of the window" }, y: { label: "User" }, scheme: "YlGnBu", valueLabel: "Requests" },
    }),
    Object.freeze({
      figure: "fig_model_raster_gpt_oss_20b",
      title: "Correlated access",
      // placeholder: the paragraph's lead-in is on the periodic access card; this is its sentence on this panel.
      insight: "Requests from different users arrive at similar times, rather than spread independently across the window.",
      caption: "Activity is sparse early in the window, then expands sharply around the middle of the month as many users become active within the same period.",
      definition: "Thirty-one days of gpt-oss-20b: one row per user, a mark for each request. At most 800 of the model's users are shown, picked by a seeded shuffle.",
      source: SECTION_README,
      kind: "raster",
      chart: { x: { label: "Hour of the window" }, y: { label: "User" }, scheme: "YlGnBu", valueLabel: "Requests" },
    }),
    Object.freeze({
      figure: "fig_user_raster_periodic",
      title: "Periodic user usage",
      insight: "Heavy users differ in how broadly they access models.",
      caption: "This user repeatedly accesses a small and stable set of models across the window; some are used throughout, others more periodically.",
      definition: "Thirty-one days of one heavy user, the 190th by requests in the window: one row per model, a mark for each request.",
      source: SECTION_README,
      kind: "raster",
      chart: { x: { label: "Hour of the window" }, y: { label: "Model" }, scheme: "YlGnBu", valueLabel: "Requests" },
    }),
    Object.freeze({
      figure: "fig_user_raster_explore",
      title: "Model exploration",
      // placeholder: the paragraph's lead-in is on the periodic usage card; this is its sentence on this panel.
      insight: "A single user may use multiple models concurrently, either steadily or in short bursts.",
      caption: "This user spends most of the month on a few models, but briefly accesses many additional models during a short period.",
      definition: "Thirty-one days of one heavy user, the 134th by requests in the window: one row per model, a mark for each request.",
      source: SECTION_README,
      kind: "raster",
      chart: { x: { label: "Hour of the window" }, y: { label: "Model" }, scheme: "YlGnBu", valueLabel: "Requests" },
    }),
    Object.freeze({
      figure: "fig_model_heatmap_fixedxy_density",
      title: "Popularity and burstiness",
      insight: "Most models are bursty and persistently so.",
      caption: "Most models lie above a coefficient of variation of 1, so their arrivals are bursty rather than evenly spaced, for low- and high-rate models alike.",
      definition: "Each model placed by its mean requests per active hour and the mean hourly coefficient of variation (standard deviation over mean) of its inter-arrival times, binned into hexagons shaded by how many models fall in each.",
      source: SECTION_README,
      kind: "cells",
      chart: {
        x: { label: "Requests per active hour", log: true, tickFormat: formatCountTick },
        y: { label: "IAT coefficient of variation", log: true, tickFormat: String },
        valueLabel: "Models",
        valueFormat: formatCount,
      },
    }),
    Object.freeze({
      figure: "fig_model_heatmap_fixedxy_scatter_colored_metrics",
      title: "Lag-1 IAT autocorrelation",
      // placeholder: the paragraph's lead-in is on the burstiness card; this is its sentence on this panel.
      insight: "High-load periods tend to follow high-load periods, and low-load periods tend to persist.",
      caption: "Among the bursty models, many show positive autocorrelation: model traffic often stays active or quiet for some time instead of fluctuating randomly.",
      definition: "The same axes, one dot per model, coloured by the Spearman correlation between each of its inter-arrival times and the next.",
      source: SECTION_README,
      kind: "scatter",
      chart: {
        x: { label: "Requests per active hour", log: true, tickFormat: formatCountTick },
        y: { label: "IAT coefficient of variation", log: true, tickFormat: String },
        colourDomain: [-1, 1],
        valueLabel: "Lag-1 autocorrelation",
        valueFormat: formatCount,
      },
    }),
  ]),
});
