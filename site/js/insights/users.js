/**
 * An Insights topic, Users and models: the paper's request volume, token shape, access rasters and burstiness of
 * each model and user.
 * Its cards are `FigureCard`s (`insights/figure_card.js`).
 */

import { formatCount, formatWholeCountTick } from "../shared/format.js";
import { COUNT_COLOUR } from "./card_series.js";
import { frozenTopic } from "./figure_card.js";

// The token-shape figures' axes, as the paper's: the users' medians up to 10⁶ input and 10⁵ output tokens, the
// models' up to 10⁵ on both axes, so that the line of equal input and output is the diagonal.
const USER_INPUT_DOMAIN = Object.freeze([1, 1e6]);
const USER_OUTPUT_DOMAIN = Object.freeze([1, 1e5]);
const MODEL_TOKENS_DOMAIN = Object.freeze([1, 1e5]);

// The users' input axis ticked at every decade, as its output axis is: its seven decades are more than
// `MAX_LOG_TICKS`, past which the axis would label every second.
const USER_INPUT_TICKS = Object.freeze([1, 10, 100, 1e3, 1e4, 1e5, 1e6]);

// The burstiness figures' two axes, the same on both cards, over every model's point; requests per hour labelled at
// every decade from 10, the floor of an active hour, so a reader can place 1k and 100k.
const REQUESTS_PER_HOUR_AXIS = Object.freeze({
  label: "Requests/hour", log: true, domain: [10, 2e5], ticks: [10, 100, 1e3, 1e4, 1e5],
  tickFormat: formatWholeCountTick,
});
const IAT_CV_AXIS = Object.freeze({ label: "Mean CV(IAT)", log: true, domain: [0.02, 30], tickFormat: formatCount });

// The coefficient of variation the burstiness cards mark with a dashed rule: above 1, arrivals are burstier than a
// Poisson process's, the line the caption counts models against.
const BURSTY_CV = 1;

// The charts' heights in pixels, the two cards of a grid row sharing one so the row stays level. The paper draws these
// figures near-square: two log axes of similar span read their trend at 340 px, where 240 squashes y to half x's
// pixels per decade.
const DENSITY_HEIGHT = 340;
// The token-shape pair at 400, so the dashed line of equal input and output runs nearer 45° than 240's 21°.
const TOKEN_SHAPE_HEIGHT = 400;
// The two rasters of a model's users at 400, so their 230 and 540 rows share fewer pixels than at 240.
const USER_ROWS_HEIGHT = 400;

// The hours of a raster's 31-day window ticked, every sixth day from its first, as the paper's.
const HOURS_PER_DAY = 24;
const RASTER_DAY_TICKS = Object.freeze([0, 6, 12, 18, 24, 30].map((day) => day * HOURS_PER_DAY));

// A raster's x axis: the hours of its window, written as days.
const RASTER_DAYS_AXIS = Object.freeze({
  label: "Day of the window", ticks: RASTER_DAY_TICKS, tickFormat: formatDayTick,
});

/** An hour of a raster's window, from its first request, as its axis writes it, the day it falls in: 144 → "6". */
function formatDayTick(hour) {
  return String(hour / HOURS_PER_DAY);
}

/** The Users and models topic. */
export const USERS_TOPIC = frozenTopic({
  id: "insights-users",
  // placeholder: the title is the site's name for the topic, for the authors.
  title: "Users and models",
  // placeholder: the takeaway is the paper's finding for the section in plain words, for the authors.
  takeaway: "Users and models each have their own rhythm of access and bursts, and busy or quiet spells tend to last, which serving decisions can use.",
  groups: [
    {
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Same volume, different breadth",
      takeaway: "Models and users with similar request counts differ by orders of magnitude in how many users or models they touch, and in their token shape.",
      cards: [
        {
          figure: "fig_model_requests_vs_users_density",
          title: "Models: requests and users",
          insight: "Models and users span wide ranges of request volume.",
          caption: "Models with more requests often serve more users, yet models with similar request counts can differ by orders of magnitude in user count.",
          // placeholder: "cells of a log grid", not "hexagons": the cells drawn are squares.
          definition: "Each model placed by its request count and its number of distinct users, binned into cells of a log grid shaded by how many models fall in each.",
          kind: "cells",
          chart: {
            x: { label: "Requests per model", log: true, tickFormat: formatWholeCountTick },
            y: { label: "Distinct users", log: true, tickFormat: formatWholeCountTick },
            height: DENSITY_HEIGHT,
            ...COUNT_COLOUR,
            valueLabel: "Models",
            valueFormat: formatCount,
          },
        },
        {
          figure: "fig_user_requests_distinct_models_heatmap",
          title: "Users: requests and models",
          // placeholder: the paragraph's lead-in is on the models' card; this is its sentence on this panel.
          insight: "Most users issue relatively few requests and access only a small number of models.",
          caption: "A sparse tail of users sends many requests across a much broader model set. These may be automated applications, proxy services, model routers or agentic workflows.",
          // placeholder: "cells of a log grid", not "hexagons": the cells drawn are squares.
          definition: "Each user placed by their request count and the number of distinct models they used, binned into cells of a log grid shaded by how many users fall in each.",
          kind: "cells",
          chart: {
            x: { label: "Requests per user", log: true, tickFormat: formatWholeCountTick },
            y: { label: "Distinct models", log: true, tickFormat: formatWholeCountTick },
            height: DENSITY_HEIGHT,
            ...COUNT_COLOUR,
            valueLabel: "Users",
            valueFormat: formatCount,
          },
        },
        {
          figure: "fig_model_median_input_output_heatmap",
          title: "Models: input and output",
          insight: "Token shape varies substantially across models and users.",
          caption: "Most points fall below the dashed line of equal size, so most models are input heavy at the median. Some are strongly input-heavy, others output-heavy.",
          // placeholder: "cells of a log grid", not "hexagons": the cells drawn are squares.
          definition: "Each model placed by its median input tokens and median output tokens per request, binned into cells of a log grid shaded by how many models fall in each.",
          kind: "cells",
          chart: {
            x: { label: "Median input tokens", log: true, domain: MODEL_TOKENS_DOMAIN, tickFormat: formatWholeCountTick },
            y: { label: "Median output tokens", log: true, domain: MODEL_TOKENS_DOMAIN, tickFormat: formatWholeCountTick },
            diagonal: true,
            height: TOKEN_SHAPE_HEIGHT,
            ...COUNT_COLOUR,
            valueLabel: "Models",
            valueFormat: formatCount,
          },
        },
        {
          figure: "fig_user_median_input_output_heatmap",
          title: "Users: input and output",
          // placeholder: the paragraph's lead-in is on the models' card; this is its sentence on this panel.
          insight: "The user view is more concentrated, but still spans a broad range.",
          caption: "Some users consistently send short prompts, while others work with much larger contexts; output lengths also vary substantially.",
          // placeholder: "cells of a log grid", not "hexagons": the cells drawn are squares.
          definition: "Each user placed by their median input tokens and median output tokens per request, binned into cells of a log grid shaded by how many users fall in each.",
          kind: "cells",
          chart: {
            x: {
              label: "Median input tokens", log: true, domain: USER_INPUT_DOMAIN, ticks: USER_INPUT_TICKS,
              tickFormat: formatWholeCountTick,
            },
            y: { label: "Median output tokens", log: true, domain: USER_OUTPUT_DOMAIN, tickFormat: formatWholeCountTick },
            diagonal: true,
            height: TOKEN_SHAPE_HEIGHT,
            ...COUNT_COLOUR,
            valueLabel: "Users",
            valueFormat: formatCount,
          },
        },
      ],
    },
    {
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Access patterns",
      takeaway: "Some users stick to a few models or return on a schedule, others spread out or burst, and two popular models show one steady and one synchronised user pattern.",
      cards: [
        {
          figure: "fig_model_raster_qwen3_next_80b",
          title: "Periodic user access",
          insight: "Popular models can exhibit very different user-level access patterns.",
          caption: "Many users remain active across long portions of the window, forming horizontal bands that persist over days or weeks, while new users appear gradually throughout the month.",
          // placeholder: the definition leaves out the README's sample of the model's users.
          definition: "Thirty-one days of Qwen3-Next-80B-A3B-Instruct: one row per user, a mark for each request.",
          kind: "raster",
          chart: {
            x: RASTER_DAYS_AXIS,
            y: { label: "User (by first request)" },
            height: USER_ROWS_HEIGHT,
            ...COUNT_COLOUR,
            valueLabel: "Requests per hour",
          },
        },
        {
          figure: "fig_model_raster_gpt_oss_20b",
          title: "Correlated access",
          // placeholder: the paragraph's lead-in is on the periodic access card; this is its sentence on this panel.
          insight: "Requests from different users arrive at similar times, rather than spread independently across the window.",
          caption: "Activity is sparse early in the window, then expands sharply around the middle of the month as many users become active within the same period.",
          // placeholder: the definition leaves out the README's sample of the model's users.
          definition: "Thirty-one days of gpt-oss-20b: one row per user, a mark for each request.",
          kind: "raster",
          chart: {
            x: RASTER_DAYS_AXIS,
            y: { label: "User (by first request)" },
            height: USER_ROWS_HEIGHT,
            ...COUNT_COLOUR,
            valueLabel: "Requests per hour",
          },
        },
        {
          figure: "fig_user_raster_periodic",
          title: "Periodic user usage",
          insight: "Heavy users differ in how broadly they access models.",
          caption: "This user repeatedly accesses a small and stable set of models across the window; some are used throughout, others more periodically.",
          definition: "Thirty-one days of one heavy user, the 190th by requests in the window: one row per model, a mark for each request.",
          kind: "raster",
          chart: {
            x: RASTER_DAYS_AXIS,
            y: { label: "Model (by first request)" },
            ...COUNT_COLOUR,
            valueLabel: "Requests per hour",
          },
        },
        {
          figure: "fig_user_raster_explore",
          title: "Model exploration",
          // placeholder: the paragraph's lead-in is on the periodic usage card; this is its sentence on this panel.
          insight: "A single user may use multiple models concurrently, either steadily or in short bursts.",
          caption: "This user spends most of the month on a few models, but briefly accesses many additional models during a short period.",
          definition: "Thirty-one days of one heavy user, the 134th by requests in the window: one row per model, a mark for each request.",
          kind: "raster",
          chart: {
            x: RASTER_DAYS_AXIS,
            y: { label: "Model (by first request)" },
            ...COUNT_COLOUR,
            valueLabel: "Requests per hour",
          },
        },
      ],
    },
    {
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Burstiness is persistent",
      takeaway: "Requests to most models come in bursts, and busy or quiet spells tend to last, so colocation and autoscaling can plan on it.",
      cards: [
        {
          figure: "fig_model_heatmap_fixedxy_density",
          title: "Popularity and burstiness",
          insight: "Most models are bursty and persistently so.",
          caption: "Most models lie above a coefficient of variation of 1, so their arrivals are bursty rather than evenly spaced, for low- and high-rate models alike.",
          // placeholder: "cells of a log grid", not "hexagons": the cells drawn are squares.
          definition: "Each model placed by its mean requests per active hour and the mean hourly coefficient of variation (standard deviation over mean) of its inter-arrival times, binned into cells of a log grid shaded by how many models fall in each.",
          kind: "cells",
          chart: {
            x: REQUESTS_PER_HOUR_AXIS,
            y: IAT_CV_AXIS,
            yReference: BURSTY_CV,
            height: DENSITY_HEIGHT,
            ...COUNT_COLOUR,
            valueLabel: "Models",
            valueFormat: formatCount,
          },
        },
        {
          figure: "fig_model_heatmap_fixedxy_scatter_colored_metrics",
          title: "Lag-1 IAT autocorrelation",
          // placeholder: the paragraph's lead-in is on the burstiness card; this is its sentence on this panel.
          insight: "High-load periods tend to follow high-load periods, and low-load periods tend to persist.",
          caption: "Among the bursty models, many show positive autocorrelation: model traffic often stays active or quiet for some time instead of fluctuating randomly.",
          definition: "The same axes, one dot per model, coloured by the Spearman correlation between each of its inter-arrival times and the next.",
          kind: "scatter",
          chart: {
            x: REQUESTS_PER_HOUR_AXIS,
            y: IAT_CV_AXIS,
            yReference: BURSTY_CV,
            height: DENSITY_HEIGHT,
            // The paper's coolwarm: blue for -1, red for 1.
            scheme: "BuRd",
            colourDomain: [-1, 1],
            valueLabel: "Lag-1 autocorrelation",
            valueFormat: formatCount,
          },
        },
      ],
    },
  ],
});
