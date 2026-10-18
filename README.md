# Chutes Production Trace, visualized

A static website for the Chutes production trace, the dataset of the paper
*A Year in LLM Serving: Workload Evolution, Caching and Load-Balancing*: a
year of LLM serving on Chutes, request by request. The site shows the
trace's totals, its family and endpoint mixes, a Traffic
Explorer of requests and tokens per day over any range of days, with the
distributions of the chosen requests, and the paper's figures in six
topics, drawn from their plot-ready tables.

The site is one HTML page, ES modules, a stylesheet, the JSON answers of
seven queries (the two that take a family are answered once per family,
one file per family) and of the paper's 48 plot-ready tables, with
Observable Plot drawing every chart in the browser. There is no
server code, no bundler and no database in the browser. The site's own
words (the page, a section, a topic, a card, a breakdown and the rest)
are defined in the Words section of `CONTRIBUTING.md`.

## What the site shows

The page, `index.html`, holds, in order:

- **The hero and the stats strip.** The title, a lede that counts the
  trace's months, and buttons to the Traffic Explorer, the Insights, the
  dataset, the paper and the code, the last three each with the mark of
  where it leads before its text (Hugging Face's, a document's, GitHub's),
  as the footer's links off the site have; beside them the trace's
  totals: months, requests, input and output tokens, user ids, models and
  serving instances, and its first and last day.
- **Overview** (`#overview`). Two donuts, the family mix (the model
  families of the artifact's family table and Other, in the Traffic
  Explorer's family colours) and the endpoint mix (chat, chat stream,
  completion, completion stream, other). A legend's button hides or shows
  a slice.
- **Traffic Explorer** (`#traffic`). A family drop-down (the model
  families by their requests, and Other), a model drop-down (once a family
  is chosen: its eight most requested named models and, where it has any,
  its other models, "Other DeepSeek", or "Rest of Other" in the family
  Other), an endpoint drop-down, a metric drop-down (requests, input
  tokens or output tokens) and period buttons (All and the calendar
  quarters Q2 '25 to Q1 '26), each a preset of the day range. Under them
  one card holds, from the top:
  - four tiles that follow the choice, numbers only: requests, average
    input tokens, average output tokens, and average time to first token
    with the share of requests that record it; once the distributions
    have arrived, each average has its p50 and p90 under it, read from the
    distributions' bins and so written after "≈" (within about 9%);
  - the chosen metric per day as stacked bars, by family, by model once a
    family is chosen and by endpoint group once a model is, under one
    legend whose buttons hide a series in the bars and the three
    distribution charts alike;
  - one slider over the trace's days with two handles, From and To, which
    set the day range (one pushed past the other moves it along), the
    chosen first and last day written under the track's left and right
    ends; the tiles, the bars and the distribution charts follow as a
    handle moves;
  - a row of three charts, Input tokens, Output tokens and Time to first
    token, three abreast at desktop width and one under the other on a
    narrow screen: each the chosen requests' distribution of its value, a
    CDF per series of the bars whose requests record the value, over the
    trace weeks that hold a chosen day, on a log axis fixed for every
    choice (1 to 1M input tokens, 1 to 100k output tokens, 10 ms to
    100 s), a line whose values run past the axis's right end cut at the
    chart's edge.

  The section spans the window less the page's gutters; every other
  section is laid out at the page's width, centred.

  The choice is kept in the URL as `family`, `model`, `endpoint`,
  `metric`, `from` and `to`
  (`?family=deepseek&metric=input_tokens&from=2025-07-01&to=2025-09-30#traffic`),
  so a view can be shared as a link, and Back and Forward show the choice
  of the entry they return to; the default, everything, requests over the
  whole trace, writes no key, and a range that starts on the trace's first
  day or ends on its last writes no `from` or no `to`.
- **Insights** (`#insights`). The paper's figures in six topics that follow
  its sections, one shown at a time behind a row of tabs, the shown topic
  in the URL's hash: The workload at a glance (`#insights-overview`),
  Request shape and latency (`#insights-tokens`), Users and models
  (`#insights-users`), A year of change (`#insights-evolution`), Prefix
  caching (`#insights-caching`) and Load balancing
  (`#insights-balancing`). A topic opens with its takeaway, the paper's
  finding for its section in plain words, and holds its cards in groups,
  each a run of the paper's figures under a heading and a plain takeaway
  of what they show together and, where the paper draws one, what that
  means for a serving system.
  Each of the 47 cards draws one of the paper's figures in the browser
  from its plot-ready table, with the paper's axes, log scales and limits
  (but the per-user inter-arrival band card, on a linear axis to 400 s
  that clips its bands, where the paper's is logarithmic), in the
  page's colours, light or dark: a title, an insight, the chart, as wide
  as its card, and a caption; a tooltip with the values under the pointer
  (on the two eviction-algorithm cards, every algorithm's at the hovered
  cache size), but on the four rasters, which are drawn as one image each,
  their rows ticked at their centres and parted by thin rules; and, where
  it has more than one series, a legend whose buttons hide and show them.
  A bands card shows in the legend's place a key to its two bands and its
  median. The routing simulation draws its eight panels as two rows of
  four, one row per model, and its legend has a button per policy, which
  hides that policy in both rows. The daily and hourly cards count days
  from the trace's first, their tooltips writing each day's date; the
  monthly cards name a month as the trace months below are named.
  Behind a Definition control is its definition, and nothing else. The
  two monthly share cards take their series' order from the paper's shared
  legend, the 48th table.
- **Cite** (`#cite`) and **Team**: the paper's citation as BibTeX with a
  copy button, and the lab, its collaborators and the paper's authors.

## Where the numbers come from

Every number is read from the paper's artifact repository
([HarvardMadSys/chutes_workload](https://github.com/HarvardMadSys/chutes_workload)),
but for one table: the Traffic Explorer's distributions come from the
released trace, which `make tables` reads once to build the site's trace
table. `make data` reads the artifact's committed query caches and
plot-ready tables and the trace table, and writes the site's data ahead
of time; the browser runs no query, it fetches the answers and draws them.

- **The answers** come from three caches under the artifact's
  `data/paper/cache/`, its model names, `data/paper/chute_models.csv`, its
  family table, `data/paper/model_families.csv`, and the site's trace
  table, `tables/weekly_histograms.parquet`. `make data` holds each cache
  as a DuckDB table of its name, the model names as `chute_models`, the
  family table as `model_families` and the trace table as
  `weekly_histograms`, adds three tables derived from them, nine tables in
  all, and runs each query of `site/queries/explore/` once, writing its
  rows to `site/data/all/explore/<query>.json`; the two queries that take
  a family, `daily_by_model` and `histograms_by_model`, it runs once per
  family of the `family_mix` answer, in its order, writing one file per
  family, `site/data/all/explore/<query>/<family slug>.json` (`deepseek.json`,
  `gpt-oss.json`, …, `other.json`):

  | Cache | What it holds | The answers drawn from it |
  |---|---|---|
  | `trace_totals` | one row: the first and last request, requests, input and output tokens, user ids, models, instances | `trace_totals`: the stats strip, and the months the hero and the footer count |
  | `daily_rollup` | one row per trace day, family, model (each of the family's eight most requested named models, the family's rest together) and endpoint group: requests, token sums, the TTFT sum, and how many requests recorded each | `daily_by_family` and `daily_by_model`: the Traffic Explorer; `family_mix`: the Overview's family mix |
  | `function_name_daily_requests` | one row per trace day and endpoint group: requests | `endpoint_mix`: the Overview's endpoint mix |
  | `weekly_histograms`, the site's trace table | one row per trace week, family, model (as the daily rollup keeps them), endpoint group, metric and bin: the requests in the bin | `histograms_by_family` and `histograms_by_model`: the Traffic Explorer's distribution charts and its tiles' percentiles |

  The three derived tables are `trace_calendar`, each trace day's
  calendar day and each trace month's label, and `trace_weeks`, each trace
  week's first and last calendar day (both `site_data/months.py`); and
  `family_models`,
  the daily rollup's named models ranked within their family
  (`site/queries/setup/family_models.sql`), from which a family's answer
  takes its eight.
- **The trace table**, `tables/weekly_histograms.parquet`, is the one
  thing the site builds from the released trace, the dataset's 91 GB
  Parquet file of 6.1 billion requests: `make tables` runs the one query
  of `site/queries/trace/`, `weekly_histograms.sql`, over it and tracks
  the result, 1.8 MB. A row is a trace week (seven trace days, counted
  from the trace's first day), a family, a model (one of the family's
  eight most requested named models, or the family's other models
  together, as the daily rollup keeps them), an endpoint group, a metric
  (`input_tokens`, `output_tokens` or `ttft`) and a bin, with the
  requests in it. A bin is a quarter of a doubling: a value `v` is in bin
  `floor(4 · log2(v))`, a token count of at most 1 in bin 0, and a TTFT is
  binned only where it is positive, as the rollup counts it. The query
  takes the week's epoch and length as two parameters, bound by name
  (Trace months, below). Its sidecar,
  `tables/weekly_histograms.json`, holds the query's hash and the trace's
  and the table's row counts.
- **The histogram answers.** `histograms_by_family` holds one row per
  trace week, family, endpoint group and metric: the calendar days of the
  week's first and last trace day (`first_day`, `last_day`, from
  `trace_weeks`) and two lists in bin order, the bins and the requests in
  each, a family's models summed together. A family's
  `histograms_by_model` holds the same per week, model (as
  `daily_by_model` names it) and endpoint group.
- **Model families.** The artifact's `data/paper/model_families.csv` is
  the one home of the family rule: a named model belongs to the family of
  the first pattern (by `match_order`) its name contains, case-insensitively,
  and every other model is in Other. The artifact applies the rule when it
  writes the daily rollup, which carries each row's family; the site's
  answers never match a name against a pattern. The `family_mix` answer is
  the families' one home: their names, their slugs and their order, most
  requested first and Other last. The data step answers the family queries
  for its families, and the page lists them in its order, in the donut and
  the explorer's family drop-down alike. `daily_by_family` carries the same
  slug, which nothing reads. The one query that does match a name is the
  trace query, since the trace's rows carry no family: it applies the same rule, and
  `make test`, given the artifact's checkout, checks that the trace table's
  requests per week, family, model and endpoint group equal the daily
  rollup's counted requests, so the two applications agree.
- **Trace months.** The caches count days from the trace's first request,
  written as 1970-01-01, so a cache's month is a month-long stretch of
  days from the trace's first day, not a calendar month. The site turns
  each trace day into its calendar day from the trace's start,
  2025-04-11, one constant in `site_data/months.py`, for the daily
  answers; the browser holds the same day, `TRACE_FIRST_DAY` of
  `site/js/shared/format.js`, for its dated tooltips, tested against
  `trace_totals`. The hero and the footer count the thirteen trace months
  from `trace_totals`. The Insights' monthly cards name a trace month by
  the calendar month its first day falls in, "Apr '25" to "Apr '26", and
  star the thirteenth, "Apr '26*", since it holds only the trace's last
  two days, as each such card's definition says
  (`site/js/insights/figure_card.js`). A trace week is seven trace days,
  week 0 the trace's first seven; the last holds three. `site_data/months.py`
  is the week's one home: `TRACE_EPOCH`, the trace's first day as the
  caches write it, and `DAYS_PER_TRACE_WEEK`. The trace query takes the
  two as `$trace_epoch` and `$days_per_trace_week`, bound by name
  (`TRACE_QUERY_PARAMETERS` of `site_data/tables.py`), so no query
  restates them; `trace_weeks` gives the histogram answers each week's
  first and last calendar day, so the browser computes no week's dates.
- **The Traffic Explorer** filters and sums the `daily_by_family` answer,
  and a family's `daily_by_model` answer once the family is chosen, in
  the browser. The first holds one row per calendar day, family and
  endpoint group; a family's file one row per calendar day, model (each
  of the family's eight most requested named models, by its chute id and
  name, and its other models together, with a null chute id) and endpoint
  group; each row holds the requests, the input and output token sums, the TTFT sum,
  and how many requests recorded each. An average divides by the requests
  that record its value, not by every request. The explorer shows a
  model's name as the answer writes it, the other models as
  "Other DeepSeek", with one relabel: the family Other's, which the answer
  names "Other Other", are "Rest of Other" (`otherModelsText` of
  `site/js/traffic/traffic_choice.js`). Once the bars are drawn,
  the explorer reads the histogram answer of the choice
  (`histograms_by_family`, or the family's `histograms_by_model`), so the
  bars never wait for it, and sums the bins of the trace weeks that hold a
  chosen day, per series of the bars: a CDF's point is a bin's upper edge,
  `2^((bin + 1) / 4)`, and the share of requests at or below it; a p50 or
  p90 is the geometric middle of the bin where the running share reaches
  it. The explorer's answers come first: the page's head preloads the
  daily answer by family, so the browser starts it before the page's
  modules have loaded; the page's module starts loading the charting
  library as it runs, so the library arrives beside the answer rather
  than after it; and the Insights' opening topic reads its figure answers
  only once the explorer and the page's other sections have drawn or
  shown their errors, a tab pressed before then reading its topic's at
  once.
- **User ids.** The stats strip says "User ids", not users: the release's
  anonymous user ids rotate every quarter, so one person can hold several,
  and the strip's count of ids exceeds the paper's count of people.
- **The figure answers** are the artifact's plot-ready tables, one per
  figure its `config/figures.json` lists,
  `data/paper/plotdata/<figure>.parquet`, each written by
  `site_data/figure_answers.py` as `site/data/all/figures/<figure>.json`
  column for column, with no query, rounding or renaming, and each one's
  row count in `site/data/all/figures.json`. A table is written by the
  figure's own reproduce script in the artifact, which draws the paper's
  PDF from the same table, so the paper and the site draw the same
  numbers; but for the four rasters and the nine density and P90 grids,
  whose PDFs draw the points (a dot per request, matplotlib's hexagons)
  that the table counts in cells. Each card of the Insights draws its figure from its answer with
  the chart kind it names (`site/js/insights/figure_card.js`), the series
  of the global rows and of the three highlighted models in one colour on
  every card. A table's columns are those of its kind:

  | Kind | Columns, one row per | Figures |
  |---|---|---|
  | `lines` | `series`, `x`, `y`, and `panel` for a figure of panels: a point of a series' line | the daily and hourly lines, the TTL coverage, the two cache sweeps, the routing trade-off |
  | `cdf` | `series`, `x`, `cdf`: a value of a series and the share at or below it | the token, ratio, latency, prefill and hit-ratio distributions |
  | `bands` | `x`, `p10`, `p25`, `p50`, `p75`, `p90`: an x's median and its two percentile bands | the monthly token and IAT bands, the cohort bands |
  | `cells` | `x_low`, `x_high`, `y_low`, `y_high`, `value`: a rectangle and its value | the heatmaps and density grids, the seasonality, the occupancy |
  | `raster` | `x`, `y`, `value`: an hour of the window, a user's or a model's row, its requests | the four rasters |
  | `scatter` | `x`, `y`, `value`: a point and the value it is shaded by | the lag-1 autocorrelation |
  | `boxes` | `series`, `low`, `q1`, `median`, `q3`, `high`, `count`: a box's five statistics | the per-user IAT by model |
  | `bars` | `series`, `x`, `value`, and `panel`: a bar | the two user zooms |
  | `stacked_bars` | `series`, `x`, `value`: a segment of a bar | the two monthly shares |
  | `legend` | `series`, `rank`: a series' place in a legend | the shares' legend, drawn by no card of its own |
- **The figure cards' words** are the paper's: a card's insight the
  paper's lead-in for that figure, its caption the paper's caption, its
  definition the artifact's README's or plotting script's; a line its
  module marks "placeholder" is not the paper's own.

The queries filter, group, count and sum; none restates a definition the
artifact owns (a user, a model's name, an endpoint group, a trace month),
but the trace query, which applies the family rule and the endpoint
groups to the trace as the artifact's rollup does, and is checked
against it.
A number no cache holds is added to the artifact as a cache, in its
caching pattern, and then read here.

## Running it

The built data ships with the repository, so a clone serves the site as it
is. With Python 3.12 and Node 22:

```bash
make setup           # a virtual environment, .venv, with this package and its test tools
make setup-browser   # the headless Chromium the snapshot test opens the page in; without it that test skips, loudly
make serve           # http://localhost:8000
make test            # the Python tests, the node tests and the snapshot test
make snapshots       # rewrite tests/snapshots/ when a change is meant to alter what the page shows
npm ci               # wrangler, for make deploy and npm run check
```

`make test` passes the artifact's checkout to the Python tests as
`ARTIFACT`; the test that compares the Insights' cards with the artifact's
figure list, the one that compares the shipped data with a rebuild, and
the one that compares the trace table with the daily rollup skip where
that checkout is not there, and pytest's summary names each with its
reason (`-rs` in `pyproject.toml`). Without Chromium the snapshot test
skips and exits 0, ending the run with framed lines on standard error
that say no chart, legend or text was compared.

## Building the data

The data is built in two steps, each taking a checkout of the artifact
repository, named with `ARTIFACT=`; the default is a checkout beside this
repository, `../2027_chutes_repo_artifact`.

**The trace table** is rebuilt only when the artifact's family table or
its daily rollup's kept models change, or `site/queries/trace/weekly_histograms.sql`
or the week of `site_data/months.py` does. It also takes the released
trace's Parquet file, named with `TRACE=`, which has no default:

```bash
make tables TRACE=<the released trace's Parquet file> ARTIFACT=<the artifact's checkout>   # tables/
```

It reads the trace once, on every thread, and writes
`tables/weekly_histograms.parquet` and its sidecar; over the released
trace it takes about half a minute and 16 GB of memory on a 344-thread
machine, and a rebuild writes the same bytes. `make test` fails while
the query's text differs from the hash in the sidecar, and, given the
artifact's checkout, while the table disagrees with the daily rollup.
Commit the two files, then build the answers.

**The answers** are rebuilt when the artifact's caches or figures change,
when the trace table is rebuilt, or when a query under
`site/queries/explore/` or `site/queries/setup/` changes:

```bash
make data ARTIFACT=<the artifact's checkout>   # site/data/
make snapshots                                 # the page as the new data draws it
make test
```

`make data` checks that every file it reads is there before it writes
anything. It writes the answers (one file per query, and one file per
family for each of the two queries that take a family), `site/data/all/queries.json`
(the hash of the text of each query the answers depend on, which `make
test` compares with the queries, so that an answer older than its query
fails),
the 48 figure answers and their index, and prints each answer with its
size. A rebuild from the same artifact writes the same bytes, so git sees
only what changed. The rebuilt data and snapshots are committed with the
change that needed them.

Where an Insights card fixes an axis's domain to the paper's,
`tests/insights_cards_domains.test.js` checks that the figure answer's
values fit it. When a rebuild outgrows a domain, `make test` fails
naming the figure, the axis, the domain and the value. Widen the domain
in the card, run `make snapshots` and review the diff; or, where the
paper's axis means to cut the values off, list the clip in the test's
`INTENDED_CLIPS` with its reason.

## Deploying

The site is a Cloudflare Worker named `chutes-trace-site`, with static
assets and no code of its own: `wrangler.jsonc` points it at `site/`. Every
push to `main` runs the suite and then deploys it, through
`.github/workflows/deploy.yml` (GitHub Actions). Its job `test` installs
the Python and Node dependencies and Chromium and runs `make test
ARTIFACT=`: the three tests that need the artifact's checkout skip, saying
why, and every other test runs, the snapshot test among them. Its job
`deploy` waits for it (`needs: test`), so a red `main` is never deployed,
and runs `wrangler deploy` with two repository secrets, added under the
repository's Settings > Secrets and variables > Actions:

- `CLOUDFLARE_API_TOKEN`, a token made from the Cloudflare dashboard's
  "Edit Cloudflare Workers" template;
- `CLOUDFLARE_ACCOUNT_ID`, the account the Worker belongs to.

With the repository variable `CLOUDFLARE_ACCOUNT_SUBDOMAIN` set there too,
the workflow then asks the published site for the page (`/`), the daily
by-family answer, the histogram answer by family and one figure answer,
and fails unless each answers 200 with its content type; without it, the run shows a warning that the site was
not checked. `make deploy` publishes the same way from a machine with `npm
ci` done and the token in `CLOUDFLARE_API_TOKEN`; run `make test` first.
`npm run check` is a dry run.

Until a hostname is chosen, the Worker answers at its `workers.dev`
address. When one is chosen, list it in `wrangler.jsonc`'s `routes` (and
set `workers_dev` to false), not only in the dashboard: `wrangler deploy`
detaches any custom domain bound to the Worker that `wrangler.jsonc` does
not list, taking its DNS record with it.

Static assets allow 25 MiB per file; the largest file here is the daily
by-family answer, `site/data/all/explore/daily_by_family.json`, about
3.4 MB.
`make test` fails on a tracked file over the limit.

## Layout

The one map of the repository's folders and files; `CONTRIBUTING.md` has
the rules, how the pieces fit together and the patterns to copy.
`tests/test_readme.py` checks that every path this block names exists.

```
README.md            this file
CONTRIBUTING.md      the site's words, the rules, how the pieces fit, the patterns to copy, and how to verify a change
CLAUDE.md            a pointer to the two files above and the git rules
Makefile             setup · setup-browser · tables · data · serve · test · snapshots · deploy
pyproject.toml       Python 3.12; pyarrow and duckdb; pytest, pandas and Playwright (pinned) for the tests
package.json         sets ES modules for node --test; wrangler, the one dev dependency, deploys the site
package-lock.json    wrangler's exact version and its dependencies', which npm ci installs
.nvmrc               the Node version the deploy workflow installs
wrangler.jsonc       the Cloudflare Worker that serves site/ as static assets: its name and its hostnames
.gitignore           what git leaves out: installed and generated folders, the tools' own folders, local secrets
.github/workflows/deploy.yml
                     on every push to main, runs make test, then deploys site/ and asks the published site for four
                     files
site_data/           builds tables/ from the released trace (make tables), and site/data/ from the artifact's caches
                     and plot-ready tables and tables/ (make data)
  __init__.py        the package's summary
  __main__.py        the command make data runs: reads the artifact, writes the answers and the figure answers
  loading.py         reads the three caches, the model names, the family table and the trace table as Arrow
                     tables, and holds the trace table's file names; a missing file stops the step
  months.py          the trace's start date, its epoch and a week's length, and the calendar of its trace days, weeks
                     and months
  site_database.py   the site's database in DuckDB: the caches, model names and family table as tables, with
                     trace_calendar, trace_weeks and family_models, and the trace table as weekly_histograms
  answers.py         runs every query of site/queries/explore/, a family's query once per family, writes its
                     answers and the queries' hashes
  figure_answers.py  writes the plot-ready table of every figure the artifact lists as its answer, and their index
  answer_files.py    where the answers and figure answers go in site/data/, and the JSON form they are written in
  tables.py          the command make tables runs: the trace query over the released trace, written as the trace
                     table and its sidecar
tables/              built by make tables from the released trace, and tracked
  weekly_histograms.parquet
                     the trace table: the requests per trace week, family, model, endpoint group, metric and bin
  weekly_histograms.json
                     its sidecar: the trace query's hash, the trace's rows and the table's rows
site/                exactly the files that are deployed
  index.html         the page: header, hero, Overview, Traffic Explorer, Insights (its heading and tab row), Cite,
                     Team, footer; its head preloads the explorer's daily answer
  style.css          tokens, layout and components
  favicon.svg        the brand mark, for the browser tab
  js/page/           the page's module and its start, the Insights' topics, their tabs and the tabs' scrolling row
    main.js          the page's module: it names the page's sections, starts the charting library's load and starts
                     the page
    start.js         asks for the answers the sections share, writes each Insights topic's section with its groups
                     and cards and mounts their tabs, mounts the header and renders the footer, runs the sections,
                     then draws the shown topic, and follows Back and Forward
    topic_tabs.js    the Insights' tabs, from the topic list, one topic shown at a time, the shown one in the URL's
                     hash
    topics.js        the Insights' six topics in the order of their tabs, the one place a topic is declared; a
                     topic's number, and its cards group by group
    scrolling_row.js
                     a row that scrolls sideways, as the Insights' tabs do on a phone
  js/shared/         what the page's parts share
    answers.js       reads an answer by its query's name, a figure's among them
    libraries.js     the one module that names a library URL: Observable Plot, at a pinned version
    figure.js        a figure's layout, its chart's name for a screen reader, the loading, note and error states
    rows.js          the rows a chart or a sum is taken from: a column's total, distinct values, a panel's rows, and
                     those a log axis has a place for
    format.js        numbers and dates as the page writes them
    layout.js        the header and the footer, every address off the site, and the markup of a link to one
    link_marks.js    the marks before the text of a link off the site: Hugging Face's, a document's and GitHub's
    series.js        a chart's shown rows and its legend; the breakdowns, by model, by endpoint group and by family
    legend.js        the legend of buttons that hides and shows a series
  js/charts/         the chart kinds
    stacked_bars.js  the Traffic Explorer's bars and the two monthly share cards
    donut.js         the family and endpoint mixes
    lines.js         a line per series, a CDF among them
    bands.js         a value's median and its two percentile bands, and their key
    cells.js         a grid of rectangles shaded by their values
    raster.js        a dense grid of cells drawn as one image, as hours by users
    scatter.js       a dot per point, shaded on a scale diverging from zero
    boxes.js         a box per series from its five statistics
    bars.js          a bar per x of a panel
  js/plot/           what the chart kinds and the cards give Plot: the frame, the axes, the trace's axes
    frame.js         a chart's frame and ink, its reference rules, and its colour scales; the parameters most kinds
                     share and the draw contract every kind keeps
    axes.js          the options of an axis and their names; how many ticks an axis asks for, a log axis's powers
                     of ten, a card's axis as Plot's scale and marks, and a value as its axis writes it
    trace_axes.js    the trace's day and month axes that cards hand to the kinds, the months named and the partial
                     last starred
  js/theme/colours.js
                     the series colours as the style tokens give them, from one family order and one endpoint
                     order, the families taking ten
  js/sections/       the page's sections that have no folder of their own
    hero.js, stats.js
                     the title, lede and buttons; the stats strip of the trace's totals
    mixes.js         the Overview's family and endpoint mixes, each drawn as a donut
    cite.js, team.js
                     the citation's sentence and copy buttons; the lab and the authors
  js/traffic/        the Traffic Explorer: its section, its choice, its filter, its controls, its bars, its day range,
                     its tiles, and its distributions and their three charts
    traffic.js, traffic_controls.js
                     the Traffic Explorer: its section; its controls, kept in step with the URL
    traffic_choice.js, traffic_filter.js
                     the choice, its URL keys, its metrics with the bars' words and the drop-downs' entries; the
                     rows a choice keeps and their sums
    traffic_bars.js, traffic_range.js, traffic_tiles.js
                     the bars and their legend; the day range's slider of two handles and the period buttons' days;
                     the four tiles' texts
    traffic_distributions.js, traffic_distribution_charts.js
                     the histogram rows' bin maps, CDF rows and percentiles; the row of three distribution charts,
                     each titled in its own place, keyed by metric, on fixed axes
  js/insights/       the figure cards and their series' colours, one module per topic, and the routing card's panels
    figure_card.js   a card, its chart drawn from its answer by its kind
    card_series.js   a card's series: their order, each palette's colours, the fixed and highlighted series, the
                     count colour, the card's legend
    workload.js, tokens.js, users.js, evolution.js, caching.js, balancing.js
                     one module per topic: its id, its title, its takeaway, its groups' headings and takeaways, its
                     cards' words, kinds and charts' parameters
    routing_panels.js
                     the load-balancing topic's routing simulation card: its series and eight panels, and the
                     policies' colours and legend
  queries/           one .sql file per answer or table
    explore/         the seven queries make data answers, one answer each, daily_by_model's and
                     histograms_by_model's one per family
    setup/family_models.sql
                     the daily rollup's named models ranked within their family, held as the table family_models
    trace/weekly_histograms.sql
                     the trace query, which make tables runs over the released trace: the trace table
  data/all/          built by make data and tracked: the answers, explore/<query>.json and, for the two family
                     queries, explore/<query>/<family>.json, and queries.json; the figure answers,
                     figures/<figure>.json, and figures.json
tests/               what make test runs
  conftest.py, fixture_artifact.py, fixture_plotdata.py, repository_root.py
                     the fixture artifact (a few rows of each cache, the model names, a figure list of ten figures,
                     one per chart kind, with their plot-ready tables) and a small trace whose requests add up to
                     its daily rollup,
                     the database over it, the artifact's checkout as ARTIFACT, the tracked files, the root folder
  test_loading.py, test_months.py, test_site_database.py, test_main.py
                     the data step on the fixture artifact, against values counted by hand
  test_queries.py    every .sql file run over the fixture: its columns, the tables it reads, its numbers
  test_answers.py    every answer written for the fixture equals its query run live; a family's model answers sum to
                     its rows by family, the histograms bin by bin; an edited query is stale
  test_tables.py     the trace query over the fixture trace against histograms counted by hand, the builder and its
                     sidecar, the hash check, and with ARTIFACT the tracked trace table against the daily rollup
  test_figure_answers.py
                     every figure answer written for the fixture equals its plot-ready table; a missing table stops
                     the step
  test_built_data.py
                     the shipped data: tracked, the figure answers its index lists, every answer current, the
                     histograms by family counting each family's requests as the daily answer does, and with
                     ARTIFACT the answers, the figure answers and their index the same bytes as a rebuild
  test_figures_registry.py
                     with ARTIFACT, every figure the artifact lists is one card's, or the share cards' legend
  test_repository.py
                     the countable rules of CONTRIBUTING.md and the files git tracks
  test_naming.py     the name rules: a name is exported by one module of site/js/, and a node test file's name
                     starts with the folder of the module it tests
  test_deployment.py
                     the Worker's settings, the paths the deploy workflow checks are files of site/, and the deploy
                     waiting for the test job, which installs Chromium and then runs make test
  test_readme.py     every path this layout names exists
  snapshot.py, snapshot_units.py, snapshot_traffic.py, test_snapshot.py, test_snapshot_units.py
                     the snapshot test: the page opened at each topic its tab row lists in headless Chromium, each
                     unit it shows (a chart, a legend, a block of text; a card's chart as its name, panel titles,
                     colour legend, axis ticks and axis titles) read as text and compared with tests/snapshots/,
                     and no other topic's figure answers requested; framed lines on standard error when Chromium
                     cannot start
  snapshots/         one folder per page state, one text file per unit, rewritten by make snapshots
  *.test.js          node --test: one file per JavaScript module with pure functions, and the checks of the whole
                     page below. Each is named after the folder of the module it tests and then the module, the
                     folder written once (charts_lines.test.js for charts/lines.js, traffic.test.js for
                     traffic/traffic.js); a module's second file adds what it tests, and a check over every Insights
                     card is insights_cards_<what>.test.js. Three are named otherwise: palette_contrast,
                     module_headers, and the test of a test helper, named after it (fake_page.test.js)
  insights_cards_words.test.js
                     the word counts of every card's insight, caption and definition, of each topic's takeaway,
                     and of each group's heading and takeaway
  insights_figure_card.test.js
                     every card's kind, and its shipped answer holding that kind's columns; every card's and
                     panel's chart naming only parameters its kind lists, its axes only axis options
  insights_card_series.test.js
                     a card's series' order, the colours each palette gives them, the fixed and highlighted series,
                     and its legend
  insights_routing_panels.test.js
                     the routing policies' colours, one per policy for every model
  insights_cards_charts.test.js
                     cards drawn from their shipped answers as the spec describes them: a tooltip, a log axis, a
                     raster's rows and rules, a series hidden in a CDF card, a CDF's straight lines, the hourly lines'
                     gaps, the routing card's rows and policy legend, a bands card's key, the hit grid's all-cached
                     row, the shared colour and the day axis
  insights_cards_caching_balancing.test.js
                     the caching and balancing cards' axes, the eviction cards' tooltips listing every algorithm,
                     the occupancy's tooltip in hours and the user zooms' even split
  insights_cards_domains.test.js
                     every card's and panel's fixed axis domain holding its shipped answer's values, but the clips
                     the paper's axes intend, each listed with its reason
  plot_trace_axes.test.js
                     the trace's month axis: its names, derived from the first day, the star of the partial last
                     month explained in every definition on it, and its inset from the plot's edges
  traffic_controls_period_buttons.test.js
                     the Traffic Explorer's period buttons: their labels, a press choosing its quarter's days, the
                     button pressed for a range, and the range a handle is released on written to the URL
  shared_legend_state.test.js
                     a legend that other charts follow: its first hidden set, each click's set told, and the note
                     of every series hidden in another chart
  fake_page.js       the stand-ins for an element, a figure's body, the topic sections and the browser's
                     history that the node tests drive the page's modules with; an element found by selector
                     (querySelector and querySelectorAll), and controlsOf, a row's controls by their selectors
  palette_contrast.test.js, palette.js
                     the colours' contrast in both schemes, read from style.css
  module_headers.test.js
                     the module headers over ten lines, listed for review, never failed
openspec/            the specification of the site and the open change that builds it
```

## Links

- Dataset: https://huggingface.co/datasets/harvardMadsys/chutes_metadata
- Paper: https://arxiv.org/abs/2608.13573
- Code: https://github.com/HarvardMadSys/chutes_workload
