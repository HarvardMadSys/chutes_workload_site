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
tiles and the bars through one `requestAnimationFrame`, so a drag draws
at most once a frame; the `change` event (release) writes the URL. The
period buttons stay as presets: a press sets both sliders to its
quarter's days within the trace (Q2 '25 is April 11 to June 30, 2025),
All to the whole trace, and a button shows pressed when the range equals
its days. The default, the whole trace, writes no key; a `from` or `to`
outside the trace's days is clipped to them; a `from` after its `to` is
ignored with it, and the URL is rewritten as the choice is read, as a
model without its family is today.

Alternatives: a brush drawn on the bars' SVG (Plot has no brush; a
hand-written one is pointer arithmetic and not keyboard-reachable); one
two-thumbed slider (two overlapped inputs with pointer tricks, which the
rules call clever). Two labelled sliders are plain, accessible and
styled by the browser.

### D2. The metric is a drop-down

`metric` chooses `requests` (the default, no key), `input_tokens` or
`output_tokens`; the bars stack the column's sum per day and series. The
chart's title, caption, tooltip label and tick format follow (
"Input tokens per day", "Input tokens: 1.2B", `formatCountTick`). A token
sum is over the requests that record it, which the caption says. The
tiles do not change with the metric. The average TTFT is not a metric:
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
thread:

| | |
|---|---|
| Query, count and write | 129 s (`make tables`: 2 min 55 s) |
| Peak memory | 744 GB (DuckDB holds the query's `requests` step whole) |
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
the site's database over the artifact as `make data` does (so
`chute_models`, `model_families` and `family_models` are the same
tables the answers use), adds the trace as the view `trace` through
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
per week, family and endpoint group for each metric and compares them
with the daily rollup's `input_counted`, `output_counted` and
`ttft_counted` summed over the week's days; a model placed in another
family by either rule fails it. The fixture trace makes the same check
over a few rows without the artifact.

### D6. The histogram answers

Two queries under `queries/explore/`:

- `histograms_by_family`: one row per trace week, family, endpoint
  group and metric, with `week`, the week's `first_day` (the calendar
  day of trace day `7 · week`, through `trace_calendar`), `family`,
  `family_slug` (as `daily_by_family` makes it), `endpoint_group`,
  `metric`, and two lists in bin order, `bins` and `requests`, the
  rollup's kept models and the family's rest summed together.
- `histograms_by_model` (`$family`): the same per week, `chute_id` and
  `model` (one of the family's eight by `family_models`, or "Other
  <family>" with a null id, as `daily_by_model` names it) and endpoint
  group, one file per family.

Lists rather than a row per bin: the same information in a fifth of the
bytes. Measured on the spike's table: the by-family answer is 5,024
rows and 2.2 MB (547 KB gzipped); DeepSeek's, the largest family's,
2,997 rows and 1.4 MB (342 KB gzipped). The daily answers are 3.4 MB
and 2.4 MB (466 KB and 288 KB gzipped). The task records the sizes
`make data` writes.

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
to two figures after "≈". A series with no request in the range has no
line and no percentile. The three cards are a grid under the sliders,
inside the wide card: "Input tokens", "Output tokens" and "Time to first
token", each a figure of the card pattern (`renderFigure`: title,
caption, definition, rows) with the caption naming the weeks' days, as
"Apr 11 to Jun 29, 2025, the trace weeks holding a chosen day".

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
page. Task 5 repeats the measurement on the finished page: the bars'
time must not be later, and the histogram answer must appear in the
log after the bars have drawn.

### D9. The explorer's own folder

`js/explore/` holds seven modules and the rules allow nine; the explorer
grows by two. The explorer's modules move to `js/traffic/`: `traffic.js`
(the section), `traffic_filter.js`, `traffic_controls.js`,
`traffic_range.js` (the sliders) and `traffic_distributions.js`. The
page module imports `runTraffic` from there; `js/explore/` keeps the
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
four charts in `#traffic`.

## Alternatives not taken

- **Prefetching every family's answers** after the first paint: 12 MB
  more on a phone for a family the visitor may never choose.
- **A share toggle and a rolling average** on the bars: more controls;
  not asked for.
- **Hit ratio and users per day**: a later change; they would ride the
  same trace pass.
