/**
 * The Insights' fourth topic, A year of change: the paper's monthly model mix, monthly token-length bands and the
 * token lengths of each release cohort of users, as `page/topics.js` defines a topic. The two share
 * cards show the legend the paper draws once above both. The words are the paper's and the definitions the artifact
 * README's; a line marked "placeholder" is not the paper's own, for the authors to review.
 * A card's kind and chart say how its figure is drawn from its answer, as `insights/figure_card.js` defines them.
 */

import { formatCountTick, formatPercent, formatShare, formatWholeCount } from "../shared/format.js";
import { SERIES_SLOTS } from "../theme/colours.js";
import { frozenCard, TRACE_MONTH_AXIS, TRACE_MONTH_TICKS } from "./figure_card.js";

// The legend of the two monthly share cards: the ten most requested models and Others.
const SHARE_LEGEND = "fig_top10_model_monthly_share_legend";

// The colours of the bands, as the paper's: input tokens in the first series colour, a blue, output in the second, an
// orange.
const INPUT_COLOUR = SERIES_SLOTS[0];
const OUTPUT_COLOUR = SERIES_SLOTS[1];

// The x axis of the release cohorts: a user's cohort is the trace month the user first appeared in.
const COHORT_AXIS = Object.freeze({ ...TRACE_MONTH_AXIS, label: "Release cohort (month first seen)" });

/** The topic "A year of change". */
export const EVOLUTION_TOPIC = Object.freeze({
  selector: "#insights-evolution",
  // placeholder: the takeaway is the paper's finding for the section in plain words, for the authors.
  takeaway: "Over the year the leading models change, outputs get shorter and newer users send longer inputs.",
  groups: Object.freeze([
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Dominant models turn over",
      takeaway: "DeepSeek V3-0324 and R1 lead early, Qwen3-32B and DeepSeek V3.2 later, and the long tail of other models grows.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_top10_model_monthly_request_share",
          title: "Request share",
          insight: "Dominant models turn over.",
          caption: "Early traffic is dominated by DeepSeek models such as DeepSeek-V3-0324 and DeepSeek-R1. Their shares decline, while newer models such as Qwen3-32B and DeepSeek-V3.2 become more prominent.",
          // placeholder: the last sentence explains the star of the partial last month.
          definition: "Each month's share of requests among the ten most requested models, a model and its TEE variant counted as one, and Others for the rest. Apr '26* holds only the trace's last two days.",
          kind: "stacked_bars",
          chart: {
            xLabel: TRACE_MONTH_AXIS.label,
            xTicks: TRACE_MONTH_TICKS,
            xTickFormat: TRACE_MONTH_AXIS.tickFormat,
            xInset: TRACE_MONTH_AXIS.inset,
            yLabel: "Share of requests",
            yTickFormat: formatPercent,
            valueLabel: "Share of requests",
            valueFormat: formatShare,
            // No gap between a bar's segments: a model's share under about 1% would vanish into it.
            segmentInset: 0,
          },
          legend: SHARE_LEGEND,
          // Ten models and Others: more series than the eight slots.
          palette: "families",
        }),
        frozenCard({
          figure: "fig_top10_model_monthly_token_share",
          title: "Token share",
          insight: "Traffic spreads across more models over time.",
          // placeholder: "in both charts", not the paper's "panels": the site draws the two shares as two cards.
          caption: "The Others band grows in both charts: a larger fraction of requests and tokens comes from non-dominant models as more models are released and adopted.",
          // placeholder: the last sentence explains the star of the partial last month.
          definition: "The same models' share of each month's input plus output tokens. Apr '26* holds only the trace's last two days.",
          kind: "stacked_bars",
          chart: {
            xLabel: TRACE_MONTH_AXIS.label,
            xTicks: TRACE_MONTH_TICKS,
            xTickFormat: TRACE_MONTH_AXIS.tickFormat,
            xInset: TRACE_MONTH_AXIS.inset,
            yLabel: "Share of total tokens",
            yTickFormat: formatPercent,
            valueLabel: "Share of tokens",
            valueFormat: formatShare,
            // No gap between a bar's segments, as the request share's beside it.
            segmentInset: 0,
          },
          legend: SHARE_LEGEND,
          // Ten models and Others: more series than the eight slots.
          palette: "families",
        }),
      ]),
    }),
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Inputs stay, outputs shrink",
      takeaway: "Monthly input lengths hold in the thousands of tokens while the median output falls below a hundred.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_monthly_input_token_intervals",
          title: "Monthly input intervals",
          insight: "Inputs stay stable while outputs shrink.",
          caption: "Input lengths remain broadly stable over the year, with the monthly median staying in the thousands of tokens.",
          // placeholder: the last sentence explains the star of the partial last month.
          definition: "Input tokens per request in each month: the median, and bands from the 25th to the 75th and from the 10th to the 90th percentile. Apr '26* holds only the trace's last two days.",
          kind: "bands",
          chart: {
            x: TRACE_MONTH_AXIS,
            // The paper's: from 10, under the first month's 10th percentile, 13, to 30k, over the highest 90th, 26k;
            // ticked at every decade from 10 to 10k.
            y: { label: "Input tokens", log: true, domain: [10, 30e3], tickFormat: formatCountTick },
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
          // placeholder: the last sentence explains the star of the partial last month.
          definition: "Output tokens per request in each month: the median, and bands from the 25th to the 75th and from the 10th to the 90th percentile. Apr '26* holds only the trace's last two days.",
          kind: "bands",
          chart: {
            x: TRACE_MONTH_AXIS,
            // From 7, so the 10th percentiles of 10 tokens clear the frame's foot, to 1,500, over the highest 90th,
            // 1.2k.
            y: { label: "Output tokens", log: true, domain: [7, 1500], tickFormat: formatCountTick },
            colour: OUTPUT_COLOUR,
            valueLabel: "Output tokens",
            valueFormat: formatWholeCount,
          },
        }),
      ]),
    }),
    Object.freeze({
      // placeholder: the group's heading and takeaway are the site's plain words for the paper's, for the authors.
      heading: "Newer users send more input",
      takeaway: "Users who arrived later in the year have longer inputs and more varied token profiles.",
      cards: Object.freeze([
        frozenCard({
          figure: "fig_user_release_cohort_input_band",
          title: "Median input by cohort",
          insight: "Newer user cohorts are more input-heavy.",
          caption: "Later cohorts have larger median input lengths, indicating that newer users typically submit longer prompts.",
          // placeholder: the last sentence explains the star of the partial last cohort.
          definition: "Each user's median input tokens, by release cohort, the month the user first appeared: the median over the cohort's users, with bands from the 25th to the 75th and the 10th to the 90th percentile. Cohort Apr '26* is the users first seen in the trace's last two days.",
          kind: "bands",
          chart: {
            x: COHORT_AXIS,
            // From zero, as the paper's, to its top past the latest cohort's 90th percentile, 57k.
            y: { label: "Per-user median input tokens", domain: [0, 60e3], tickFormat: formatCountTick },
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
          // placeholder: the last sentence explains the star of the partial last cohort.
          definition: "Each user's median output tokens, by release cohort: the median over the cohort's users, with bands from the 25th to the 75th and the 10th to the 90th percentile. Cohort Apr '26* is the users first seen in the trace's last two days.",
          kind: "bands",
          chart: {
            x: COHORT_AXIS,
            // From zero, as the paper's, to its top past the latest cohort's 90th percentile, 3,040.
            y: { label: "Per-user median output tokens", domain: [0, 3200], tickFormat: formatCountTick },
            colour: OUTPUT_COLOUR,
            valueLabel: "Median output tokens",
            valueFormat: formatWholeCount,
          },
        }),
      ]),
    }),
  ]),
});
