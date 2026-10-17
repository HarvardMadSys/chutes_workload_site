## MODIFIED Requirements
### Requirement: Insights
After the Traffic Explorer, an Insights section (that heading, no eyebrow,
anchor `#insights`) SHALL hold the paper's figures, each drawn by the
site from its figure answer, in six numbered topics shown one at a time
behind a row of tabs under the heading: each topic with its heading, a
takeaway of one sentence and at most thirty words under it (the
paper's finding for the section in plain words), and its cards in
groups, each group with a heading of at most six words and a takeaway
of at most two sentences and forty words that says what the group's
figures show and, where the paper draws one, what it means for a serving
system, and no other intro text; each card with a title, an insight of at most twenty words under
the title, the figure's chart, a caption of at most forty words in at
most three sentences under the chart, and behind a control its
definition (at most sixty words in at most three sentences) and nothing
else. A definition SHALL describe what the figure shows in plain words
and SHALL NOT name a cut-off, a count or a bin width. A card's element
SHALL carry its figure's name in a `data-figure` attribute. A click on
a tab SHALL show its topic and hide the others, and SHALL write the
topic's anchor to the URL's hash, so that a link with that hash opens
the Insights on that topic and the browser's Back returns to the topic
before, whatever anchor the page opened on. The tab row SHALL follow the
ARIA tabs pattern: one tab stop, the arrow keys, Home and End moving
between topics, each topic a tab panel labelled by its tab.

| Tab | Groups, each with its cards in order (the artifact's figure names) |
|---|---|
| 01 The workload at a glance (`#insights-overview`) | Demand over the year: `fig_request_rate_day`, `fig_token_rate_day`, `fig_daily_unique_models`, `fig_function_name_daily_requests` · The weekly rhythm: `fig_seasonality` |
| 02 Request shape and latency (`#insights-tokens`) | Three model profiles: `fig_token_length_input_cdf_by_model`, `fig_token_length_output_cdf_by_model`, `fig_output_input_ratio_cdf_by_model` (a wide card) · Latency is mostly decode: `fig_latency_e2e_cdf_by_model`, `fig_prefill_fraction_cdf_by_model` · What drives latency: `fig_duration_p50_heatmap`, `fig_ttft_p50_heatmap_input_output`, `fig_ttft_heatmap_input_cached` |
| 03 Users and models (`#insights-users`) | Same volume, different breadth: `fig_model_requests_vs_users_density`, `fig_user_requests_distinct_models_heatmap`, `fig_model_median_input_output_heatmap`, `fig_user_median_input_output_heatmap` · Access patterns: `fig_model_raster_qwen3_next_80b`, `fig_model_raster_gpt_oss_20b`, `fig_user_raster_periodic`, `fig_user_raster_explore` · Burstiness is persistent: `fig_model_heatmap_fixedxy_density`, `fig_model_heatmap_fixedxy_scatter_colored_metrics` |
| 04 A year of change (`#insights-evolution`) | Dominant models turn over: `fig_top10_model_monthly_request_share` and `fig_top10_model_monthly_token_share`, each with its series in the order of `fig_top10_model_monthly_share_legend` · Inputs stay, outputs shrink: `fig_monthly_input_token_intervals`, `fig_monthly_output_token_intervals` · Newer users send more input: `fig_user_release_cohort_input_band`, `fig_user_release_cohort_output_band` |
| 05 Prefix caching (`#insights-caching`) | Reuse is all or nothing: `fig_request_cached_fraction_cdf_by_input`, `fig_request_token_hit_rate_cdf_by_model`, `fig_model_nreq_vs_avg_hitratio_hexbin`, `fig_user_nreq_vs_avg_hitratio_hexbin` · Reuse comes back fast: `fig_iat_monthly_per_user_band`, `fig_per_user_iat_p50_by_model`, `fig_iat_pair_ttl_coverage` (a wide card) · Simple eviction holds up: `fig_hit_ratio_minimax_m25`, `fig_hit_ratio_deepseek_v32` |
| 06 Load balancing (`#insights-balancing`) | Balanced on average, not every hour: `fig_lb_request_rate`, `fig_lb_active_instances`, `fig_lb_maxmean_tokens`, `fig_lb_concurrency`, `fig_lb_ttft_p90_vs_load`, `fig_lb_decode_p90_vs_load` · Locality against balance: `fig_lb_user_zoom_top` (two panels: request share, token hit), `fig_lb_user_zoom_min` (the same two panels) · Cache-aware routing: `fig_routing_tradeoff` (a wide card of eight panels in two rows, one row per model, four panels each) |

Every file the artifact's `config/figures.json` lists SHALL be the
figure of exactly one card or, for the share legend, the series order of
the two share cards, and a test SHALL compare the two lists when the
artifact's checkout is given.

#### Scenario: Opening the page
- **WHEN** a visitor opens the page
- **THEN** the first topic SHALL be shown with its two groups and five cards drawn, and no other topic's answers SHALL be requested until its tab is shown

#### Scenario: The definition on demand
- **WHEN** the visitor opens a card's definition control
- **THEN** the card SHALL show the definition and no link, and hide it again when closed

#### Scenario: A caption that grew
- **WHEN** an insight exceeds twenty words, a topic takeaway thirty, a group heading six, a group takeaway forty, a caption forty, a definition sixty, or a card has no insight
- **THEN** the node test that counts them SHALL fail

#### Scenario: The topic bar
- **WHEN** the visitor clicks "05 Prefix caching"
- **THEN** that topic alone SHALL be shown, its nine cards drawn, and the URL's hash SHALL read `#insights-caching`

#### Scenario: Back
- **WHEN** the visitor has switched from the first topic to the fourth and presses the browser's Back
- **THEN** the first topic SHALL be shown again

#### Scenario: A figure added to the paper
- **WHEN** the artifact's `config/figures.json` gains a figure that no card shows
- **THEN** the test that compares the lists SHALL fail naming it
