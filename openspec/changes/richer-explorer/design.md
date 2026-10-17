# Design: A richer Traffic Explorer

## The engineering rules

Binding, as `openspec/config.yaml` and the `site` spec state them: simple,
readable and maintainable first; no optimisation without a recorded
measurement; plain HTML, CSS and ES modules; names that are words; a
function at most 50 lines, a module at most 300, a folder at most nine
modules; SQL as one literal per `.sql` file with values bound at the
edge; every module tested and `make test` green at every commit. The
artifact repository owns every definition the site draws from it and is
not changed; the one definition this change adds, the weekly histogram,
lives in this repository, in one query.

## Decisions

### D1. The day range is two native sliders

The choice gains `from` and `to`, calendar days, and loses `period`. Two
`<input type="range">`, From and To, sit under the bars inside the wide
card, each over the trace's days by index (0 to the last day), each
writing its day beside it. A slider moved past the other pushes the
other along, so From is never after To. The `input` event redraws the
tiles, the bars and the distribution cards (from the histogram rows in
hand) through one `requestAnimationFrame`, so a drag draws at most once
a frame; the `change` event (release) writes the URL. The period
buttons stay as presets: a press sets both sliders to its quarter's
days within the trace (Q2 '25 is April 11 to June 30, 2025), All to the
whole trace, and a button shows pressed when the range equals its days.
The day range's rules live with the sliders, in `traffic_range.js`
(`clippedRange`, `periodRange`, `pressedPeriod`), which the filter
imports. The default, the whole trace, writes no key, and a day at the
trace's end on its side writes none either (Q2 '25 writes only
`to=2025-06-30`). A `from` or `to` outside the trace's days is clamped
to the nearer end (`from=2027-01-01` gives the trace's last day,
`to=2024-01-01` its first), and a day within the trace that has no row
to the nearest trace day inside the range; a `from` after its `to`,
once clamped, is ignored with it; and the URL is rewritten as the
choice is read, as a model without its family is.

The bars' x axis names months: it is ticked at each first of a month in
the range, at the range's first day when that falls in its month's
first half (`LAST_NAMED_FIRST_DAY`, the 15th; later, its label would
crowd the next month's), and at the range's first day alone when
neither gives a tick (a short range late in a month); on a plot
narrower than 400 px, more than seven ticks are thinned to every other
one, so the whole trace on a phone names every second month.

Alternatives: a brush drawn on the bars' SVG (Plot has no brush; a
hand-written one is pointer arithmetic and not keyboard-reachable); one
two-thumbed slider (two overlapped inputs with pointer tricks, which the
rules call clever). Two labelled sliders are plain, accessible and
styled by the browser.

### D2. The metric is a drop-down

`metric` chooses `requests` (the default, no key), `input_tokens` or
`output_tokens`; the bars stack the column's sum per day and series. The
chart's title, caption and tooltip label follow (`METRIC_WORDS` of
`traffic_bars.js`: "Input tokens per day", "Input tokens: 1,234"); the
counts are written by `formatCount` and ticked by `formatCountTick` for
every metric. A token sum is over the requests that record it, which
the caption says. The tiles do not change with the metric. The average TTFT is not a metric:
it is not a sum, so it cannot stack.

### D3. The weekly histogram table, built once from the trace

`tables/weekly_histograms.parquet`, one row per trace week, family,
kept model, endpoint group, metric and bin, with the requests in the
bin. A trace week is seven trace days, the first from the trace's first
day; week 52 holds the last three days. A bin is a quarter-doubling:
`floor(4 · log2(v))`, a token count at or below 1 in bin 0 (so the
requests with no output tokens are counted as "at most 1"), a TTFT only
where positive, as the daily rollup counts it. Four bins per doubling
put a percentile read from a bin within 2^(1/8), about 9%, of the true
one; the CDF at a bin's upper edge is exact.

Measured by `make tables` over the released trace (6,122,413,756 rows,
the 91 GB Parquet file) on this machine with DuckDB 1.5.6, on every
thread (344). The query reads the trace once: one projection gives each
request its three bins and UNPIVOT makes a row per metric. A first form,
three UNION ALL branches over a shared step, gave the same bytes but
DuckDB held that step's rows whole (129 to 130 s, 744 to 751 GB peak;
`AS NOT MATERIALIZED` changed nothing, and under a 32 GB memory limit it
spilled and failed). The adopted UNPIVOT form:

| | |
|---|---|
| Query, count and write | 30 s (`make tables`: 31 s) |
| Peak memory | 16 GB resident (16 GB under a 32 GB limit, no spill) |
| Rows | 676,243 |
| Weeks, families, kept models | 53, 11, 71 |
| Parquet | 1.8 MB (1,810,956 bytes) |
| Bins | input 0 to 106, output 0 to 91, TTFT −40 to 47 |

The table is tracked: 1.8 MB, rebuilt only when the family table, the
rollup's kept models or the query change. A sidecar
`tables/weekly_histograms.json` records the query's hash, the trace's
rows and the table's rows, and `make test` compares the hash with the
query's text, as `all/queries.json` does for the answers.

Alternatives: daily histograms, seven times the rows and the answers;
two bins per doubling, half the size but a percentile within 19%;
percentiles per week, exact but not combinable over a range; a table
per family (no smaller in all).

### D4. Where the table is built

`python -m site_data.tables --trace <parquet> --artifact <dir> --out
tables` and `make tables TRACE=<path> ARTIFACT=<dir>`. The builder opens
its own connection over the artifact and registers the site's seven
tables through the code `make data` uses, `register_tables` of
`site_database.py` (so `chute_models`, `model_families` and
`family_models` are the same tables the answers use); the trace table
is not among them, since it is what the builder makes, and `make data`
registers it as the eighth (`open_database(frames, weekly_histograms)`,
the table loaded by `load_trace_table`, not a field of the artifact's
frames). It adds the trace as the view `trace` through
DuckDB's Python API (`connection.read_parquet(path).create_view("trace")`:
no path is written into SQL), runs `queries/trace/weekly_histograms.sql`
on every thread (the one-thread rule is for the answers' float sums; the
histogram's sums are integers and the same on any thread count), and
writes the Parquet file sorted by every key column, so a rebuild writes
the same bytes. `TRACE` has no default: the file is 91 GB and lives
where the maintainer put it.

### D5. The family rule, applied twice and checked

The trace rows carry a chute id and no family. The query joins
`chute_models` and `model_families` as the artifact's rollup query does,
the first pattern (lowest `match_order`) a name contains, case
insensitively, and `Other` for a match of none or no name, and keeps the
chute id for the eight of `family_models` (rank at most 8), as the
rollup keeps it. The rule now has two homes, the artifact's and this
query. The check: with `ARTIFACT` set, a test sums the table's requests
per week, family, kept model (or the family's rest) and endpoint group
for each metric and compares them with the daily rollup's
`input_counted`, `output_counted` and `ttft_counted` summed over the
week's days; a model placed in another family by either rule fails it.
The fixture trace makes the same check over a few rows without the
artifact, and a test over the tracked answers alone checks that the
by-family histogram answer's requests per family and metric equal
`daily_by_family`'s counted requests.

### D6. The histogram answers

Two queries under `queries/explore/`:

- `histograms_by_family`: one row per trace week, family, endpoint
  group and metric, with `week`, the week's `first_day` (the calendar
  day of trace day `7 · week`, through `trace_calendar`), `family`,
  `endpoint_group`, `metric`, and two lists in bin order, `bins` and
  `requests`, the rollup's kept models and the family's rest summed
  together. No slug: the page has each family's from `daily_by_family`.
- `histograms_by_model` (`$family`): the same per week, `chute_id` and
  `model` (one of the family's eight by `family_models`, or "Other
  <family>" with a null id, as `daily_by_model` names it) and endpoint
  group, one file per family.

Lists rather than a row per bin: the same information in a fifth of the
bytes. As `make data` writes them from the tracked trace table: the
by-family answer is 5,024 rows and 2,366,346 bytes (550,569 gzipped,
`gzip -9`); DeepSeek's, the largest family's, 2,997 rows and 1,622,233
bytes (341,740 gzipped); the smallest, MiniMax's, 278 rows and 119,330
bytes (20,802 gzipped); the eleven family files 7,919,361 bytes
together. The daily answers they sit beside are 3,376,522 and
2,363,500 bytes (456,209 and 283,429 gzipped).

### D7. CDFs and percentiles in the browser

`traffic_distributions.js` takes the rows of the choice's histogram
answer, keeps the rows of the chosen model, endpoint group and of the
weeks that hold a chosen day (a week whose `first_day` is at most `to`
and whose last day, `first_day` plus six, is at least `from`), and folds
them, per metric and series (family, model or endpoint group, as the
bars' series are, the family's other models into the models' "Other"),
into one Map from bin to requests. From the map, in bin order: the CDF
rows `{ series, x, cdf }` with `x` the bin's upper edge, `2^((bin+1)/4)`,
and `cdf` the running share, drawn by the `lines` kind with `cdf: true`
on a log x axis, the series' colours those of the bars' legend; and the
p50 and p90, the geometric middle `2^((bin+0.5)/4)` of the bin in which
the running share first reaches the percentile, written as `formatSignificant`
to two figures after "≈" (a TTFT by `formatSignificantSeconds`, "≈0.84
s"). A series with no request in the range has no line and no
percentile, and a line is drawn only for a series the bars' legend
lists, so every line can be hidden as the bars are. The three cards are
a grid under the sliders, inside the wide card
(`traffic_distribution_cards.js`): "Input tokens", "Output tokens" and
"Time to first token", each a figure of the card pattern
(`renderFigure`: title, caption, definition, rows), the caption naming
the days the weeks span, which follow from the range alone
(`coveredDays`), as "Over October 31 – December 4, 2025, the trace
weeks holding a chosen day." for November 3 to 30. A card's x axis is
ticked at no more than four powers of ten (`logAxisTicks` with a
maximum), a TTFT tick written "10 ms", "1 s", "100 s"; a card none of
whose chosen requests records its value shows a note in its chart's
place.

### D8. The bars never wait for the distributions

The page's first fetches are unchanged: the totals, the two mixes, the
daily by-family answer and the shown topic's figures. The histogram
answer of a choice is requested only after `drawBars` of that choice
has resolved; a family's histogram answer the first time the family's
bars have drawn, kept for the visit as the daily answers are. The
distribution cards and the percentile notes show the loading state
until then, and an error in their own place. A change of choice while a
histogram answer is on its way draws the newer choice when it lands,
and a stale answer is not drawn (the choice drawn is compared, as
`traffic_controls.js` compares the family chosen).

Measured before the change, the page served by Python's file server
(no compression) and opened in headless Chromium at 1280 px:

| | Local | 10 Mbit/s, 50 ms |
|---|---|---|
| Stats strip and tiles drawn | 0.66 s | 0.99 s |
| Bars drawn | 1.26 s | 4.11 s |
| Shown topic drawn | 1.27 s | 4.13 s |
| Fetched | 104 requests, 4.58 MB | the same |

The by-family daily answer is 3.38 MB of the 4.58 MB; Cloudflare serves
it gzipped at 466 KB, so the throttled figure overstates the published
page.

Measured after the change, on the finished page. The script above
waited for the parts one after the other, so a part's time could not be
earlier than the one before it; a second script times each part in the
page (`performance.now()` from the navigation's start, the first
animation frame it is drawn in) and records, by a wrapped `fetch`,
whether the bars were drawn when each answer was requested. The first
was run on this page, the second on this page and on the page before
the change (`5df9edf`), three times each:

| | Before | After |
|---|---|---|
| Bars drawn, local (the first script) | 1.26 s | 1.07 to 1.11 s |
| Bars drawn, throttled (the first script) | 4.11 s | 4.03 to 4.15 s |
| Bars drawn, local (timed in the page) | 0.88 to 1.25 s | 1.06 to 1.26 s |
| Bars drawn, throttled (timed in the page) | 4.08 to 4.13 s | 4.13 to 4.16 s |
| Distribution cards drawn, local / throttled | — | 1.33 to 1.39 s / 6.28 to 6.30 s |
| Fetched | 104 requests, 4.58 MB | 110 requests, 6.99 MB |

The bars are drawn no later: every difference is within a run's spread
and under 0.2 s, which is noise. The six more requests are the
histogram answer by family (2.37 MB) and the five new modules. In every
run the explorer requested `daily_by_family.json` first (0.4 to 0.5 s
local, 0.8 s throttled, the bars not drawn), then
`histograms_by_family.json` (1.06 to 1.24 s local, 4.13 to 4.16 s throttled), the
bars already drawn. Timed in the page, the shown topic is drawn at
1.9 s throttled, before the bars, which the first script's order could
not show.

### D9. The explorer's own folder

`js/explore/` holds seven modules and the rules allow nine; the explorer
grows by two. The explorer's modules move to `js/traffic/`, eight of them as built
(the 300-line limit split two more off): `traffic.js` (the section and
its flow), `traffic_filter.js` (the choice, its URL keys and the daily
sums), `traffic_controls.js` (the drop-downs and the period buttons),
`traffic_range.js` (the sliders and the day range's rules),
`traffic_tiles.js` (the four tiles and their percentile notes),
`traffic_bars.js` (the bars, their words and their month ticks),
`traffic_distributions.js` (the bin maps, CDF rows and percentiles) and
`traffic_distribution_cards.js` (the three cards). The page module
imports `runTraffic` from there; `js/explore/` keeps the
page's start, the legend, the topic tabs and the topics' list. The move
is its own task and its own commit, with no other change, so its diff
is a rename.

### D10. Tests

Python: the trace query over a fixture trace (`fixture_artifact.py`
gains `trace.parquet`, a few rows per family, endpoint group and week
whose counts add up to the fixture rollup's counted requests) returns
its columns and the expected bins; the builder writes the table and the
sidecar and stops naming a missing trace; the sidecar's hash check; with
`ARTIFACT`, the consistency check of D5 on the tracked table; the two
histogram queries' columns; the histogram answers' sums (the site spec's
scenario). Node: `readTrafficChoice` with `from`, `to`, `metric`,
clipping and a reversed pair; `periodRange`; `rowsInChoice` over a
range; `dailyValues` of each metric; the sliders' push rule and their
day texts; the fold of histogram rows into bin maps, the CDF rows'
edges and shares (the last 1), the percentiles of a one-bin and a
two-bin distribution; the loading order (the histogram answer is read
after the bars' draw resolves, in a fake page). Snapshots: the
explorer's units gain the metric and the sliders' texts, the three
distribution charts' axes and the tiles' notes; `CHART_COUNTS` counts
four charts in `#traffic`. As built, the node tests sit one file per
module (`traffic_range`, `traffic_tiles`, `traffic_bars`,
`traffic_distributions`, `traffic_distribution_cards`), the period
buttons' in `traffic_period_buttons.test.js` and the legend that other
charts follow in `explore_legend_shared.test.js`; the explorer's
snapshot units in `tests/snapshot_traffic.py`; the model-to-family
histogram test sums bin by bin; and `tests/test_built_data.py` checks
the tracked histogram answer by family against the tracked daily one.

## Alternatives not taken

- **Prefetching every family's answers** after the first paint: 12 MB
  more on a phone for a family the visitor may never choose.
- **A share toggle and a rolling average** on the bars: more controls;
  not asked for.
- **Hit ratio and users per day**: a later change; they would ride the
  same trace pass.
