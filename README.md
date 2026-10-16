# Chutes Production Trace, visualized

A static website for the Chutes production trace, the dataset of the paper
*A Year in LLM Serving: Workload Evolution, Caching and Load-Balancing*: a
year of LLM serving on Chutes, request by request. The site shows the
trace's totals, its model and endpoint mixes and monthly trends, a Traffic
Explorer of requests per day, and the paper's 48 figure images in six
topics.

The site is one HTML page, ES modules, a stylesheet, seven JSON answers and
48 PNG images, with Observable Plot drawing the Overview's and the Traffic
Explorer's charts in the browser. There is no server code, no bundler and
no database in the browser.

## What the site shows

The one page, `index.html`, holds, in order:

- **The hero and the stats strip.** The title, a lede that counts the
  trace's months, and buttons to the Traffic Explorer, the Insights, the
  dataset, the paper and the code; beside them the trace's totals: months,
  requests, input and output tokens, user ids, models and serving
  instances, and its first and last day.
- **Overview** (`#overview`). Two donuts, the model mix (the eight most
  requested named models and Other) and the endpoint mix (chat, chat
  stream, completion, completion stream, other), and three monthly trends
  as stacked bars: requests by model, tokens by model and requests by
  endpoint group. A legend's button hides or shows a series.
- **Traffic Explorer** (`#traffic`). A model drop-down (the twenty most
  requested named models and Other), an endpoint drop-down and period
  buttons (All and the calendar quarters Q2 '25 to Q1 '26), over the
  chosen requests per day as stacked bars and four tiles that follow the
  choice: requests, average input tokens, average output tokens, and
  average time to first token with the share of requests that record it.
  The choice is kept in the URL as `model`, `endpoint` and `period`
  (`?model=<chute id>&period=2025-q3#traffic`), so a view can be shared as
  a link, and Back and Forward show the choice of the entry they return
  to; the default, everything, writes no key.
- **Insights** (`#insights`). The paper's figures in six topics that follow
  its sections, one shown at a time behind a row of tabs, the shown topic
  in the URL's hash: Workload overview (`#insights-overview`), Token shape
  and latency (`#insights-tokens`), Users and models (`#insights-users`),
  Workload evolution (`#insights-evolution`), Prefix caching
  (`#insights-caching`) and Load balancing (`#insights-balancing`). Each of
  the 47 cards shows one panel of a paper figure as the paper drew it, as
  an image, with a title, an insight and a caption, and, behind a
  Definition control, its definition, the artifact cache it rests on and a
  link to the artifact's account of how it is computed. The two monthly
  share panels show the paper's shared legend above them, so the 47 cards
  show 48 images. An image links to itself at full size; a figure has no
  tooltip, no legend button and no redrawing.
- **Cite** (`#cite`) and **Team**: the paper's citation as BibTeX with a
  copy button, and the lab, its collaborators and the paper's authors.

## Where the numbers come from

Every number is read from the paper's artifact repository
([HarvardMadSys/chutes_workload](https://github.com/HarvardMadSys/chutes_workload)),
never from the trace. `make data` reads the artifact's committed query
caches and figure PDFs and writes the site's data ahead of time; the
browser runs no query, it fetches the answers and draws them.

- **The answers** come from four caches under the artifact's
  `data/paper/cache/` and its model names, `data/paper/chute_models.csv`.
  `make data` holds each cache as a DuckDB table of its name and the model
  names as `chute_models`, adds two tables derived from them, and runs
  each query of `site/queries/explore/` once, writing its rows to
  `site/data/all/explore/<query>.json`:

  | Cache | What it holds | The answers drawn from it |
  |---|---|---|
  | `trace_totals` | one row: the first and last request, requests, input and output tokens, user ids, models, instances | `trace_totals`: the stats strip, and the months the hero and the footer count |
  | `daily_rollup` | one row per trace day, model (each of the twenty most requested named models, the rest together) and endpoint group: requests, token sums, the TTFT sum, and how many requests recorded each | `daily_rollup`: the Traffic Explorer |
  | `monthly_requests_tokens_by_model` | one row per trace month and model: requests and tokens | `model_mix`, `requests_by_month_model`, `tokens_by_month_model` |
  | `function_name_daily_requests` | one row per trace day and endpoint group: requests | `endpoint_mix`, `requests_by_month_endpoint` |

  The two derived tables are `trace_calendar`, each trace day's calendar
  day and each trace month's label (`site_data/months.py`), and
  `top_models`, the named models ranked by their requests over the year,
  the sum of their monthly requests (`site/queries/setup/top_models.sql`),
  from which every answer that names a model takes its eight or twenty.
- **Trace months.** The caches count days from the trace's first request,
  written as 1970-01-01, so a cache's month is a month-long stretch of
  days from the trace's first day, not a calendar month. The site labels
  each trace month with the calendar month its first day falls in, from
  the trace's start, 2025-04-11, one constant in `site_data/months.py`:
  the thirteen bars read `2025-04` to `2026-04`, and the thirteenth holds
  the trace's last two days.
- **The Traffic Explorer** filters and sums the `daily_rollup` answer in
  the browser. An average divides by the requests that record its value,
  not by every request.
- **User ids.** The stats strip says "User ids", not users: the release's
  anonymous user ids rotate every quarter, so one person can hold several,
  and the strip's count of ids exceeds the paper's count of people.
- **The figure images** are the artifact's own PDFs, every one its
  `config/figures.json` lists, rendered to PNG by
  `site_data/figure_images.py` at about twice the width a card shows them,
  and listed with their sizes in `site/figures/index.json`. In the dark
  scheme an image sits on a white panel, as a printed figure would. A
  card's words are the paper's: its insight the paper's lead-in for that
  figure, its caption the paper's caption, its definition the artifact's
  README's or plotting script's; a line its module marks "placeholder" is
  not the paper's own.

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
make data ARTIFACT=<the artifact's checkout>   # site/data/ and site/figures/
make snapshots                                 # the page as the new data draws it
make test
```

`make data` checks that every file it reads is there before it writes
anything. It writes the seven answers, `site/data/all/queries.json` (the
hash of the text of each query the answers depend on, which `make test`
compares with the queries, so that an answer older than its query fails),
the 48 images and their index, and prints each answer and image with its
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
rollup answer and one figure image, and fails unless each answers 200 with
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
rollup answer, `site/data/all/explore/daily_rollup.json`, about 5.5 MB.
`make test` fails on a tracked file over the limit, or an image over 4 MiB.

## Layout

The one map of the repository's folders and files; `CONTRIBUTING.md` has
the rules, how the pieces fit together and the patterns to copy.
`tests/test_readme.py` checks that every path this block names exists.

```
README.md            this file
CONTRIBUTING.md      the rules, how the pieces fit, the patterns to copy, and how to verify a change
CLAUDE.md            a pointer to the two files above and the git rules
Makefile             setup · setup-browser · data · serve · test · snapshots · deploy
pyproject.toml       Python 3.12; pyarrow, pandas, duckdb, and pypdfium2 and Pillow (pinned); pytest and
                     Playwright (pinned) for the tests
package.json         sets ES modules for node --test; wrangler, the one dev dependency, deploys the site
package-lock.json    wrangler's exact version and its dependencies', which npm ci installs
.nvmrc               the Node version the deploy workflow installs
wrangler.jsonc       the Cloudflare Worker that serves site/ as static assets: its name and its hostnames
.gitignore           what git leaves out: installed and generated folders, the tools' own folders, local secrets
.github/workflows/deploy.yml
                     deploys site/ on every push to main, then asks the published site for three files
site_data/           builds site/data/ and site/figures/ from the artifact's caches and figure PDFs (make data)
  __init__.py        the package's summary
  __main__.py        the command make data runs: reads the artifact, writes the answers and the images
  loading.py         reads the four caches and the model names into frames; a missing file stops the step
  months.py          the trace's start date, and the calendar of its trace days and trace months
  site_database.py   the site's database in DuckDB: the caches and model names as tables, with trace_calendar
                     and top_models
  answers.py         runs every query of site/queries/explore/, writes its answer and the queries' hashes
  figure_images.py   renders every figure PDF the artifact lists to PNG, and writes the images' index
  paths.py           the names of the files the step writes into site/data/
site/                exactly the files that are deployed
  index.html         the one page: header, hero, Overview, Traffic Explorer, Insights, Cite, Team, footer
  style.css          tokens, layout and components
  favicon.svg        the brand mark, for the browser tab
  js/pages/explore.js
                     the page's module: it names the page's sections and starts the page
  js/shared/         what the page's parts share
    answers.js       reads an answer by its query's name, and the figure images' index
    libraries.js     the one module that names a library URL: Observable Plot, at a pinned version
    charts.js        a chart's frame and ink, the loading and error states, the figure card's layout
    format.js        numbers and dates as the page writes them
    layout.js        the header and the footer
    series.js        a chart's shown rows and its legend; the models and the endpoint groups as series
    scrolling_row.js
                     a row that scrolls sideways, as the Insights' tabs do on a phone
  js/charts/         the two chart kinds
    stacked_bars.js  the trends' and the Traffic Explorer's bars
    donut.js         the model and endpoint mixes
  js/axes/ticks.js   how many ticks an axis asks for, and an axis that labels the ticks it is given
  js/theme/colours.js
                     the series colours as the style tokens give them, from one model order and one endpoint
                     order
  js/landing/        the page's opening and closing parts
    hero.js, stats.js
                     the title, lede and buttons; the stats strip of the trace's totals
    donuts.js        the Overview's model and endpoint mixes
    cite.js, team.js
                     the citation's sentence and copy buttons; the lab and the authors
  js/explore/        the page's start and its sections
    start.js         places the Insights' cards and tabs, draws the header and footer, runs the sections, and
                     follows Back and Forward
    trends.js        the Overview's three monthly trends
    traffic.js, traffic_controls.js, traffic_filter.js
                     the Traffic Explorer: its tiles and bars; its controls, kept in step with the URL; its
                     choice, its URL keys and its sums
    legend.js        the legend of buttons that hides and shows a series
    topic_tabs.js    the Insights' tabs, one topic shown at a time, the shown one in the URL's hash
    figure_sections.js, figure_card.js
                     the six topics in the order of their tabs; a card and its image
  js/insights/       one module per topic: its takeaway and its cards' words
    overview.js, tokens.js, users.js, evolution.js, caching.js, balancing.js
  queries/           one .sql file per answer or table
    explore/         the seven queries make data answers, one answer each
    setup/top_models.sql
                     the named models ranked by their requests, held as the table top_models
  data/all/          built by make data and tracked: the answers, explore/<query>.json, and queries.json
  figures/           built by make data and tracked: one PNG per figure PDF the artifact lists, and index.json
tests/               what make test runs
  conftest.py, fixture_artifact.py, repository_root.py
                     the fixture artifact (a few rows of each cache, the model names, a figure list and two PDFs),
                     the database over it, the artifact's checkout as ARTIFACT, the tracked files, the root folder
  test_loading.py, test_months.py, test_site_database.py, test_figure_images.py, test_main.py
                     the data step on the fixture artifact, against values counted by hand
  test_queries.py    every .sql file run over the fixture: its columns, the tables it reads, its numbers
  test_answers.py    every answer written for the fixture equals its query run live; an edited query is stale
  test_built_data.py
                     the shipped data: tracked, the images the index lists, every answer current, and with
                     ARTIFACT the answers, the images and their index the same bytes as a rebuild
  test_figures_registry.py
                     with ARTIFACT, the Insights' cards show every figure the artifact lists, and no other
  test_repository.py
                     the countable rules of CONTRIBUTING.md and the files git tracks
  test_deployment.py
                     the Worker's settings, and the paths the deploy workflow checks are files of site/
  test_readme.py     every path this layout names exists
  snapshot.py, snapshot_units.py, test_snapshot.py, test_snapshot_units.py
                     the snapshot test: the page opened at each of the six topics in headless Chromium, each
                     unit it shows (a chart, a legend, a block of text, a card's images) read as text and
                     compared with tests/snapshots/
  snapshots/         one folder per page state, one text file per unit, rewritten by make snapshots
  *.test.js          node --test: one file per JavaScript module with pure functions, named after the module it
                     tests (explore_traffic.test.js for explore/traffic.js), and the checks of the whole page
                     below
  figure_words.test.js
                     the word counts of every card's insight, caption and definition, and of each takeaway
  fake_page.js       the stand-ins for an element, the topic sections and the browser's history that the
                     node tests drive the page's modules with
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
