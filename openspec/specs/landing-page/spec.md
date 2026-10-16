# landing-page Specification

## Purpose
TBD - created by archiving change chutes-site. Update Purpose after archive.

## Requirements

### Requirement: Hero and stats strip
The page SHALL open with a hero: the title "Chutes Production Trace" with
"Production Trace" in the accent colour and no eyebrow above it; a lede
of the user's words whose month count is read from the `trace_totals`
answer and written in digits; five buttons: "Traffic Explorer" to the
Traffic Explorer section, "Insights" to the Insights section, "Dataset"
(the Hugging Face dataset), the paper and the code; and under them the
lab's name "Harvard SEAS · MadSys Lab" linking to the lab. Beside it a
stats strip SHALL show, computed from the `trace_totals` answer and never
typed, the trace as the paper's summary table counts it: the span in
months, requests, input tokens, output tokens, users, models and serving
instances, and a line naming the span's first and last day.

#### Scenario: Opening the page
- **WHEN** a visitor opens the page
- **THEN** the hero and the stats strip SHALL be visible before any figure, and the strip's request count SHALL equal the Traffic Explorer's requests tile with nothing chosen

#### Scenario: A stat is counted, not typed
- **WHEN** the artifact's `trace_totals` cache changes and `make data` reruns
- **THEN** the stats strip SHALL show the new numbers without an edit to the page

#### Scenario: The site buttons
- **WHEN** the visitor presses "Traffic Explorer" or "Insights"
- **THEN** the page SHALL scroll to that section

### Requirement: Overview donuts
Below the hero, an Overview section (`#overview`) SHALL open with two
cards: the model mix (the share of requests per model over the year, the
eight most requested named models named and the rest as Other) and the
endpoint mix (the share of requests per endpoint group: chat, chat
stream, completion, completion stream and other), as donuts with legends
that toggle, in the site's colour orders, the endpoints' colours starting
from a different slot than the models', each donut's centre reading its
total. On a phone a donut's legend SHALL be one column.

#### Scenario: The model mix
- **WHEN** the page draws
- **THEN** the model-mix donut's shares SHALL equal the `explore/model_mix` answer and its colours SHALL match the models' colours in the trends

#### Scenario: The centre
- **WHEN** the page draws
- **THEN** the model-mix donut's centre SHALL read the stats strip's request count

### Requirement: Monthly trends
Three cards in the Overview SHALL show per trace month (a month counted
from the trace's first day, labelled by the calendar month its first
day falls in) the requests by model, the tokens by model (input and
output together, as the cache sums them) and the requests by endpoint
group, as stacked bars, the
models the donut names named and the rest folded into Other, with
legends that toggle, each chart as wide as its card's body, its x axis
ticked at every month, the first and the last included. A bar SHALL take
no click.

#### Scenario: Clicking a bar
- **WHEN** the visitor clicks a month's bar
- **THEN** nothing SHALL change

#### Scenario: Months per bar
- **WHEN** the requests-per-month card draws
- **THEN** it SHALL show 13 bars labelled from the answer's calendar months, `2025-04` first and `2026-04` last, the last bar holding two days

### Requirement: Traffic Explorer
Directly after the Overview, a Traffic Explorer section (that heading,
no eyebrow, anchor `#traffic`, and under the heading one guide line of
the user's words) SHALL hold one row of plain form controls and one wide
card. The controls: a family drop-down ("All families", the families of
the artifact's family table in order of their requests, "Other"), a
model drop-down (disabled while no family is chosen, reading "Choose a
family"; then "All <family> models", the family's eight most requested
named models and, where the family has other models, "Other <family>",
"Rest of Other" for the family Other), an endpoint drop-down ("All
endpoints" and one entry per endpoint group) and period buttons All, Q2 '25, Q3 '25, Q4 '25 and
Q1 '26 (the calendar quarters the trace spans, by the trace months'
labels). The card: requests per day as stacked bars over the chosen
period, by family while no family is chosen, by model once a family is
and by endpoint group once a model is, with a legend that toggles, and
four tiles above the chart that follow the choice: requests, average
input tokens, average output tokens, and average TTFT with the share of
the chosen requests that record it; an average SHALL divide by the
requests that have the value. The choice SHALL live in the URL query
string as `family`, `model`, `endpoint` and `period`, the default
writing no key; a `model` without a `family`, or not among that family's
entries, SHALL be ignored. The keys SHALL be read when the page opens
and when Back or Forward returns to a history entry; no other key SHALL
be read or rewritten. The section SHALL draw from the
`explore/daily_by_family` answer while no family is chosen and from the
family's `explore/daily_by_model/<family>` answer once one is, fetched
when the family is first chosen, filtering and summing in the browser.
A bar SHALL take no click.

#### Scenario: Choosing a family
- **WHEN** the visitor chooses "DeepSeek"
- **THEN** the bars SHALL show DeepSeek's requests per day split by its eight models and "Other DeepSeek", the model drop-down SHALL offer those entries, the tiles SHALL sum the family, and the URL SHALL read `?family=deepseek`

#### Scenario: Choosing a model
- **WHEN** the visitor, with DeepSeek chosen, chooses "deepseek-ai/DeepSeek-V3-0324-TEE"
- **THEN** the bars SHALL show that model's requests per day split by endpoint group, the tiles its requests, averages and TTFT share, and the URL SHALL read `?family=deepseek&model=<its id>`

#### Scenario: Choosing a period
- **WHEN** the visitor presses "Q3 '25"
- **THEN** the chart SHALL show the days of July to September 2025 only, the tiles SHALL sum those days, and the URL SHALL carry `period=2025-q3`

#### Scenario: An average with missing values
- **WHEN** the chosen requests number 1,000 and 490 of them record a TTFT
- **THEN** the TTFT tile SHALL average those 490 and say 49% record it

#### Scenario: Sharing a view
- **WHEN** a visitor opens `index.html?endpoint=chat_stream&period=2026-q1`
- **THEN** the chart SHALL show the streaming chat requests of January to March 2026 by family, and every figure SHALL be as without the keys

#### Scenario: A model key without its family
- **WHEN** a visitor opens `index.html?model=<a DeepSeek id>`
- **THEN** the chart SHALL show every family and the URL SHALL be rewritten without the key

#### Scenario: Back after a choice
- **WHEN** the visitor shows the fourth topic, then chooses the family Qwen, then presses the browser's Back
- **THEN** the URL SHALL carry no key, and the controls, the tiles, the chart and the header's brand SHALL show everything again; Forward SHALL show Qwen again

#### Scenario: A phone
- **WHEN** the page is opened 360 pixels wide
- **THEN** the controls SHALL wrap, the tiles SHALL stack, and the page SHALL not scroll sideways

### Requirement: The page appears before the data
The page SHALL draw its layout first, then every number, card, the
Traffic Explorer and the shown topic's cards from the answers and the images' index, each
part showing a loading state until its answer arrives and its error in
its own place if the answer fails, without stopping the others. The page
SHALL run no query and load no database.

#### Scenario: A slow connection
- **WHEN** an answer file takes several seconds to download
- **THEN** the page SHALL already show its layout, with a loading state in that answer's place and the other parts drawn

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

### Requirement: Cite, Team and footer
The page SHALL end with a Cite section holding the paper's BibTeX in a
block with a copy button, its lines wrapping rather than scrolling; a
Team section naming Harvard MadSys and collaborators and the paper's
authors with their affiliations as names, not links; and a footer with
the brand line "Chutes Production Trace", one line of the user's words
whose month count is read from `trace_totals` in digits, the lab's name
"Harvard SEAS · MadSys Lab" linking to the lab, and the on-site and
elsewhere links, and nothing else: no copyright line and no policy
links. Every link that leaves the site SHALL show an arrow after its
text.

#### Scenario: Copying the citation
- **WHEN** the visitor presses the copy button
- **THEN** the BibTeX SHALL be on the clipboard unchanged

#### Scenario: A link off the site
- **WHEN** the visitor looks at the hero's Paper button or the footer's Dataset link
- **THEN** each SHALL end in an arrow, and the Traffic Explorer link SHALL not

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
- **THEN** it SHALL shade each user row's hours by their requests, with the days of the window on the x axis, neighbouring hours and rows sharing a pixel, shaded by the most requests among them, where the window has more hours or rows than the plot has pixels

#### Scenario: A phone
- **WHEN** the page is opened 360 pixels wide
- **THEN** the cards SHALL stack in one column, each chart as wide as its card, and the page SHALL not scroll sideways
