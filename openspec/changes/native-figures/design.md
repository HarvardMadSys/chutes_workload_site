# Design: Native, interactive figures

## The engineering rules

Binding, as `openspec/config.yaml` and the `site` spec state them: simple,
readable and maintainable first; no optimisation without a recorded
measurement; plain HTML, CSS and ES modules with CDN libraries at pinned
versions; names that are words; a function at most 50 lines, a module at
most 300, a folder at most nine modules; SQL as one literal per `.sql`
file; every module tested and `make test` green at every commit. The
artifact repository keeps its own pattern: one `reproduce.py` per paper
section, query results cached as Parquet under a name, committed when
small.

## Decisions

### D1. The artifact owns a plot-ready table per figure

Each `paper/<section>/reproduce.py` gains, for every figure it draws, one
function that builds the figure's plotdata and caches it as
`plotdata/<figure>.parquet` through a `cached_frame(name, build)` helper
in `paper/_common.py`, beside `cached_query`; the figure's draw function
takes that frame. The three external figures' generators do the same.
`paper/_paths.py` gains `PLOTDATA_DIR` (`output/paper/plotdata/`, seeded
from the committed `data/paper/plotdata/` as the caches are), and
`check_figures.py` also lists every figure of `config/figures.json`
without a plotdata file. Every plotdata file is committed: the largest,
the Qwen raster, is expected under 1 MB (measured below).

The plotdata is the plotted frame: for a line, its points; for a CDF, its
steps; for a band, the month and its five quantiles; for a heatmap, its
cells. Where the script computed the frame at draw time (the seasonality's
division by days per weekday, the top-ten share with its TEE merge, the
cohort quantiles, the hourly resamples, the boxplot statistics, the
routing panel (d)'s imbalance), that computation moves into the plotdata
function and the draw function only draws. A figure of a point cloud (the
seven hexbins, the two load-balancing P90 hexbins, the four rasters) gets
the cloud binned: the hexbins on a log grid of the paper's cell count per
axis with the paper's extent and `mincnt`, each cell its count or its P90;
the rasters as one row per (row index, hour of the window) with the
requests in that hour. The paper's PDF of a hexbin keeps matplotlib's
hexagons from the points; the plotdata is the same points on square
cells. The share legend's plotdata is the eleven series in order.

*Alternative rejected:* the site re-deriving the frames from the caches in
SQL. Half the figures compute something at draw time, so the site would
hold a second copy of each definition, with nothing to say when the two
drift; sixteen figures have no committed cache at all. One table per
figure, written by the figure's own script, is the one home.

*Alternative rejected:* hexagon cells computed by matplotlib's `hexbin`
on a throwaway axes. It preserves the paper's picture but depends on a
drawing call for data, and the site would draw hexagons as sized dots
whose radius follows the chart's pixel width. Square log-grid cells are a
plain `GROUP BY` and draw as rectangles.

### D2. One column contract per chart kind

A plotdata file's columns say what kind of chart it is; the site's data
step copies them to JSON unchanged, and a node test checks every card's
answer against its kind. The kinds and their columns:

| Kind | Columns | Figures |
|---|---|---|
| `lines` | `series`, `x`, `y`; optional `panel` | the daily lines (4), the hourly load-balancing lines (3), the two cache-size sweeps, the TTL coverage, the routing panels (a)–(d) |
| `cdf` | `series`, `x`, `cdf` | the eight CDFs less the TTL coverage |
| `bands` | `x`, `p10`, `p25`, `p50`, `p75`, `p90` | the two monthly token bands, the two cohort bands, the monthly IAT band |
| `cells` | `x_low`, `x_high`, `y_low`, `y_high`, `value` | the seasonality (hour × weekday), the three latency grids, the six density hexbins, the two P90 hexbins, the concurrency heatmap |
| `raster` | `x`, `y`, `value` (integer grid positions) | the four access rasters |
| `scatter` | `x`, `y`, `value` | the burstiness autocorrelation |
| `boxes` | `series`, `low`, `q1`, `median`, `q3`, `high`, `count` | the per-user IAT boxplot |
| `bars` | `series`, `x`, `value`; optional `panel` | the two user zooms (panels `request_share`, `token_hit`) |
| `stacked_bars` | `series`, `x`, `value` | the two monthly shares |
| `legend` | `series`, `rank` | the share legend |

A categorical axis (weekday, instance index, month) is carried as its
label or integer; a numeric axis as its value, and the card says whether
the scale is log. A `panel` column splits one answer into the panels of a
multi-panel figure.

### D3. Nine chart modules

`site/js/charts/` holds one module per kind that draws: `donut` and
`stacked_bars` (existing), `lines` (also the CDFs: a `cdf` answer is a
`lines` draw with the y axis as a share), `bands`, `cells`, `raster`,
`scatter`, `boxes` and `bars`: nine, the folder's ceiling. `lines` and
`bands` start from the agentic site's `cdf.js` and `ranges.js` (in that
repository's history), adapted. Every module takes the answer's rows, the
card's axes and the colour scale, and returns a Plot figure with a
tooltip (`Plot.tip` on the pointer) on every mark but the raster, which
is drawn with `Plot.raster` on a canvas and takes no tooltip. Axes use
the site's tick helpers; a log axis is Plot's `type: "log"` with the
paper's limits where the card gives them.

### D4. A card names its figure, kind and axes

A card in `site/js/insights/<topic>.js` keeps its copy fields and
replaces `image` and `cache` with `figure` (the answer's name), `kind`,
and `axes` (`x` and `y`: label, `log` where the paper's axis is, and
`format` for the tick labels), plus `panels` (the panel values in order
with each panel's axes) for a multi-panel figure. The two share cards
name the legend answer as their series order. The Definition control
shows the definition, a link to the plotdata file in the artifact on
GitHub and the section README link. `figure_card.js` and
`figure_sections.js` move to `js/insights/`, where they belong and where
there is room; `js/explore/` keeps the start, the tabs, the trends, the
legend and the explorer.

### D5. The data step converts plotdata to answers

`site_data/figure_answers.py` reads, for every figure of
`config/figures.json`, `data/paper/plotdata/<figure>.parquet` and writes
`site/data/all/figures/<figure>.json` as rows, plus `all/figures.json`
listing each figure's row count, as the repository test's record of what
is whole. It stops naming the first missing plotdata file and writes
nothing. No query runs: the answer is the table. `figure_images.py`,
pypdfium2, Pillow, `site/figures/`, the images' index, `readFigureIndex`
and the white figure panel are deleted.

### D6. Drawing

A topic's answers are fetched and its cards drawn when the topic is
first shown, as today; a card shows the loading mark until its answer
arrives and its error in its place when the answer cannot be fetched. A
card's chart is drawn at the card's width. Series colours come from the
theme: the three highlighted models (DeepSeek V3.2, DeepSeek R1, MiniMax
M2.5) and "Global" get fixed entries in `shared/series.js`, so they look
the same on every card; other series take the palette in the answer's
order. Legends with more than one series toggle, as the Overview's do. A
raster with more hours or rows than its plot has pixels is drawn pooled,
each pixel the most requests among the cells it covers: drawn cell for
cell, the browser's scaling dropped most hours and users at every width,
so the picture changed with the card's width.

### D7. Tests

Python: a fixture artifact with one plotdata per kind; `figure_answers`
writes the fixture's answers and a test compares each answer with its
Parquet rows; a missing plotdata stops the step. Node: every card's
`kind` is one of the nine and its shipped answer has the kind's columns
(read from `site/data`); every chart module draws its fixture rows; the
word-count test unchanged. Snapshot: each card's unit is the chart's
name, its panels' titles, its colour legend's title and ticks and its
axes' ticks and titles, with its legend's series in a unit of their own,
instead of the image's source and size; each state also fails when the
page requested another topic's answers. The spec's scenarios of a card's
chart (a tooltip, a log axis, a raster, a series hidden in a CDF card) are
node tests over the shipped answers. The repository test checks `all/figures.json` against the
tracked answers and, when `ARTIFACT` is set, every answer against a
rebuild. The deploy workflow fetches one figure answer instead of a PNG.

## Measurements to record when the data is first built

The answers' total size and the largest answer (expected under 3 MB and
under 1 MB), the plotdata files' total size in the artifact, the time of
`make data`, and the time to draw the Users and models topic, the one
with the rasters.

### Measured

`make data` against the artifact's commit `ae12362`, which holds a
plot-ready table for each of the 48 figures (its next commit, `3871e3b`,
gives the same bytes):

- **Figure answers:** 48 files under `site/data/all/figures/`, 3,554,319
  bytes in all (3.4 MiB), with `figures.json`. The five largest:
  `fig_lb_concurrency` 1,391,803 bytes (23,088 cells),
  `fig_model_heatmap_fixedxy_scatter_colored_metrics` 449,375 (6,232
  points), `fig_model_raster_qwen3_next_80b` 176,846,
  `fig_model_raster_gpt_oss_20b` 142,933 and `fig_iat_pair_ttl_coverage`
  136,663. Both expectations above are exceeded: the total by about half
  a megabyte and the largest answer, the concurrency heatmap rather than
  the Qwen raster, by about 0.4 MB. Every answer is far below the 25 MiB
  a static asset may be, and a topic fetches only its own answers.
- **Plotdata in the artifact:** 48 Parquet files, 610,376 bytes.
- **`make data`:** 4.3 s of wall time, the same on two rebuilds, figure
  images included.


### Measured: the Users and models topic's draw

With the topic's final cards (six density grids on a log colour scale, four
rasters, the scatter of 6,232 points), served locally by `python3 -m
http.server`, in Playwright's headless Chromium at 1280 px: the page opened
at the Workload overview and drawn, then the time from the click on the
Users and models tab to every one of its ten cards holding its named chart
SVG, each run in a new browser context, so the topic's ten answers are
fetched every time: 775, 824, 892, 819 and 824 ms over five runs, a median
of 824 ms, under the two seconds the task allows. Nothing is cached or
precomputed for it.

### Measured: the change complete

On the site's last commit of the change, against the artifact's commit
`bb2cb3d`, whose plot-ready tables are `3871e3b`'s:

- **Figure answers:** 48 files under `site/data/all/figures/`, 3,554,319
  bytes in all (3.4 MiB), unchanged since first built; the largest
  `fig_lb_concurrency`, 1,391,803 bytes, then
  `fig_model_heatmap_fixedxy_scatter_colored_metrics`, 449,375. A rebuild
  writes the same bytes.
- **`make data`:** 1.5 to 1.6 s of wall time over three runs (1.60, 1.52,
  1.52 s), the query answers and the figure answers; the 4.3 s above
  rendered the 48 figure images too, which the step no longer does.
- **The Users and models topic's draw:** 824 ms (median of five) when its
  cards were finished; after the rasters were pooled to the plot's pixels
  (each pixel the most requests among the hours and rows it covers, so no
  hour vanishes between two pixels), 527 to 559 ms over five runs, a median
  of 555 ms, measured as above.
- **`site/`:** 19,534,370 bytes as git tracks it, against 26,826,615 bytes
  before the images went (the commit `626d358`, whose 49 files under
  `site/figures/`, 48 PNGs and their index, held 7,333,800 bytes): 7.3 MB
  less, the figure answers having been added before. The largest file is
  still the daily by-family answer, 3,376,522 bytes.

### Measured: the artifact's plotdata

At the artifact's commit `3871e3b` (the documentation commit that follows
adds no plotdata):

- **Files:** 48 Parquet files under `data/paper/plotdata/`, 610,376 bytes in
  all (596 KiB), plus the folder's README. All are tracked and each is under
  1 MB.
- **The five largest:** `fig_model_heatmap_fixedxy_scatter_colored_metrics`
  180,017 bytes, `fig_lb_concurrency` 47,188, `fig_iat_pair_ttl_coverage`
  39,723, `fig_model_raster_qwen3_next_80b` 25,226 and
  `fig_model_raster_gpt_oss_20b` 23,572.
- **From the committed query caches only:** the 5 of Workload overview, the 8 of
  Token shape and latency, figures 1 to 5 of Workload evolution, figures 1 to 6
  of Prefix caching, figures 1, 2, 4, 9 and 10 of Users and models, and the
  three simulation figures (from `data/caching/results.txt` and
  `data/routing/figure20_sweep.csv`).
- **From local-only tables (not shipped):** `fig_user_release_cohort_input_band`
  and `fig_user_release_cohort_output_band` (`user_cohort_token_medians`);
  `fig_iat_pair_ttl_coverage` (`iat_per_user_model_pair`, about 700 MB); all
  eight Load balancing figures (the instance-minute and per-request query
  results of the DeepSeek models), `fig_lb_user_zoom_top` and
  `fig_lb_user_zoom_min` also from one small trace query each;
  `fig_user_median_input_output_heatmap` (`user_median_input_output`), the four
  rasters (`fig_user_raster_periodic`, `fig_user_raster_explore`,
  `fig_model_raster_qwen3_next_80b`, `fig_model_raster_gpt_oss_20b`; the
  `user_usage_rasters/` tables and the two top-200 tables). The trace itself
  is queried directly only by the two user zooms.
