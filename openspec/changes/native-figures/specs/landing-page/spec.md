# landing-page (delta)

## MODIFIED Requirements

### Requirement: Insights
After the Traffic Explorer, an Insights section (that heading, no eyebrow,
anchor `#insights`) SHALL hold the paper's figures, each drawn by the
site from its figure answer, in six numbered topics shown one at a time
behind a row of tabs under the heading: each topic with its heading, a
takeaway sentence of at most twenty words under it, and no other intro
text; each card with a title, an insight of at most twenty words under
the title, the figure's chart, a caption of at most forty words in at
most three sentences under the chart, and behind a control its
definition (at most sixty words in at most three sentences), a link to
the figure's plotdata file in the artifact on GitHub and a link to its
section's README there. A click on a tab SHALL show its topic and hide
the others, and SHALL write the topic's anchor to the URL's hash, so
that a link with that hash opens the Insights on that topic and the
browser's Back returns to the topic before, whatever anchor the page
opened on. The tab row SHALL follow the ARIA tabs pattern: one tab stop,
the arrow keys, Home and End moving between topics, each topic a tab
panel labelled by its tab.

| Topic | Cards, in order (the artifact's figure names) |
|---|---|
| 01 Workload overview (`#insights-overview`) | `fig_request_rate_day`, `fig_token_rate_day`, `fig_daily_unique_models`, `fig_function_name_daily_requests`, `fig_seasonality` |
| 02 Token shape and latency (`#insights-tokens`) | `fig_token_length_input_cdf_by_model`, `fig_token_length_output_cdf_by_model`, `fig_output_input_ratio_cdf_by_model`, `fig_latency_e2e_cdf_by_model`, `fig_prefill_fraction_cdf_by_model`, `fig_duration_p50_heatmap`, `fig_ttft_p50_heatmap_input_output`, `fig_ttft_heatmap_input_cached` |
| 03 Users and models (`#insights-users`) | `fig_model_requests_vs_users_density`, `fig_user_requests_distinct_models_heatmap`, `fig_model_median_input_output_heatmap`, `fig_user_median_input_output_heatmap`, `fig_model_raster_qwen3_next_80b`, `fig_model_raster_gpt_oss_20b`, `fig_user_raster_periodic`, `fig_user_raster_explore`, `fig_model_heatmap_fixedxy_density`, `fig_model_heatmap_fixedxy_scatter_colored_metrics` |
| 04 Workload evolution (`#insights-evolution`) | `fig_top10_model_monthly_request_share` and `fig_top10_model_monthly_token_share`, each with its series in the order of `fig_top10_model_monthly_share_legend`; `fig_monthly_input_token_intervals`, `fig_monthly_output_token_intervals`, `fig_user_release_cohort_input_band`, `fig_user_release_cohort_output_band` |
| 05 Prefix caching (`#insights-caching`) | `fig_request_cached_fraction_cdf_by_input`, `fig_request_token_hit_rate_cdf_by_model`, `fig_model_nreq_vs_avg_hitratio_hexbin`, `fig_user_nreq_vs_avg_hitratio_hexbin`, `fig_iat_monthly_per_user_band`, `fig_per_user_iat_p50_by_model`, `fig_iat_pair_ttl_coverage`, `fig_hit_ratio_minimax_m25`, `fig_hit_ratio_deepseek_v32` |
| 06 Load balancing (`#insights-balancing`) | `fig_lb_request_rate`, `fig_lb_active_instances`, `fig_lb_maxmean_tokens`, `fig_lb_concurrency`, `fig_lb_ttft_p90_vs_load`, `fig_lb_decode_p90_vs_load`, `fig_lb_user_zoom_top` (two panels: request share, token hit), `fig_lb_user_zoom_min` (the same two panels), `fig_routing_tradeoff` (a wide card of four panels, a line per model in each) |

Every file the artifact's `config/figures.json` lists SHALL be the
figure of exactly one card or, for the share legend, the series order of
the two share cards, and a test SHALL compare the two lists when the
artifact's checkout is given.

#### Scenario: Opening the page
- **WHEN** a visitor opens the page
- **THEN** the first topic SHALL be shown with its five cards drawn, and no other topic's answers SHALL be requested until its tab is shown

#### Scenario: The definition on demand
- **WHEN** the visitor opens a card's definition control
- **THEN** the card SHALL show the definition, the link to the figure's plotdata and the link to the artifact's README, and hide them again when closed

#### Scenario: A caption that grew
- **WHEN** an insight or a takeaway exceeds twenty words, a caption forty, a definition sixty, or a card has no insight
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

### Requirement: Legends toggle series
In an Overview chart or a figure card with more than one series, each
legend entry SHALL be a button that hides or shows its series, redrawing
the chart from the rows it already has. A hidden series SHALL be shown
struck through in the legend. The legend SHALL be one tab stop, the
arrow keys moving between its buttons. The hidden set SHALL NOT be kept
in the URL.

#### Scenario: Hiding a model in the trend
- **WHEN** the visitor clicks a model in the requests-per-month legend
- **THEN** that model's segments SHALL disappear from every bar and the bars SHALL rescale

#### Scenario: Hiding a model in a CDF card
- **WHEN** the visitor clicks "DeepSeek R1" in the input-tokens card's legend
- **THEN** that line SHALL disappear and the other lines SHALL stay as drawn

## ADDED Requirements

### Requirement: Figure cards are drawn from their answers
A card's figure SHALL be drawn by the site with the chart kind the card
names, from the rows of the figure's answer alone, at the card's width,
with the paper's axes: the same quantities on x and y, a log scale where
the paper's axis is log, the paper's limits where the card gives them,
and tick labels in the site's formats. Every kind but `raster` SHALL
show a tooltip with the values under the pointer; a `raster` is drawn
on a canvas and takes no tooltip. Series colours SHALL come from the
theme, the three highlighted models and the global series keeping one
colour each across every card. In the dark scheme a chart SHALL use the
dark tokens as the Overview's charts do. On a phone a chart SHALL be as
wide as its card and the page SHALL NOT scroll sideways. A card whose
answer fails to load SHALL say so in the chart's place. A chart's SVG
SHALL carry the card's title and insight as its accessible name.

#### Scenario: A value under the pointer
- **WHEN** the pointer rests on the requests-per-day line at day 120
- **THEN** a tooltip SHALL show that day and its requests

#### Scenario: A log axis
- **WHEN** the input-tokens CDF card is drawn
- **THEN** its x axis SHALL be logarithmic from 1 to 400,000 tokens with the ticks labelled in the site's format

#### Scenario: A raster
- **WHEN** the Qwen3-Next-80B card is drawn
- **THEN** it SHALL show one cell per user row and hour, shaded by requests, with the days of the window on the x axis

#### Scenario: A phone
- **WHEN** the page is opened 360 pixels wide
- **THEN** the cards SHALL stack in one column, each chart as wide as its card, and the page SHALL not scroll sideways

## REMOVED Requirements

### Requirement: Figure cards are the paper's images
**Reason**: Every figure is drawn natively from its plotdata answer.
**Migration**: The image, its full-size link, the white panel in the dark scheme and the images' index go; the card's copy fields stay.
