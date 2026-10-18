## MODIFIED Requirements

### Requirement: The code follows CONTRIBUTING
The code SHALL follow the rules in `CONTRIBUTING.md`, which are binding:
simple before fast, plain over clever, names that are words, each of
the site's own words used in the one sense that CONTRIBUTING's Words
section gives it, one job per unit (a function at most 50 lines, a
module at most 300, a folder at most nine modules), docstrings that
state definitions and comments that say why, and SQL as literals in one
`.sql` file each under `site/queries/`, a number they need bound by name
at the edge. No two modules of `site/js/` SHALL export one name. Every
rule and every constant SHALL be written once: the trace's dates and
weeks, the families' order and slugs, the wording of a model's name,
the metric list and an Insights topic each have one home, and a copy
the browser or the stylesheet must hold SHALL be tied to its home by a
test. The tests SHALL enforce the countable rules.

#### Scenario: A function that grew
- **WHEN** a Python or JavaScript function exceeds 50 lines
- **THEN** the line-count test SHALL fail until it is split

#### Scenario: An assembled query
- **WHEN** a JavaScript file holds a SQL statement
- **THEN** the test that scans `site/js/` for SQL statements SHALL fail

#### Scenario: One name exported twice
- **WHEN** a module of `site/js/` exports `drawBars` and another module exports a `drawBars` too
- **THEN** the naming test (`tests/test_naming.py`) SHALL fail naming the name and both modules

#### Scenario: A word of the site
- **WHEN** a reader meets `breakdown`, `topic`, `mix` or `place` in the code
- **THEN** CONTRIBUTING's Words section SHALL define it in one line, and the code SHALL use it in that sense alone

#### Scenario: Adding a topic
- **WHEN** a topic module is written and added to the topic list
- **THEN** the page SHALL show its tab and its section, numbered by its place in the list, and the tests and the snapshot states SHALL include it, with no edit to `index.html`, a test's list or the snapshot module

#### Scenario: A figure part added
- **WHEN** `renderFigure` appends a seventh part to a card and the card grid's rule still spans six rows
- **THEN** the node test SHALL fail naming both numbers

### Requirement: Repository layout
The repository SHALL have this layout, and git SHALL track nothing beyond it
and `.gitignore`:

```
README.md         what the site shows, where the numbers come from, how to build the data, serve and deploy
CONTRIBUTING.md   the site's words, the rules, the patterns to copy, and how to verify a change
CLAUDE.md         a pointer to the two files above and the git rules
Makefile          make setup, setup-browser, tables, data, serve, test, snapshots, deploy
wrangler.jsonc    the Cloudflare Worker that serves site/ as static assets
pyproject.toml    Python 3.12; pyarrow and duckdb (pinned); pytest, Playwright and pandas (pinned) for tests
package.json      sets ES modules for node --test; wrangler, the one dev dependency; package-lock.json pins it
.nvmrc            the Node version the deploy workflow uses
.github/          workflows/deploy.yml: the suite, then the deploy, on every push to main
site_data/        builds tables/ from the released trace, and site/data/ from the artifact repository and tables/
tables/           built by make tables and tracked: the weekly histograms and their sidecar
site/             exactly the files that are deployed
  index.html      the page
  style.css       tokens, layout and components
  favicon.svg     the brand mark, for the browser tab
  js/page/        the page's module and its start, the topic tabs and their scrolling row, the list of the Insights' topics
  js/sections/    the hero, the stats strip, the Overview's two mixes, the cite and team sections
  js/shared/      the answers, the libraries, formatting, a figure's elements and states, the rows' helpers, series and breakdowns, the legend of buttons, the layout, the link marks
  js/plot/        what the chart kinds and the cards give the charting library: the frame and ink, the axes, the trace's day and month axes
  js/charts/      the nine chart kinds: donut, stacked_bars, lines, bands, cells, raster, scatter, boxes, bars
  js/theme/       the site's colours as the style tokens give them
  js/traffic/     the Traffic Explorer: its section, its choice, its filter, its controls, its day range, its tiles, its bars, its distributions and their three charts
  js/insights/    the figure cards and their colours, and the topics: one module per Insights topic with its id, its title, its takeaway and its groups of cards, and the routing card's panels and policies
  queries/        one .sql file per query answer, under explore/; under setup/ the queries of the derived tables; under trace/ the query of the trace table
  data/           built by make data and tracked: the query answers, the queries' hashes, the figure answers and their index
tests/            Python tests, node --test files named by the folder of the module each tests, the fake page they share (its elements found by selector), and snapshots/: the six page states as text, each named by the topic's anchor it opens on
openspec/         the specs and the open changes; archived changes live in git history
```

#### Scenario: Generated data is never committed by hand
- **WHEN** a file under `site/data/` differs from what `make data` writes for the artifact's checkout and `tables/`
- **THEN** the repository test SHALL fail naming the file when `ARTIFACT` is set

#### Scenario: A module in the wrong folder
- **WHEN** a module is added outside the folders above
- **THEN** the repository test SHALL fail naming it

#### Scenario: The page's module
- **WHEN** `index.html` loads a module other than `js/page/main.js`
- **THEN** the repository test SHALL fail naming the module it loads

### Requirement: Tests
`make test` SHALL run the Python tests and `node --test`, and SHALL pass at
every commit. Every `.sql` file SHALL be run by a test against a fixture
artifact (small caches, a small trace and one plotdata table per chart
kind, written by the test) and SHALL return the columns its reader
needs. For every query, a test SHALL check that the answer written for
the fixture equals the query run live; for every figure, that its answer
equals its plotdata rows; for the trace query, that its rows over the
fixture trace equal the fixture's weekly histograms. A node test SHALL
check that every card's kind is one of the nine and that the card's
shipped answer has the kind's columns. A node test SHALL check that
every card's `chart`, and every panel's, names only parameters its
kind lists, and every axis in it only the axis options. A node test
SHALL check that, for every card and panel whose `x` or `y` axis has a
numeric domain, the shipped answer's values on that axis lie within
it, except the clips the test lists by figure and axis, each with its
reason. A node test SHALL check that a card in a grid spans as many
rows of its grid as `renderFigure` gives it parts. A node test file
SHALL be named after the module it tests and start with that module's
folder under `site/js/` (`charts_lines.test.js` for `charts/lines.js`,
`traffic_bars.test.js` for `traffic/traffic_bars.js`), a check over
every Insights card starting `insights_cards_`, except the checks of the
stylesheet and of the module headers and the test of a test helper,
named after the helper (`fake_page.test.js`); the naming test SHALL
check the first word of each name. A snapshot test SHALL hold, under
`tests/snapshots/`, the normalised text of every chart (its series,
legend, titles and tick labels), table, legend and text block of six
page states (the page opened at the anchor of each topic its tab row
lists, each state's folder named by that anchor), compare them in
headless Chromium on `make test`, and be rewritten by `make snapshots`
when a change is meant; where Chromium cannot start it SHALL skip,
printing to standard error, as the last lines `make test` prints, a
framed message that says the snapshots were skipped, that no chart,
legend or text was compared and how to install Chromium; and it SHALL
fail, naming the host, where the libraries or fonts cannot load.

#### Scenario: A query that no longer matches the data
- **WHEN** a column a query reads is renamed in a cache
- **THEN** `make test` SHALL fail on that query

#### Scenario: An answer that no longer matches its query
- **WHEN** the answer writer rounds, renames or drops a column the live query returns
- **THEN** `make test` SHALL fail on that query

#### Scenario: A figure answer without its kind's columns
- **WHEN** a card says `kind: "bands"` and its answer has no `p50` column
- **THEN** the node test SHALL fail naming the card

#### Scenario: A parameter its kind does not read
- **WHEN** a cells card's `chart` names `yRefrence`, or a panel's x axis names `tickformat`
- **THEN** the node test SHALL fail naming the card and the key

#### Scenario: A card that changed
- **WHEN** a card's insight, a chart's series or a trend's series changes without `make snapshots`
- **THEN** `make test` SHALL fail naming that unit

#### Scenario: A test file named after no folder
- **WHEN** a node test file `legend.test.js` is added for `shared/legend.js`
- **THEN** the naming test (`tests/test_naming.py`) SHALL fail naming the file, which is to be `shared_legend.test.js`

#### Scenario: A rename that moves nothing
- **WHEN** a module is renamed and the page shows what it showed
- **THEN** `make snapshots` SHALL leave every unit's text as it was

#### Scenario: Data that outgrew a domain
- **WHEN** a rebuilt figure answer holds a value above its card's fixed y domain, and the clip is not listed
- **THEN** the node test SHALL fail naming the figure, the axis, the domain and the value

#### Scenario: A clone without Chromium
- **WHEN** `make test` runs where Chromium cannot start
- **THEN** the Python and node tests SHALL run, and the run SHALL end with the framed message that the snapshots were skipped and nothing of the page was compared

### Requirement: Deployment
`make deploy` SHALL publish `site/`, including its generated data, to the
Cloudflare Worker that `wrangler.jsonc` names, which serves `site/` as
static assets. A push to `main` SHALL deploy the same way through the
repository's deploy workflow, and only after the workflow's test job
has passed: that job SHALL install the Python and Node dependencies and
Chromium, and run `make test` without the artifact's checkout, the
tests that need it skipping, saying so. After deploying, the workflow
SHALL ask the published site for the page (`/`), the daily rollup
answer and one figure answer, and fail on any answer but 200. Every
hostname the site answers on SHALL be listed in `wrangler.jsonc`.

#### Scenario: A page missing after a deploy
- **WHEN** the published site answers `/` with 404
- **THEN** the deploy workflow SHALL fail naming that path

#### Scenario: A red main
- **WHEN** a push to `main` fails a test of `make test`
- **THEN** the deploy workflow SHALL NOT deploy, and the published site SHALL stay as it was

### Requirement: Answers
`make data` SHALL run every query under `queries/explore/` over the site's
tables and write each answer as `site/data/all/explore/<query>.json`,
with the hash of each query's text in `all/queries.json`, and print the
answers' files and size; writing the query answers SHALL replace the
query answers and their hashes and nothing else under `site/data`. A
query MAY take one parameter, bound by name (`$family`) and never
substituted into the text; the data step SHALL run it once per family
of the `family_mix` answer, in that answer's order, and write
`<query>/<family_slug>.json`, the query's hash recorded once. The
queries SHALL be `trace_totals` (one row: the span's first and last
day, the months, requests, input tokens, output tokens, users, models,
instances), `family_mix` (one row per family over the whole trace: its
name, its slug and its requests, most requested first and Other last;
the home of the families' order and slugs),
`endpoint_mix` (requests per endpoint group), `daily_by_family` (one
row per day, family and endpoint group, with the request count, the
input and output token sums and counts, and the TTFT sum and count),
`daily_by_model` (for the family given: one row per day, model and
endpoint group, the model one of the family's eight with its chute id
and name, or "Other <family>" with a null id, with the same
measures), `histograms_by_family` (one row per trace week, family,
endpoint group and metric, with the calendar days of the week's first
and last trace day and two lists in bin order, the bins and the
requests in each) and `histograms_by_model` (for the family given: the
same per week, model and endpoint group, the model as `daily_by_model`
names it). Every query SHALL be read by the page. The page SHALL draw
from the answers alone and run no query.

#### Scenario: An answer equals the live query
- **WHEN** a query is run in Python over the site's tables
- **THEN** its rows SHALL equal the rows of its answer file, column for column

#### Scenario: A query file without an answer
- **WHEN** the page asks for an answer file that does not exist
- **THEN** the page SHALL show that query's error in its own place

#### Scenario: The family mix sums to the trace
- **WHEN** `explore/family_mix` is written
- **THEN** its requests SHALL sum to `trace_totals`' requests and its families SHALL be those of `daily_by_family`

#### Scenario: The daily rollup answer
- **WHEN** `explore/daily_by_family` and every `explore/daily_by_model/<family>` are written
- **THEN** the family answer's requests SHALL sum to `trace_totals`' requests, and each family's model answer SHALL sum to that family's rows of the family answer

#### Scenario: The histogram answers
- **WHEN** `explore/histograms_by_family` and every `explore/histograms_by_model/<family>` are written
- **THEN** each family's model answer's requests SHALL sum, per week, endpoint group and metric, to that family's rows of the family answer, and the family answer's `input_tokens` requests per family SHALL equal `daily_by_family`'s `input_counted`

#### Scenario: One file per family
- **WHEN** `family_mix` names eleven families
- **THEN** `explore/daily_by_model/` and `explore/histograms_by_model/` SHALL each hold eleven files, one per family's slug

#### Scenario: The figure answers written first
- **WHEN** the figure answers are written and then the query answers
- **THEN** both SHALL be under `site/data/all/`, the figure answers and their index untouched

### Requirement: Built from the artifact's committed files
`python -m site_data --artifact <dir> --out site/data` SHALL read, from
the artifact repository's checkout, the committed caches under
`data/paper/cache/` that the queries name, `data/paper/chute_models.csv`,
`data/paper/model_families.csv`, `config/figures.json` and, for every figure it lists, the plot-ready
table `data/paper/plotdata/<figure>.parquet`, and nothing under `output/`
and nothing of the trace; and, from this repository, `tables/weekly_histograms.parquet`.
It SHALL stop with one message naming the first missing file and how
to supply it, and write nothing. Rebuilding from the same checkout and
table SHALL write identical files.

#### Scenario: A missing cache
- **WHEN** `data/paper/cache/trace_totals.parquet` is absent
- **THEN** the step SHALL stop naming it and write nothing

#### Scenario: A missing artifact folder
- **WHEN** `--artifact` names a folder that does not exist
- **THEN** the step SHALL stop naming the first file it reads there and saying to pass a checkout of the artifact repository as `--artifact`, and write nothing

#### Scenario: A missing site table
- **WHEN** `tables/weekly_histograms.parquet` is absent
- **THEN** the step SHALL stop naming it and write nothing

#### Scenario: A figure without plotdata
- **WHEN** a listed figure's plotdata file is absent
- **THEN** the step SHALL stop naming it and write nothing

#### Scenario: Rebuilding
- **WHEN** the step runs twice on the same checkout
- **THEN** the two runs' files SHALL be byte for byte identical

### Requirement: The cache tables
The data step SHALL hold each cache it reads as a DuckDB table under the
cache file's name, `chute_models.csv` as `chute_models`,
`model_families.csv` as `model_families` and the site's
`weekly_histograms.parquet` as `weekly_histograms`. The caches read SHALL be
`trace_totals`, `daily_rollup` and `function_name_daily_requests`, and
no other. It SHALL add three tables derived from them, and no other:
`trace_calendar`, each trace day's calendar day, trace month and
calendar month, computed from the trace's start date; `trace_weeks`,
each trace week's first and last calendar day (see Trace days and
months); and `family_models`, the named models of the daily rollup
ranked within their family by the rollup's requests, made by the setup
query `setup/family_models`. The queries SHALL read from these nine
tables and from nothing else. A query under `queries/explore/` and
`queries/setup/` SHALL NOT match a model's name against a family
pattern: a row's family is the cache's or the trace table's; the one
query that does is the trace query, which applies the artifact's rule
and is checked against the rollup.

#### Scenario: A query over the trace
- **WHEN** a query under `queries/explore/` or `queries/setup/` names a table that is not one of the nine
- **THEN** the query test SHALL fail naming the table

#### Scenario: A family's models
- **WHEN** an answer names a family's eight models
- **THEN** it SHALL take them from `family_models`, which ranks the rollup's named models within their family, with no filter of its own on the rank

### Requirement: Trace days and months
The caches count days and months from the trace's first request: a trace
month is a month-long stretch of days counted from the trace's first
day, not a calendar month, and the thirteenth holds the last two days.
A trace week is seven trace days, week 0 the trace's first seven, and
the last week ends on the trace's last day. The data step SHALL hold
the trace's start date, 2025-04-11, as one named constant with its
source in a comment, and SHALL hold the trace's epoch and a week's
length and compute a trace day's calendar day and month and a trace
week's days in one module: the answer queries join its tables, and the
trace query takes the epoch and the week's length from it as bound
parameters, so no query restates them. The daily answers SHALL carry
each day as a calendar day, the histogram answers each week's first and
last calendar day, and `trace_totals` SHALL count the trace months, so
the page never computes a date.

#### Scenario: The month count
- **WHEN** `trace_totals` is written
- **THEN** its `months` SHALL be 13, the trace months from the first day to the last

#### Scenario: A day's calendar day
- **WHEN** a daily answer is written
- **THEN** each row's `day` SHALL be the calendar day of its trace day, `2025-04-11` first

#### Scenario: A week's days
- **WHEN** a histogram answer is written
- **THEN** week 0's rows SHALL carry `first_day` 2025-04-11 and `last_day` 2025-04-17, and the last week's rows SHALL carry `last_day` 2026-04-12, the trace's last day

### Requirement: The trace table
`make tables TRACE=<the released trace's Parquet file> ARTIFACT=<the
artifact's checkout>` SHALL run the one query under `queries/trace/`,
`weekly_histograms.sql`, over the trace (held as the view `trace`, every
column of the released file), the artifact's model names and family
table and the `family_models` table, with the trace's epoch
(`$trace_epoch`) and a week's length (`$days_per_trace_week`) bound by
name from the data step's calendar module, and write
`tables/weekly_histograms.parquet` beside a sidecar
`tables/weekly_histograms.json` holding the query's hash, the trace's
row count and the table's row count. The table SHALL hold one row per
trace week (seven trace days, week 0 the trace's first seven),
family, model (a `chute_id` for one of the family's eight most requested
named models, else null for the family's other models, as the daily
rollup keeps them), endpoint group, metric (`input_tokens`,
`output_tokens`, `ttft`) and bin, with the requests in the bin. A bin is
a quarter-doubling: a value `v` is in bin `floor(4 · log2(v))`; a token
count at or below 1 is in bin 0; a TTFT is binned only where it is
positive, as the rollup counts it. A request's family SHALL be the
artifact's rule, the family of the first pattern of the family table its
model's name contains, applied in this query; `make test` SHALL check,
when `ARTIFACT` is set, that the table's requests per week, family and
endpoint group equal the daily rollup's counted requests over the
week's days, metric by metric, so that the two rules agree, and SHALL
fail when the query's text no longer matches the sidecar's hash. The
table SHALL be tracked, and rebuilt when the family table, the daily
rollup or the query changes. No file under `tables/` SHALL exceed 25
MiB.

#### Scenario: A rebuilt table
- **WHEN** `make tables` runs against the released trace and the artifact's checkout
- **THEN** the table's requests, summed over bins for the metric `input_tokens`, per family SHALL equal the rollup's `input_counted` per family

#### Scenario: The trace query over a fixture
- **WHEN** the query runs over the fixture trace
- **THEN** its rows SHALL equal the fixture's weekly histograms, which add up to the fixture rollup's counted requests

#### Scenario: The query edited without rebuilding
- **WHEN** the text of `weekly_histograms.sql` changes and `make tables` has not been rerun
- **THEN** `make test` SHALL fail naming the query
