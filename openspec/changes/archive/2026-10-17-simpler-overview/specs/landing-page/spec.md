## REMOVED Requirements
### Requirement: Monthly trends
**Reason**: The three monthly charts go; the Overview is the two donuts.

### Requirement: Overview donuts
**Reason**: The model mix becomes the family mix; restated as "The Overview's two mixes".

### Requirement: Legends toggle series
**Reason**: Its trend scenario goes with the trends; restated as "Legend buttons".

## ADDED Requirements
### Requirement: The Overview's two mixes
Below the hero, an Overview section (`#overview`) SHALL hold two cards
and nothing else: the family mix (the share of requests per model
family over the year, from the `explore/family_mix` answer, each family
of the artifact's family table named and the models in no family as
Other) and the endpoint mix (the share of requests per endpoint group:
chat, chat stream, completion, completion stream and other), as donuts
with legends that toggle, each donut's centre reading its total. The
family mix SHALL take the families' colours of the Traffic Explorer, the
families in the order of their requests and Other last in its grey; the
endpoints' colours SHALL start from a different slot than the families'.
On a phone a donut's legend SHALL be one column.

#### Scenario: The family mix
- **WHEN** the page draws
- **THEN** the family-mix donut's shares SHALL equal the `explore/family_mix` answer and its colours SHALL match the families' colours in the Traffic Explorer

#### Scenario: The centre
- **WHEN** the page draws
- **THEN** the family-mix donut's centre SHALL read the stats strip's request count

### Requirement: Legend buttons
In an Overview donut, the Traffic Explorer's chart or a figure card with
more than one series, each legend entry SHALL be a button that hides or
shows its series, redrawing the chart from the rows it already has. A
hidden series SHALL be shown struck through in the legend. The legend
SHALL be one tab stop, the arrow keys moving between its buttons. The
hidden set SHALL NOT be kept in the URL.

#### Scenario: Hiding a family in the donut
- **WHEN** the visitor clicks a family in the family mix's legend
- **THEN** that family's slice SHALL disappear and the other slices SHALL take the ring

#### Scenario: Hiding a model in a CDF card
- **WHEN** the visitor clicks "DeepSeek R1" in the input-tokens card's legend
- **THEN** that line SHALL disappear and the other lines SHALL stay as drawn

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
definition (at most sixty words in at most three sentences) and nothing
else. A definition SHALL describe what the figure shows in plain words
and SHALL NOT name a cut-off used to pick its rows or a bin width. A card's element
SHALL carry its figure's name in a `data-figure` attribute. A click on
a tab SHALL show its topic and hide the others, and SHALL write the
topic's anchor to the URL's hash, so that a link with that hash opens
the Insights on that topic and the browser's Back returns to the topic
before, whatever anchor the page opened on. The tab row SHALL follow the
ARIA tabs pattern: one tab stop, the arrow keys, Home and End moving
between topics, each topic a tab panel labelled by its tab.

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
- **THEN** the card SHALL show the definition and no link, and hide it again when closed

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

### Requirement: Cite, Team and footer
The page SHALL end with a Cite section holding the paper's BibTeX in a
block with a copy button, its lines wrapping rather than scrolling, and
under its citation sentence one see-also sentence naming, with a link,
the blog post "A Year of LLM Traffic, in a Browser Tab", which explores
the same trace in the browser; a Team section naming Harvard MadSys and
collaborators and the paper's authors with their affiliations as names,
not links; and a footer with the brand line "Chutes Production Trace",
one line of the user's words whose month count is read from
`trace_totals` in digits, the lab's name "Harvard SEAS · MadSys Lab"
linking to the lab, and the on-site and elsewhere links, and nothing
else: no copyright line and no policy links. Every link that leaves the
site SHALL show an arrow after its text.

#### Scenario: Copying the citation
- **WHEN** the visitor presses the copy button
- **THEN** the BibTeX SHALL be on the clipboard unchanged

#### Scenario: A link off the site
- **WHEN** the visitor looks at the hero's Paper button, the see-also link or the footer's Dataset link
- **THEN** each SHALL end in an arrow, and the Traffic Explorer link SHALL not
