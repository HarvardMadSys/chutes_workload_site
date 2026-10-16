# Chutes Production Trace, visualized

A static website for the Chutes production trace, the dataset of the paper
*A Year in LLM Serving: Workload Evolution, Caching and Load-Balancing*: a
year of LLM serving on Chutes, request by request. The site shows the
trace's totals, its family and endpoint mixes, a Traffic
Explorer of requests per day, and the paper's figures in six topics, drawn
from their plot-ready tables.

The site is one HTML page, ES modules, a stylesheet, the JSON answers of
five queries (the query that takes a family is answered once per family,
one file per family) and of the paper's 48 plot-ready tables, with
Observable Plot drawing every chart in the browser. There is no
server code, no bundler and no database in the browser.

## What the site shows

The one page, `index.html`, holds, in order:

- **The hero and the stats strip.** The title, a lede that counts the
  trace's months, and buttons to the Traffic Explorer, the Insights, the
  dataset, the paper and the code; beside them the trace's totals: months,
  requests, input and output tokens, user ids, models and serving
  instances, and its first and last day.
- **Overview** (`#overview`). Two donuts, the family mix (the model
  families of the artifact's family table and Other, in the Traffic
  Explorer's family colours) and the endpoint mix (chat, chat stream,
  completion, completion stream, other). A legend's button hides or shows
  a slice.
- **Traffic Explorer** (`#traffic`). A family drop-down (the model
  families by their requests, and Other), a model drop-down (once a family
  is chosen: its eight most requested named models and, where it has any,
  its other models, "Other DeepSeek", or "Rest of Other" in the family
  Other), an endpoint drop-down and period buttons (All and the calendar quarters
  Q2 '25 to Q1 '26), over the chosen requests per day as stacked bars, by
  family, by model once a family is chosen and by endpoint group once a
  model is, and four tiles that follow the choice: requests, average input
  tokens, average output tokens, and average time to first token with the
  share of requests that record it. The choice is kept in the URL as
  `family`, `model`, `endpoint` and `period`
  (`?family=deepseek&model=<chute id>&period=2025-q3#traffic`), so a view
  can be shared as a link, and Back and Forward show the choice of the
  entry they return to; the default, everything, writes no key.
- **Insights** (`#insights`). The paper's figures in six topics that follow
  its sections, one shown at a time behind a row of tabs, the shown topic
  in the URL's hash: Workload overview (`#insights-overview`), Token shape
  and latency (`#insights-tokens`), Users and models (`#insights-users`),
  Workload evolution (`#insights-evolution`), Prefix caching
  (`#insights-caching`) and Load balancing (`#insights-balancing`). Each of
  the 47 cards draws one of the paper's figures in the browser from its
  plot-ready table, with the paper's axes, log scales and limits, in the
  page's colours, light or dark: a title, an insight, the chart, as wide
  as its card, and a caption; a tooltip with the values under the pointer,
  but on the four rasters, which are drawn as one image each; and, where
  it has more than one series, a legend whose buttons hide and show them.
  Behind a Definition control are its definition, a link to its
  plot-ready table in the artifact and a link to the artifact's account of
  how it is computed. The two monthly share cards take their series' order
  from the paper's shared legend, the 48th table.
- **Cite** (`#cite`) and **Team**: the paper's citation as BibTeX with a
  copy button, and the lab, its collaborators and the paper's authors.

## Where the numbers come from

Every number is read from the paper's artifact repository
([HarvardMadSys/chutes_workload](https://github.com/HarvardMadSys/chutes_workload)),
never from the trace. `make data` reads the artifact's committed query
caches and plot-ready tables and writes the site's data ahead
of time; the browser runs no query, it fetches the answers and draws them.

- **The answers** come from three caches under the artifact's
  `data/paper/cache/`, its model names, `data/paper/chute_models.csv`, and
  its family table, `data/paper/model_families.csv`. `make data` holds
  each cache as a DuckDB table of its name, the model names as
  `chute_models` and the family table as `model_families`, adds two
  tables derived from them, and runs each query of `site/queries/explore/`
  once, writing its rows to `site/data/all/explore/<query>.json`; the one
  query that takes a family, `daily_by_model`, it runs once per family of
  the `daily_by_family` answer, writing one file per family,
  `site/data/all/explore/daily_by_model/<family slug>.json`
  (`deepseek.json`, `gpt-oss.json`, …, `other.json`):

  | Cache | What it holds | The answers drawn from it |
  |---|---|---|
  | `trace_totals` | one row: the first and last request, requests, input and output tokens, user ids, models, instances | `trace_totals`: the stats strip, and the months the hero and the footer count |
  | `daily_rollup` | one row per trace day, family, model (each of the family's eight most requested named models, the family's rest together) and endpoint group: requests, token sums, the TTFT sum, and how many requests recorded each | `daily_by_family` and `daily_by_model`: the Traffic Explorer; `family_mix`: the Overview's family mix |
  | `function_name_daily_requests` | one row per trace day and endpoint group: requests | `endpoint_mix`: the Overview's endpoint mix |

  The two derived tables are `trace_calendar`, each trace day's
  calendar day and each trace month's label (`site_data/months.py`); and
  `family_models`,
  the daily rollup's named models ranked within their family
  (`site/queries/setup/family_models.sql`), from which a family's answer
  takes its eight.
- **Model families.** The artifact's `data/paper/model_families.csv` is
  the one home of the family rule: a named model belongs to the family of
  the first pattern (by `match_order`) its name contains, case-insensitively,
  and every other model is in Other. The artifact applies the rule when it
  writes the daily rollup, which carries each row's family; the site never
  matches a name against a pattern, and orders the families by their
  requests, Other last.
- **Trace months.** The caches count days from the trace's first request,
  written as 1970-01-01, so a cache's month is a month-long stretch of
  days from the trace's first day, not a calendar month. The site labels
  each trace month with the calendar month its first day falls in, from
  the trace's start, 2025-04-11, one constant in `site_data/months.py`:
  the thirteen bars read `2025-04` to `2026-04`, and the thirteenth holds
  the trace's last two days.
- **The Traffic Explorer** filters and sums the `daily_by_family` answer,
  and a family's `daily_by_model` answer once the family is chosen, in
  the browser. The first holds one row per calendar day, family and
  endpoint group; a family's file one row per calendar day, model (each
  of the family's eight most requested named models, by its chute id and
  name, and its other models as "Other <family>") and endpoint group; each
  row holds the requests, the input and output token sums, the TTFT sum,
  and how many requests recorded each. An average divides by the requests
  that record its value, not by every request.
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
artifact owns (a user, a model's name, an endpoint group, a trace month).
A number no cache holds is added to the artifact as a cache, in its
caching pattern, and then read here.

## Running it

The built data ships with the repository, so a clone serves the site as it
is. With Python 3.12 and Node 22:

```bash
make setup           # a virtual environment, .venv, with this package and its test tools
make setup-browser   # the headless Chromium the snapshot test opens the page in; without it that test skips
make serve           # http://localhost:8000
make test            # the Python tests, the node tests and the snapshot test
make snapshots       # rewrite tests/snapshots/ when a change is meant to alter what the page shows
npm ci               # wrangler, for make deploy and npm run check
```

`make test` passes the artifact's checkout to the Python tests as
`ARTIFACT`; the test that compares the Insights' cards with the artifact's
figure list, and the one that compares the shipped data with a rebuild,
skip, saying so, where that checkout is not there.

## Building the data

The data is rebuilt when the artifact's caches or figures change, or when a
query under `site/queries/` changes. It takes a checkout of the artifact
repository, named with `ARTIFACT=`; the default is a checkout beside this
repository, `../2027_chutes_repo_artifact`:

```bash
make data ARTIFACT=<the artifact's checkout>   # site/data/
make snapshots                                 # the page as the new data draws it
make test
```

`make data` checks that every file it reads is there before it writes
anything. It writes the answers (one file per query, and one file per
family for the query that takes a family), `site/data/all/queries.json`
(the hash of the text of each query the answers depend on, which `make
test` compares with the queries, so that an answer older than its query
fails),
the 48 figure answers and their index, and prints each answer with its
size. A rebuild from the same artifact writes the same bytes, so git sees
only what changed. The rebuilt data and snapshots are committed with the
change that needed them.

## Deploying

The site is a Cloudflare Worker named `chutes-trace-site`, with static
assets and no code of its own: `wrangler.jsonc` points it at `site/`. Every
push to `main` deploys it through `.github/workflows/deploy.yml` (GitHub
Actions), which runs `wrangler deploy` with two repository secrets, added
under the repository's Settings > Secrets and variables > Actions:

- `CLOUDFLARE_API_TOKEN`, a token made from the Cloudflare dashboard's
  "Edit Cloudflare Workers" template;
- `CLOUDFLARE_ACCOUNT_ID`, the account the Worker belongs to.

With the repository variable `CLOUDFLARE_ACCOUNT_SUBDOMAIN` set there too,
the workflow then asks the published site for the page (`/`), the daily
by-family answer and one figure answer, and fails unless each answers 200 with
its content type; without it, the run shows a warning that the site was
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
CONTRIBUTING.md      the rules, how the pieces fit, the patterns to copy, and how to verify a change
CLAUDE.md            a pointer to the two files above and the git rules
Makefile             setup · setup-browser · data · serve · test · snapshots · deploy
pyproject.toml       Python 3.12; pyarrow, pandas and duckdb; pytest and Playwright (pinned) for the tests
package.json         sets ES modules for node --test; wrangler, the one dev dependency, deploys the site
package-lock.json    wrangler's exact version and its dependencies', which npm ci installs
.nvmrc               the Node version the deploy workflow installs
wrangler.jsonc       the Cloudflare Worker that serves site/ as static assets: its name and its hostnames
.gitignore           what git leaves out: installed and generated folders, the tools' own folders, local secrets
.github/workflows/deploy.yml
                     deploys site/ on every push to main, then asks the published site for three files
site_data/           builds site/data/ from the artifact's caches and plot-ready tables (make data)
  __init__.py        the package's summary
  __main__.py        the command make data runs: reads the artifact, writes the answers and the figure answers
  loading.py         reads the three caches, the model names and the family table into frames; a missing file stops
                     the step
  months.py          the trace's start date, and the calendar of its trace days and trace months
  site_database.py   the site's database in DuckDB: the caches, model names and family table as tables, with
                     trace_calendar and family_models
  answers.py         runs every query of site/queries/explore/, a family's query once per family, writes its
                     answers and the queries' hashes
  figure_answers.py  writes the plot-ready table of every figure the artifact lists as its answer, and their index
  paths.py           the names of the files the step writes into site/data/
site/                exactly the files that are deployed
  index.html         the one page: header, hero, Overview, Traffic Explorer, Insights, Cite, Team, footer
  style.css          tokens, layout and components
  favicon.svg        the brand mark, for the browser tab
  js/pages/explore.js
                     the page's module: it names the page's sections and starts the page
  js/shared/         what the page's parts share
    answers.js       reads an answer by its query's name, a figure's among them
    libraries.js     the one module that names a library URL: Observable Plot, at a pinned version
    charts.js        a chart's frame and ink, the loading and error states, the figure card's layout
    format.js        numbers and dates as the page writes them
    layout.js        the header and the footer
    series.js        a chart's shown rows and its legend; the models, the endpoint groups and the families as series;
                     the figure cards' fixed colours
    scrolling_row.js
                     a row that scrolls sideways, as the Insights' tabs do on a phone
  js/charts/         the chart kinds
    stacked_bars.js  the Traffic Explorer's bars and the two monthly share cards
    donut.js         the family and endpoint mixes
    lines.js         a line per series, a CDF among them
    bands.js         a value's median and its two percentile bands
    cells.js         a grid of rectangles shaded by their values
    raster.js        a dense grid of cells drawn as one image, as hours by users
    scatter.js       a dot per point, shaded on a scale diverging from zero
    boxes.js         a box per series from its five statistics
    bars.js          a bar per x of a panel
  js/axes/ticks.js   how many ticks an axis asks for, a log axis's powers of ten, a card's axis as Plot's scale and
                     marks
  js/theme/colours.js
                     the series colours as the style tokens give them, from one family order and one endpoint
                     order, the families taking ten
  js/landing/        the page's opening and closing parts
    hero.js, stats.js
                     the title, lede and buttons; the stats strip of the trace's totals
    donuts.js        the Overview's family and endpoint mixes
    cite.js, team.js
                     the citation's sentence and copy buttons; the lab and the authors
  js/explore/        the page's start and its sections
    start.js         places the Insights' cards and tabs, draws the header and footer, runs the sections, and
                     follows Back and Forward
    traffic.js, traffic_controls.js, traffic_filter.js
                     the Traffic Explorer: its tiles and bars; its controls, kept in step with the URL; its
                     choice, its URL keys and its sums
    legend.js        the legend of buttons that hides and shows a series
    topic_tabs.js    the Insights' tabs, one topic shown at a time, the shown one in the URL's hash
  js/insights/       the figure cards and the topics
    figure_sections.js, figure_card.js
                     the six topics in the order of their tabs; a card, its chart drawn from its answer by its kind
    card_series.js   a card's series: their order, each palette's colours, the card's legend
    overview.js, tokens.js, users.js, evolution.js, caching.js, balancing.js
                     one module per topic: its takeaway, its cards' words, kinds and charts' parameters
  queries/           one .sql file per answer or table
    explore/         the five queries make data answers, one answer each, daily_by_model's one per family
    setup/family_models.sql
                     the daily rollup's named models ranked within their family, held as the table family_models
  data/all/          built by make data and tracked: the answers, explore/<query>.json and
                     explore/daily_by_model/<family>.json, and queries.json; the figure answers,
                     figures/<figure>.json, and figures.json
tests/               what make test runs
  conftest.py, fixture_artifact.py, fixture_plotdata.py, repository_root.py
                     the fixture artifact (a few rows of each cache, the model names, a figure list of ten figures,
                     one per chart kind, with their plot-ready tables),
                     the database over it, the artifact's checkout as ARTIFACT, the tracked files, the root folder
  test_loading.py, test_months.py, test_site_database.py, test_main.py
                     the data step on the fixture artifact, against values counted by hand
  test_queries.py    every .sql file run over the fixture: its columns, the tables it reads, its numbers
  test_answers.py    every answer written for the fixture equals its query run live; an edited query is stale
  test_figure_answers.py
                     every figure answer written for the fixture equals its plot-ready table; a missing table stops
                     the step
  test_built_data.py
                     the shipped data: tracked, the figure answers its index lists, every answer current, and
                     with ARTIFACT the answers, the figure answers and their index the same bytes as a rebuild
  test_figures_registry.py
                     with ARTIFACT, every figure the artifact lists is one card's, or the share cards' legend
  test_repository.py
                     the countable rules of CONTRIBUTING.md and the files git tracks
  test_deployment.py
                     the Worker's settings, and the paths the deploy workflow checks are files of site/
  test_readme.py     every path this layout names exists
  snapshot.py, snapshot_units.py, test_snapshot.py, test_snapshot_units.py
                     the snapshot test: the page opened at each of the six topics in headless Chromium, each
                     unit it shows (a chart, a legend, a block of text; a card's chart as its name, panel titles,
                     colour legend, axis ticks and axis titles) read as text and compared with tests/snapshots/,
                     and no other topic's figure answers requested
  snapshots/         one folder per page state, one text file per unit, rewritten by make snapshots
  *.test.js          node --test: one file per JavaScript module with pure functions, named after the module it
                     tests (explore_traffic.test.js for explore/traffic.js), and the checks of the whole page
                     below
  figure_words.test.js
                     the word counts of every card's insight, caption and definition, and of each takeaway
  insights_figure_cards.test.js
                     every card's kind, and its shipped answer holding that kind's columns
  insights_card_series.test.js
                     a card's series' order, the colours each palette gives them, and its legend
  insights_figure_charts.test.js
                     cards drawn from their shipped answers as the spec describes them: a tooltip, a log axis, a
                     raster, a series hidden in a CDF card, the hourly lines' gaps, the shared colour and month axis
  fake_page.js       the stand-ins for an element, a figure's body, the topic sections and the browser's
                     history that the node tests drive the page's modules with
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
