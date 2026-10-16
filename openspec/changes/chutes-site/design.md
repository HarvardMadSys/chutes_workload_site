# Design: The Chutes trace site

## The engineering rules

Binding, as `openspec/config.yaml` and the `site` spec state them: simple,
readable and maintainable first; no optimisation without a recorded
measurement; plain HTML, CSS and ES modules with CDN libraries at pinned
versions; names that are words; a function at most 50 lines and a module
at most 300; SQL as one literal per `.sql` file; every module tested and
`make test` green at every commit. The agentic site's `CONTRIBUTING.md`
is copied and adapted, and remains the one statement of the rules.

## Decisions

### D1. A new repository seeded by copying the agentic site

The repository starts as a copy of `freeinference_agentic_site`'s files
(not its git history: the history carries 87 MB of session buckets that
this site never has), with everything the Chutes site does not need
deleted before the first commit: the Session page and its modules, the
session buckets, the figure modules and chart kinds the Insights no longer
draw (`cdf`, `ranges`, `histogram`, `ranked`, `knee_lines`), the session
queries and their tests. What stays is the shell: `style.css`, the theme
and colour tokens, the layout and header, the hero, stats, donuts, cite
and team modules, the trends (stacked bars), the filter and URL-key pattern,
the topic tabs, the answers reader, the format helpers, the test
infrastructure (node tests, pytest, snapshots) and the deploy tooling.

*Alternative rejected:* one multi-dataset site. The two sites have
different data steps (a per-week release against a set of caches), a
different explorer and different papers, and each will get its own
hostname; one repository would hold two of everything under one `make
data`. Two repositories that share a look by copy is the simpler thing to
maintain; the shared modules are small and change rarely.

### D2. The paper's figures are PNGs rendered from the artifact's PDFs

`make data` renders every PDF the artifact's `config/figures.json` lists
to `site/figures/<name>.png` with pypdfium2 (a pip dependency, pinned; no
system package) at a scale that gives a figure twice its CSS width on the
page (about 1,100 px for a 3.5-inch panel), and a card shows the image at
its own width with `width` and `height` attributes so the page does not
jump while images load. The 48 PDFs total 2.6 MB; at that scale the PNGs
come to roughly 10 MB, the two model rasters the largest. Each image
links to itself full size. The image's `alt` is the card's title and
insight. The card's definition control shows the definition, which cache
the figure rests on, and a link to the figure's section README in the
artifact on GitHub.

In the dark scheme the figure sits on a white panel inside the card, as a
printed figure would: matplotlib's black ink on a transparent background
would be unreadable on the dark paper, and recolouring the paper's images
is not this site's business.

*Alternatives rejected:* SVG (crisp, but a hexbin or raster is tens of
thousands of paths, the model rasters hold millions of points, and font
embedding differs by viewer); redrawing the figures with Observable Plot
from reduced answers (the user asked for the paper's static figures; a
figure that should become interactive is its own later change).

### D3. The data step reads the artifact's caches with DuckDB and `.sql` literals

`python -m site_data --artifact <dir> --out site/data` registers the
artifact's small caches as DuckDB tables, each under the cache file's
name (`monthly_requests_tokens_by_model`, `function_name_daily_requests`,
`model_request_rank`, `trace_totals`, `daily_rollup`), the model names (`data/paper/chute_models.csv`) as
`chute_models`, and runs one `.sql` file per answer under
`site/queries/explore/`, writing `site/data/all/explore/<query>.json`
and the queries' hashes, as the agentic site does. The queries filter,
group, count, sum and take quantiles; no definition is restated.

The caches the step reads are the ones the artifact commits under
`data/paper/cache/` (every one it needs is there, 12 MB in all, except
`trace_totals`, D5). The step reads the artifact checkout's `data/paper/`
(committed) and `figures/` (committed), never `output/` and never the
trace, so a clone of the artifact is enough to rebuild the site.

There are no selection tables: the site answers one selection, the whole
trace. `selected_weeks` and `selected_harnesses` and the `benchmark`
handling are deleted with the agentic site's buckets.

### D4. The Traffic Explorer

One section, one wide card: a controls row (a model drop-down of the
twenty most requested named models and Other, an endpoint drop-down of
the endpoint groups, and period buttons All, Q2 '25, Q3 '25, Q4 '25,
Q1 '26), a chart of requests per day as stacked bars (by model, or by
endpoint group once a model is chosen) with a legend that toggles, and
four tiles that follow the choice: requests, average input tokens,
average output tokens and average TTFT with the share of requests that
record it. The choice lives in the URL as `model`, `endpoint` and
`period`; the default writes no key. The chart and tiles are drawn from
one answer, `explore/daily_rollup`: one row per day, model (the twenty
and Other) and endpoint group, with the request count, the token sums
and counts, and the TTFT sum and count, filtered and summed in the
browser. That is at most about 40,000 rows, under 1 MB. The answer is a
plain reshaping of the artifact's `daily_rollup` cache, which the
artifact computes once from the trace (D5). Averages divide by the
count of requests that have the value.

What is left out, on purpose: hourly grain (hour of day is a paper
figure), a database in the browser, brushing, animation, anomalies,
export, and model families, which are not in the trace. The explorer
reuses the stacked-bars kind, the legend, the URL-key pattern and the
tiles the site already has; it is one module and one query.

### D5. The totals and the daily rollup are counted in the artifact, not typed

The stats strip shows the paper's Table 2: the span, requests, input
tokens, output tokens, users, models and serving instances. Requests and
models can be counted from existing caches; users (people, not
`(user_id, rehash_round)` keys), instances and the token split cannot.
The Traffic Explorer needs a day × model × endpoint rollup that no cache
holds either. The artifact gains two caches written by queries in
`paper/01_workload_overview/reproduce.py` in that script's caching
pattern and committed under `data/paper/cache/`: `trace_totals.parquet`
(one row) and `daily_rollup.parquet` (one row per day, `chute_id` of
the twenty most requested named models or null for the rest, and
endpoint group: requests, input and output token sums with their
counts, TTFT sum and count; about 40,000 rows, under 1 MB). Both run
once against the trace on this machine (minutes). The site's `make
data` stops, naming the file, when either is absent.

*Alternative rejected:* typing Table 2's numbers into the site. They
would be right today and wrong after any re-export, with no test to say
so.

### D6. Trace months labelled from one start date

The release's timestamps count from the trace's first request, so the
caches' months (1970-01 to 1971-01) are month-long stretches of days
from that first day, not calendar months; the thirteenth holds the last
two days. The paper labels its axes with calendar months from the
trace's known start, 2025-04-11. The data step holds that date as one
named constant with its source in a comment and writes, for each trace
month, its number and the calendar month its first day falls in
(`2025-04` ... `2026-04`) into the monthly answers, so the page never
computes a date and the bars read as the paper's axes do.

### D7. Topics and cards

Six topics follow the paper's sections; a card is one panel of a paper
figure, in the paper's order; the monthly share legend, a PDF of its own,
is shown above each of the two share panels rather than as a card.

| Topic | Anchor | Cards (artifact figure names, `.pdf` dropped) |
|---|---|---|
| 01 Workload overview | `#insights-overview` | `fig_request_rate_day`, `fig_token_rate_day`, `fig_daily_unique_models`, `fig_function_name_daily_requests`, `fig_seasonality` |
| 02 Token shape and latency | `#insights-tokens` | `fig_token_length_input_cdf_by_model`, `fig_token_length_output_cdf_by_model`, `fig_output_input_ratio_cdf_by_model`, `fig_latency_e2e_cdf_by_model`, `fig_prefill_fraction_cdf_by_model`, `fig_duration_p50_heatmap`, `fig_ttft_p50_heatmap_input_output`, `fig_ttft_heatmap_input_cached` |
| 03 Users and models | `#insights-users` | `fig_model_requests_vs_users_density`, `fig_user_requests_distinct_models_heatmap`, `fig_model_median_input_output_heatmap`, `fig_user_median_input_output_heatmap`, `fig_model_raster_qwen3_next_80b`, `fig_model_raster_gpt_oss_20b`, `fig_user_raster_periodic`, `fig_user_raster_explore`, `fig_model_heatmap_fixedxy_density`, `fig_model_heatmap_fixedxy_scatter_colored_metrics` |
| 04 Workload evolution | `#insights-evolution` | `fig_top10_model_monthly_request_share` (with `fig_top10_model_monthly_share_legend`), `fig_top10_model_monthly_token_share` (with the legend), `fig_monthly_input_token_intervals`, `fig_monthly_output_token_intervals`, `fig_user_release_cohort_input_band`, `fig_user_release_cohort_output_band` |
| 05 Prefix caching | `#insights-caching` | `fig_request_cached_fraction_cdf_by_input`, `fig_request_token_hit_rate_cdf_by_model`, `fig_model_nreq_vs_avg_hitratio_hexbin`, `fig_user_nreq_vs_avg_hitratio_hexbin`, `fig_iat_monthly_per_user_band`, `fig_per_user_iat_p50_by_model`, `fig_iat_pair_ttl_coverage`, `fig_hit_ratio_minimax_m25`, `fig_hit_ratio_deepseek_v32` |
| 06 Load balancing | `#insights-balancing` | `fig_lb_request_rate`, `fig_lb_active_instances`, `fig_lb_maxmean_tokens`, `fig_lb_concurrency`, `fig_lb_ttft_p90_vs_load`, `fig_lb_decode_p90_vs_load`, `fig_lb_user_zoom_top`, `fig_lb_user_zoom_min`, `fig_routing_tradeoff` (wide) |

47 cards over 48 files, every file of the artifact's `config/figures.json`
used once; a test compares the two lists when the artifact is present.

### D8. The Overview

Two donuts: the model mix (share of requests per model over the year, the
eight most requested named models and Other) and the endpoint mix (share
of requests per endpoint group: chat, chat stream, completion, completion
stream, other). Three monthly trends as stacked bars: requests by model,
tokens by model (the donut's eight and Other), requests by endpoint
group. All from the monthly and daily caches; the x axis is the calendar
months of D6.

### D9. Tests

As the agentic site's, less the sessions: pytest over the data step with
a fixture artifact (small caches and one PDF made in the test), the
answer-equals-live-query parity for every answered query, the query-hash
check, the repository test (tracked files, no machine path, library URLs
in one module, data whole and current, every listed figure image
present), the node tests of every module, the word-count test over the
cards' copy, the palette contrast test, and the snapshot test over six
states (the page with each topic shown), each state's units the texts of
the cards, the donuts, the trends, the Traffic Explorer's chart and
tiles, and the images' sources and sizes.

### D10. Deployment

`wrangler.jsonc` names the Worker `chutes-trace-site`, `workers_dev`
until a hostname is chosen, and the deploy workflow checks `/`, the
daily rollup answer and one figure image after each deploy. When the hostname
is set it is listed in `wrangler.jsonc`, since an unlisted custom domain
is detached on deploy.

## Measurements to record when the data is first built

The answers' total size and the images' total size (expected about 1 MB
and 10 MB), and the time of `make data` (expected under a minute: the
caches are small and the rendering is 48 pages).
