# Chutes Production Trace, visualized

A static website for the Chutes production trace, the dataset of the paper
*A Year in LLM Serving: Workload Evolution, Caching and Load-Balancing*: a
year of LLM serving on Chutes, request by request.

The site is one HTML page, ES modules, a stylesheet, the JSON answers of
seven queries (the two that take a family are answered once per family,
one file per family) and of the paper's 48 plot-ready tables, with
Observable Plot drawing every chart in the browser. There is no
server code, no bundler and no database in the browser. The site's own
words (the page, a section, a topic, a card, a breakdown and the rest)
are defined in the Words section of `CONTRIBUTING.md`.

## What the site shows

The page, `site/index.html`, holds these parts, in order; what each one
does is the landing-page spec's, `openspec/specs/landing-page/spec.md`.

- **The hero and the stats strip**: the title, a lede, the buttons to the
  explorer, the Insights, the dataset, the paper and the code, and the
  trace's totals.
- **Overview** (`#overview`): the family mix and the endpoint mix, two donuts.
- **Traffic Explorer** (`#traffic`): the requests or tokens per day of a
  family, a model, an endpoint and a range of days, as four tiles, stacked
  bars, a day-range slider and three distribution charts; the choice is
  kept in the URL (`TrafficChoice` in `site/js/traffic/traffic_choice.js`).
- **Insights** (`#insights`): the paper's figures, each drawn in the
  browser from its plot-ready table on a card, the cards in groups under
  the topics of `TOPICS` (`site/js/page/topics.js`), one topic shown at a
  time behind a row of tabs, its anchor in the URL's hash.
- **Cite** (`#cite`), **Team** (`#team`) and the footer: the paper's
  BibTeX with a copy button; the lab, its collaborators and the paper's
  authors; the links on and off the site.

## Where the numbers come from

Every number is read from the paper's artifact repository
([HarvardMadSys/chutes_workload](https://github.com/HarvardMadSys/chutes_workload)),
except one table: the Traffic Explorer's distributions come from the
released trace, which `make tables` reads once to build the site's trace
table. `make data` reads the artifact's committed query caches and
plot-ready tables and the trace table, and writes the site's data ahead
of time; the browser runs no query, it fetches the answers and draws them.
The queries filter, group, count and sum; a number no cache holds is
added to the artifact as a cache, in its caching pattern, and then read
here (the site spec's "Definitions come from the artifact").

- **The answers** come from three caches under the artifact's
  `data/paper/cache/`, its model names, `data/paper/chute_models.csv`, its
  family table, `data/paper/model_families.csv`, and the trace table.
  `make data` holds each as a DuckDB table, adds three tables derived from
  them (the site spec's "The cache tables" names the nine), and runs each
  query of `site/queries/explore/` once, writing its rows to
  `site/data/all/explore/<query>.json`; the two queries that take a
  family, `daily_by_model` and `histograms_by_model`, it runs once per
  family of the `family_mix` answer, writing one file per family,
  `site/data/all/explore/<query>/<family slug>.json` (`deepseek.json`,
  `gpt-oss.json`, …, `other.json`). The site spec's "Answers" gives each
  answer's rows.

  | Cache | What it holds | The answers drawn from it |
  |---|---|---|
  | `trace_totals` | one row: the first and last request, requests, input and output tokens, user ids, models, instances | `trace_totals`: the stats strip, and the months the hero and the footer count |
  | `daily_rollup` | one row per trace day, family, model (each of the family's eight most requested named models, the family's rest together) and endpoint group: requests, token sums, the TTFT sum, and how many requests recorded each | `daily_by_family` and `daily_by_model`: the Traffic Explorer; `family_mix`: the Overview's family mix |
  | `function_name_daily_requests` | one row per trace day and endpoint group: requests | `endpoint_mix`: the Overview's endpoint mix |
  | `weekly_histograms`, the site's trace table | one row per trace week, family, model (as the daily rollup keeps them), endpoint group, metric and bin: the requests in the bin | `histograms_by_family` and `histograms_by_model`: the Traffic Explorer's distribution charts and its tiles' percentiles |

- **The trace table**, `tables/weekly_histograms.parquet`, is the one
  thing the site builds from the released trace, the dataset's 91 GB
  Parquet file of 6.1 billion requests: `make tables` runs the one query
  of `site/queries/trace/`, `weekly_histograms.sql`, over it and tracks
  the result, 1.8 MB, so that `make data` never reads the trace. The site
  spec's "The trace table" defines its rows and bins.
- **Model families.** The artifact's `data/paper/model_families.csv` is
  the one home of the family rule: a named model belongs to the family of
  the first pattern (by `match_order`) its name contains,
  case-insensitively, and every other model is in Other. The artifact
  applies the rule when it writes the daily rollup, which carries each
  row's family; the site's answers never match a name against a pattern.
  The one query that does is the trace query, since the trace's rows
  carry no family: it applies the same rule, and `make test`, given the
  artifact's checkout, checks the trace table against the daily rollup,
  so the two applications agree. The `family_mix` answer is the families'
  one home: their names, their slugs and their order, which the data step
  and the page follow.
- **Trace days.** The caches count days from the trace's first request,
  written as 1970-01-01, so a cache's month is a month-long stretch of
  days from the trace's first day, not a calendar month. The site turns
  each trace day into its calendar day from the trace's start,
  2025-04-11, one constant in `site_data/months.py`, which is also the
  home of the trace week (`TRACE_EPOCH` and `DAYS_PER_TRACE_WEEK`, bound
  by name into the trace query by `TRACE_QUERY_PARAMETERS` of
  `site_data/tables.py`). The browser holds the same day,
  `TRACE_FIRST_DAY` of `site/js/shared/format.js`, for its dated
  tooltips, tested against `trace_totals`. The site spec's "Trace days
  and months" says what each answer carries.
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
  numbers; except the four rasters and the nine density and P90 grids,
  whose PDFs draw the points (a dot per request, matplotlib's hexagons)
  that the table counts in cells. A card draws its figure from its answer
  with the chart kind it names (`FigureCard` in
  `site/js/insights/figure_card.js`, which also says where a card's words
  come from). The column contract: a table's columns are those of its
  kind.

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
repository, `../2027_chutes_repo_artifact`. A rebuild from the same
inputs writes the same bytes, so git sees only what changed, and the
rebuilt files are committed with the change that needed them.

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
machine. `make test` fails while the query's text differs from the hash
in the sidecar, and, given the artifact's checkout, while the table
disagrees with the daily rollup. The hash covers the query's text alone,
not the week's two parameters: after a change to the week, only the
check against the daily rollup finds a table not rebuilt. Commit the two
files, then build the answers.

**The answers** are rebuilt when the artifact's caches or figures change,
when the trace table is rebuilt, or when a query under
`site/queries/explore/` or `site/queries/setup/` changes:

```bash
make data ARTIFACT=<the artifact's checkout>   # site/data/
make snapshots                                 # the page as the new data draws it
make test
```

`make data` checks that every file it reads is there before it writes
anything. It writes the answers; `site/data/all/queries.json`, the hash
of the text of each query the answers depend on, which `make test`
compares with the queries, so that an answer older than its query fails;
and the figure answers and their index. It prints each answer with its
size.

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
the Python dependencies (`make setup`), Node (the version `.nvmrc`
names) and Chromium with its system packages, and runs `make test
ARTIFACT=`: the three tests that need the artifact's checkout skip ("Running
it"), and every other test runs, the snapshot test among them. It needs
no `npm ci`, as the node tests import nothing from npm. Its job
`deploy` waits for it (`needs: test`), so a red `main` is never deployed,
and runs `wrangler deploy` with two repository secrets, added under the
repository's Settings > Secrets and variables > Actions:

- `CLOUDFLARE_API_TOKEN`, a token made from the Cloudflare dashboard's
  "Edit Cloudflare Workers" template;
- `CLOUDFLARE_ACCOUNT_ID`, the account the Worker belongs to.

With the repository variable `CLOUDFLARE_ACCOUNT_SUBDOMAIN` set there too,
the workflow then asks the published site for the page (`/`), the daily
by-family answer, the histogram answer by family and one figure answer,
and fails unless each answers 200 with its content type; without it, the
run shows a warning that the site was not checked. `make deploy`
publishes the same way from a machine with `npm ci` done and the token
in `CLOUDFLARE_API_TOKEN`; run `make test` first. `npm run check` is a
dry run.

Until a hostname is chosen, the Worker answers at its `workers.dev`
address. When one is chosen, list it in `wrangler.jsonc`'s `routes` (and
set `workers_dev` to false), not only in the dashboard: `wrangler deploy`
detaches any custom domain bound to the Worker that `wrangler.jsonc` does
not list, taking its DNS record with it.

Static assets allow 25 MiB per file; the largest file here is the daily
by-family answer, `site/data/all/explore/daily_by_family.json`, about
3.4 MB. `make test` fails on a tracked file over the limit.

## Layout

The one map of the repository's folders and files; `CONTRIBUTING.md` has
the rules, how the pieces fit together, the patterns to copy and what
each test checks. `tests/test_readme.py` checks that every path this
block names exists and that every module of `site/js/` and `site_data/`
is named.

```
README.md            this file
CONTRIBUTING.md      the site's words, the rules, how the pieces fit, the patterns to copy, and how to verify a change
CLAUDE.md            a pointer to the two files above and the git rules
Makefile             setup · setup-browser · tables · data · serve · test · snapshots · deploy
pyproject.toml       Python 3.12; pyarrow and duckdb; pytest, pandas and Playwright, the last pinned, for the tests
package.json         sets ES modules for node --test; wrangler, the one dev dependency, deploys the site
package-lock.json    wrangler's exact version and its dependencies', which npm ci installs
.nvmrc               the Node version the deploy workflow installs
wrangler.jsonc       the Cloudflare Worker that serves site/ as static assets: its name and its hostnames
.gitignore           what git leaves out: installed and generated folders, the tools' own folders, local secrets
.github/workflows/deploy.yml
                     on every push to main, runs make test, then deploys site/ and asks the published site for four
                     files
site_data/           make tables: tables/ from the released trace; make data: site/data/ from the artifact and tables/
  __init__.py        the package's summary
  __main__.py        the command make data runs: reads the artifact, writes the answers and the figure answers
  loading.py         reads the three caches, the model names, the family table and the trace table as Arrow
                     tables, and holds the trace table's file names; a missing file stops the step
  months.py          the trace's start date, epoch and week length, and the calendar of its trace days, weeks and months
  site_database.py   the site's database in DuckDB: the caches, model names and family table as tables, with
                     trace_calendar, trace_weeks and family_models, and the trace table as weekly_histograms
  answers.py         runs every query of site/queries/explore/, a family's query once per family, writes its
                     answers and the queries' hashes
  figure_answers.py  writes the plot-ready table of every figure the artifact lists as its answer, and their index
  answer_files.py    where the answers and figure answers go in site/data/, and the JSON form they are written in
  tables.py          the command make tables runs: the trace query over the released trace, written with its sidecar
tables/              built by make tables from the released trace, and tracked
  weekly_histograms.parquet
                     the trace table: the requests per trace week, family, model, endpoint group, metric and bin
  weekly_histograms.json
                     its sidecar: the trace query's hash, the trace's rows and the table's rows
site/                exactly the files that are deployed
  index.html         the page's shell: its parts as "What the site shows" lists them, the Insights its heading and tab
                     row alone; its head preloads the explorer's daily answer
  style.css          tokens, layout and components
  favicon.svg        the brand mark, for the browser tab
  js/page/           the page's module and its start, the Insights' topics, their tabs and the tabs' scrolling row
    main.js          the page's module: names the page's sections, starts the charting library's load, starts the page
    start.js         asks for the answers the sections share, writes each Insights topic's section with its groups
                     and cards and mounts their tabs, mounts the header and renders the footer, runs the sections,
                     then draws the shown topic, and follows Back and Forward
    topic_tabs.js    the Insights' tabs, from the topic list, one topic shown at a time, the shown one in the hash
    topics.js        TOPICS, the Insights' topics in the order of their tabs, the one place a topic is declared; a
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
    trace_axes.js    the trace's day and month axes the cards hand to the kinds, the partial last month starred
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
    figure_card.js   the shapes of a card and a topic, frozenTopic, and a card, drawn from its answer by its kind
    card_series.js   a card's series: their order, each palette's colours, the fixed and highlighted series, the
                     count colour, the card's legend
    workload.js, tokens.js, users.js, evolution.js, caching.js, balancing.js
                     one module per topic: its id, its title, its takeaway, its groups' headings and takeaways, its
                     cards' words, kinds and charts' parameters
    routing_panels.js
                     the load-balancing topic's routing simulation card: its series and eight panels, and the
                     policies' colours and legend
  queries/           one .sql file per answer or table
    explore/         the queries make data answers, one answer each, the two family queries' one per family
    setup/family_models.sql
                     the daily rollup's named models ranked within their family, held as the table family_models
    trace/weekly_histograms.sql
                     the trace query, which make tables runs over the released trace: the trace table
  data/all/          built by make data and tracked: the answers, explore/<query>.json and, for the two family
                     queries, explore/<query>/<family>.json, and queries.json; the figure answers,
                     figures/<figure>.json, and figures.json
tests/               what make test runs; CONTRIBUTING's "Verifying a change" says what each test checks
  conftest.py, repository_root.py
                     pytest's shared fixtures, the artifact's checkout as ARTIFACT among them; the root folder
  fixture_artifact.py, fixture_plotdata.py, fixture_trace.py
                     the fixture artifact, its plot-ready tables (one figure per chart kind), and a small trace whose
                     requests add up to its daily rollup, with its trace table counted by hand
  counted_requests.py
                     the requests per family and metric that the daily and the histogram answers count
  test_loading.py, test_months.py, test_site_database.py, test_main.py, test_answers.py, test_tables.py
  test_figure_answers.py
                     pytest, each named after the module of site_data/ it tests, test_main.py for __main__.py
  test_queries.py, test_built_data.py, test_figures_registry.py, test_repository.py, test_naming.py
  test_deployment.py, test_readme.py
                     pytest, each named after what it checks: the queries, the shipped data, the artifact's figure
                     list, the repository's rules, the names, the deployment, this block
  snapshot.py, snapshot_units.py, snapshot_traffic.py, test_snapshot.py, test_snapshot_units.py
                     the snapshot test: the page opened at each topic in headless Chromium, each unit it shows read
                     as text and compared with tests/snapshots/
  snapshots/         one folder per page state, named by the anchor of the topic it opens on, one text file per
                     unit; rewritten by make snapshots
  *.test.js          node --test: one file per JavaScript module with pure functions, and the checks of the whole
                     page. A file is named after the folder of the module it tests and then the module, the folder
                     written once (charts_lines.test.js for charts/lines.js, traffic.test.js for traffic/traffic.js);
                     a module's second file adds what it tests (traffic_controls_period_buttons.test.js)
  insights_cards_*.test.js
                     a check over every Insights card, named after what it checks (insights_cards_words.test.js)
  palette_contrast.test.js, module_headers.test.js, fake_page.test.js, fake_element.test.js
                     named otherwise: the colours' contrast, the module headers over ten lines (listed for review,
                     never failed), and the test of a test helper, named after it
  fake_page.js, fake_element.js
                     the node tests' stand-in for the browser, the one import of it, and its element
  traffic_fixtures.js, page_fixtures.js, shared_fixtures.js, insights_fixtures.js
                     the fixtures that a folder's node tests share, named after the folder
  palette.js         the palette test's reading of style.css and its colour arithmetic
openspec/            the site's specs (specs/) and its changes (changes/), the archived ones in changes/archive/
```

## Links

- Dataset: https://huggingface.co/datasets/harvardMadsys/chutes_metadata
- Paper: https://arxiv.org/abs/2608.13573
- Code: https://github.com/HarvardMadSys/chutes_workload
