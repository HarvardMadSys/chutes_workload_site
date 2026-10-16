/**
 * The Insights' fourth topic, Workload evolution: the paper's monthly model mix, monthly token-length bands and the
 * token lengths of each release cohort of users, as `insights/figure_sections.js` defines a topic. The two share
 * panels show the legend the paper draws once above both. The words are the paper's and the definitions the artifact
 * README's; a line marked "placeholder" is not the paper's own, for the authors to review.
 * A card's kind and chart say how its figure is drawn from its answer, as `insights/figure_card.js` defines them.
 */

import { formatCountTick, formatPercent, formatShare, formatWholeCount } from "../shared/format.js";
import { SERIES_SLOTS } from "../theme/colours.js";
import { frozenCard, TRACE_MONTH_AXIS, TRACE_MONTH_TICKS } from "./figure_card.js";

// The legend of the two monthly share panels: the ten most requested models and Others.
const SHARE_LEGEND = "fig_top10_model_monthly_share_legend";

// The colours of the bands, as the paper's: input tokens in the first series colour, a blue, output in the second, an
// orange.
const INPUT_COLOUR = SERIES_SLOTS[0];
const OUTPUT_COLOUR = SERIES_SLOTS[1];

// The x axis of the release cohorts: a user's cohort is the trace month the user first appeared in.
const COHORT_AXIS = Object.freeze({ ...TRACE_MONTH_AXIS, label: "Release cohort (1 = April 2025)" });

/** The Workload evolution topic. */
export const EVOLUTION_TOPIC = Object.freeze({
  selector: "#insights-evolution",
  takeaway: "Dominant models turn over, global outputs become shorter, and newer users show larger and more variable token lengths.",
  cards: Object.freeze([
    frozenCard({
      figure: "fig_top10_model_monthly_request_share",
      title: "Request share",
      insight: "Dominant models turn over.",
      caption: "Early traffic is dominated by DeepSeek models such as DeepSeek-V3-0324 and DeepSeek-R1. Their shares decline, while newer models such as Qwen3-32B and DeepSeek-V3.2 become more prominent.",
      definition: "Each month's share of requests among the ten most requested models, a model and its TEE variant counted as one, and Others for the rest.",
      kind: "stacked_bars",
      chart: {
        xLabel: TRACE_MONTH_AXIS.label,
        xTicks: TRACE_MONTH_TICKS,
        yLabel: "Share of requests",
        yTickFormat: formatPercent,
        valueLabel: "Share of requests",
        valueFormat: formatShare,
      },
      legend: SHARE_LEGEND,
      // Ten models and Others: more series than the eight slots.
      palette: "families",
    }),
    frozenCard({
      figure: "fig_top10_model_monthly_token_share",
      title: "Token share",
      insight: "Traffic spreads across more models over time.",
      caption: "The Others band grows in both panels: a larger fraction of requests and tokens comes from non-dominant models as more models are released and adopted.",
      definition: "The same models' share of each month's input plus output tokens.",
      kind: "stacked_bars",
      chart: {
        xLabel: TRACE_MONTH_AXIS.label,
        xTicks: TRACE_MONTH_TICKS,
        yLabel: "Share of total tokens",
        yTickFormat: formatPercent,
        valueLabel: "Share of tokens",
        valueFormat: formatShare,
      },
      legend: SHARE_LEGEND,
      // Ten models and Others: more series than the eight slots.
      palette: "families",
    }),
    frozenCard({
      figure: "fig_monthly_input_token_intervals",
      title: "Monthly input intervals",
      insight: "Inputs stay stable while outputs shrink.",
      caption: "Input lengths remain broadly stable over the year, with the monthly median staying in the thousands of tokens.",
      definition: "Input tokens per request in each month: the median, and bands from the 25th to the 75th and from the 10th to the 90th percentile.",
      kind: "bands",
      chart: {
        x: TRACE_MONTH_AXIS,
        y: { label: "Input tokens", log: true, tickFormat: formatCountTick },
        colour: INPUT_COLOUR,
        valueLabel: "Input tokens",
        valueFormat: formatWholeCount,
      },
    }),
    frozenCard({
      figure: "fig_monthly_output_token_intervals",
      title: "Monthly output intervals",
      // placeholder: the paragraph's lead-in is on the input intervals' card; this is its sentence on this panel.
      insight: "Output lengths show a clearer downward trend than input lengths.",
      caption: "The median falls from a few hundred tokens early in the trace to below one hundred near the end, and wider bands show greater variation.",
      definition: "Output tokens per request in each month: the median, and bands from the 25th to the 75th and from the 10th to the 90th percentile.",
      kind: "bands",
      chart: {
        x: TRACE_MONTH_AXIS,
        y: { label: "Output tokens", log: true, tickFormat: formatCountTick },
        colour: OUTPUT_COLOUR,
        valueLabel: "Output tokens",
        valueFormat: formatWholeCount,
      },
    }),
    frozenCard({
      figure: "fig_user_release_cohort_input_band",
      title: "Median input by cohort",
      insight: "Newer user cohorts are more input-heavy.",
      caption: "Later cohorts have larger median input lengths, indicating that newer users typically submit longer prompts.",
      definition: "Each user's median input tokens, by release cohort, the month the user first appeared: the median over the cohort's users, with bands from the 25th to the 75th and the 10th to the 90th percentile.",
      kind: "bands",
      chart: {
        x: COHORT_AXIS,
        // From zero, as the paper's, to its top past the latest cohort's 90th percentile, 57k.
        y: { label: "Median input", domain: [0, 60e3], tickFormat: formatCountTick },
        colour: INPUT_COLOUR,
        valueLabel: "Median input tokens",
        valueFormat: formatWholeCount,
      },
    }),
    frozenCard({
      figure: "fig_user_release_cohort_output_band",
      title: "Median output by cohort",
      // placeholder: the paragraph's lead-in is on the input cohorts' card; this is its sentence on this panel.
      insight: "Change in the median output is less pronounced across cohorts.",
      caption: "The percentile bands widen for later cohorts, showing greater variation across users in their typical output lengths.",
      definition: "Each user's median output tokens, by release cohort: the median over the cohort's users, with bands from the 25th to the 75th and the 10th to the 90th percentile.",
      kind: "bands",
      chart: {
        x: COHORT_AXIS,
        // From zero, as the paper's, to its top past the latest cohort's 90th percentile, 3,040.
        y: { label: "Median output", domain: [0, 3200], tickFormat: formatCountTick },
        colour: OUTPUT_COLOUR,
        valueLabel: "Median output tokens",
        valueFormat: formatWholeCount,
      },
    }),
  ]),
});
