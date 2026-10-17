# site Specification

## Purpose
How the site is built and kept: the repository's layout and rules, the data step from the artifact's committed files to the query and figure answers, the tests, the look and the deployment.

## Requirements

### Requirement: The code follows CONTRIBUTING
The code SHALL follow the rules in `CONTRIBUTING.md`, which are binding:
simple before fast, plain over clever, names that are words, one job per
unit (a function at most 50 lines, a module at most 300, a folder at
most about nine modules), docstrings that state definitions and comments
that say why, and SQL as literals in one `.sql` file each under
`site/queries/`. The tests SHALL enforce the countable rules.

#### Scenario: A function that grew
- **WHEN** a Python or JavaScript function exceeds 50 lines
- **THEN** the line-count test SHALL fail until it is split

#### Scenario: An assembled query
- **WHEN** a JavaScript file holds a SQL statement
- **THEN** the test that scans `site/js/` for SQL statements SHALL fail

### Requirement: Repository layout
The repository SHALL have this layout, and git SHALL track nothing beyond it
and `.gitignore`:

```
README.md         what the site shows, where the numbers come from, how to build the data, serve and deploy
CONTRIBUTING.md   the rules, the patterns to copy, and how to verify a change
CLAUDE.md         a pointer to the two files above and the git rules
Makefile          make setup, setup-browser, tables, data, serve, test, snapshots, deploy
wrangler.jsonc    the Cloudflare Worker that serves site/ as static assets
pyproject.toml    Python 3.12; pyarrow, pandas and duckdb (pinned); pytest and Playwright (pinned) for tests
package.json      sets ES modules for node --test; wrangler, the one dev dependency; package-lock.json pins it
.nvmrc            the Node version the deploy workflow uses
.github/          workflows/deploy.yml: the deploy on every push to main
site_data/        builds tables/ from the released trace, and site/data/ from the artifact repository and tables/
tables/           built by make tables and tracked: the weekly histograms and their sidecar
site/             exactly the files that are deployed
  index.html      the one page
  style.css       tokens, layout and components
  favicon.svg     the brand mark, for the browser tab
  js/shared/      the answers, the libraries, formatting, charts, series, the layout, the scrolling row
  js/charts/      the nine chart kinds: donut, stacked_bars, lines, bands, cells, raster, scatter, boxes, bars
  js/axes/        the ticks of the charts' axes
  js/theme/       the site's colours as the style tokens give them
  js/pages/       the page's module
  js/landing/     the hero, the stats strip, the two mixes (by family and by endpoint), the cite and team sections
  js/explore/     the page's start, the legend of buttons, the topic tabs, the list of the Insights' topics
  js/traffic/     the Traffic Explorer: its section, its filter, its controls, its day range, its tiles, its bars, its distributions and their cards
  js/insights/    the figure cards and the topics: one module per Insights topic with its takeaway and its groups of cards, and the routing card's panels
  queries/        one .sql file per query answer, under explore/; under setup/ the queries of the derived tables; under trace/ the query of the trace table
  data/           built by make data and tracked: the query answers, the queries' hashes, the figure answers and their index
tests/            Python tests, node --test files, and snapshots/: the six page states as text
openspec/         the specs and the open changes; archived changes live in git history
```

#### Scenario: Generated data is never committed by hand
- **WHEN** a file under `site/data/` differs from what `make data` writes for the artifact's checkout and `tables/`
- **THEN** the repository test SHALL fail naming the file when `ARTIFACT` is set

#### Scenario: A module in the wrong folder
- **WHEN** a module is added outside the folders above
- **THEN** the repository test SHALL fail naming it

### Requirement: No front-end build and no npm runtime dependency
The site SHALL be plain HTML, CSS and ES modules served as they are in
`site/`. It SHALL NOT need a bundler, a transpiler or `npm install` to run.
Browser libraries SHALL be loaded from a CDN at exact, pinned versions, and
every library URL SHALL be written once, in one module that the rest of the
code imports from.

#### Scenario: Serving the source folder
- **WHEN** `site/` (with its data and figures) is served by any static file server
- **THEN** the page SHALL work without a build step

#### Scenario: A library URL outside its home
- **WHEN** a CDN URL appears in any file other than the one library module
- **THEN** the repository test SHALL fail

### Requirement: Definitions come from the artifact
Every quantity the site shows SHALL be a value of an artifact cache, or a
plain count, sum, ratio of sums, share or quantile of a cache's column.
The site SHALL NOT re-implement a definition the artifact has (a user, a
model's name, an endpoint group, a token hit ratio, an inter-arrival
time, a trace month), and SHALL NOT read the trace.

#### Scenario: A quantity no cache holds
- **WHEN** a card needs a number no artifact cache holds
- **THEN** the cache SHALL be added to the artifact, in its caching pattern, and the site SHALL read it

### Requirement: Navigation
The site SHALL have one page, `index.html`, with one sticky header: the
brand "Chutes Production Trace" linking to the top, the in-page links
Overview, Traffic Explorer, Insights and Cite, and no link off the site. On
a phone the header SHALL be two rows, the brand on the first and the four
links on the second, wrapping as they need; nothing in the header SHALL
scroll sideways or be cut off. The header SHALL NOT name the lab nor link
the dataset, the paper, the code or Open Data; the hero and the footer
do. The header SHALL stay at the top while the page scrolls, and every
anchored section SHALL land below it. There SHALL be no About page and no
About paragraph.

#### Scenario: Scrolling
- **WHEN** the visitor scrolls the page
- **THEN** the header SHALL remain visible at the top

#### Scenario: A phone
- **WHEN** the page is opened 360 pixels wide
- **THEN** all four links SHALL be visible under the brand without scrolling the header

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
shipped answer has the kind's columns. A snapshot test SHALL hold, under
`tests/snapshots/`, the normalised text of every chart (its series,
legend, titles and tick labels), table, legend and text block of six
page states (the page with each topic shown), compare them in headless
Chromium on `make test`, and be rewritten by `make snapshots` when a
change is meant; it SHALL skip, saying so, where Chromium is not
installed, and fail, naming the host, where the libraries or fonts
cannot load.

#### Scenario: A query that no longer matches the data
- **WHEN** a column a query reads is renamed in a cache
- **THEN** `make test` SHALL fail on that query

#### Scenario: An answer that no longer matches its query
- **WHEN** the answer writer rounds, renames or drops a column the live query returns
- **THEN** `make test` SHALL fail on that query

#### Scenario: A figure answer without its kind's columns
- **WHEN** a card says `kind: "bands"` and its answer has no `p50` column
- **THEN** the node test SHALL fail naming the card

#### Scenario: A card that changed
- **WHEN** a card's insight, a chart's series or a trend's series changes without `make snapshots`
- **THEN** `make test` SHALL fail naming that unit

### Requirement: Deployment
`make deploy` SHALL publish `site/`, including its generated data, to the
Cloudflare Worker that `wrangler.jsonc` names, which serves `site/` as
static assets. A push to `main` SHALL deploy the same way through the
repository's deploy workflow, which SHALL then ask the published site for
the page (`/`), the daily rollup answer and one figure answer, and fail
on any answer but 200. Every hostname the site answers on SHALL be listed
in `wrangler.jsonc`.

#### Scenario: A page missing after a deploy
- **WHEN** the published site answers `/` with 404
- **THEN** the deploy workflow SHALL fail naming that path

### Requirement: The built data ships with the repository
Git SHALL track `site/data` as `make data` built it: the query answers,
the queries' hashes, the figure answers and their index; and `tables/`
as `make tables` built it. The shipped data SHALL be whole, with a
tracked answer for every figure the index lists, and current, with every
query answer written from its query's current text and the trace table
from its query's; `make test` SHALL fail otherwise. Rebuilding is `make
data ARTIFACT=<the artifact's checkout>`, and, when the family table,
the daily rollup or the trace query changed, `make tables` first; the
rebuilt files are committed with the change that needed them.

#### Scenario: Serving a fresh clone
- **WHEN** the repository is cloned and `make serve` runs
- **THEN** every number, chart, table row and figure SHALL be shown without building anything

#### Scenario: A query edited without rebuilding
- **WHEN** the text of a query changes and `make data` has not been rerun
- **THEN** `make test` SHALL fail naming the query

#### Scenario: A figure listed but not tracked
- **WHEN** the figure index names an answer that is not tracked
- **THEN** the repository test SHALL fail naming the file

### Requirement: Type size
The base type size SHALL be 18 px, and no text the page sets, the charts'
tick labels and legends included, SHALL render under 14 px. Headings
SHALL be set in the display serif and keep their ratios to the base. The
360-pixel layout SHALL still fit without horizontal scrolling.

#### Scenario: The smallest text
- **WHEN** the page is opened at desktop width
- **THEN** the computed size of every text element SHALL be at least 14 px

#### Scenario: A phone
- **WHEN** the page is opened 360 pixels wide
- **THEN** all four links SHALL be visible under the brand without scrolling the header

### Requirement: The look follows Open Data
The site SHALL use Open Data's tokens: the paper background `#f8f7f5`,
white surfaces, ink `#1c1917`, the rule `#e4dfdb`, the crimson accent
`#a51c30` with its dark and tint; Crimson Text for headings, the stat
numbers and the affiliation, Inter for body text, and the monospace
stack, uppercase and letter-spaced, for eyebrows, chips, the nav and the
cite caption. Cards SHALL carry a 1px rule, a soft shadow and a 0.9rem
radius. A dark scheme SHALL follow the visitor's system preference, with
the paper, surfaces and inks retuned dark. The ten series slots SHALL
be the same hues in both schemes, at least 30° apart in OKLCH, each at
least 3:1 in contrast against its scheme's card, and a test SHALL check
every colour token's contrast in both schemes.

#### Scenario: A heading
- **WHEN** any heading renders
- **THEN** its computed font family SHALL begin with Crimson Text

#### Scenario: Dark system scheme
- **WHEN** the visitor's system prefers a dark scheme
- **THEN** the page SHALL render on the dark paper, every series at least 3:1 against its card

### Requirement: Answers
`make data` SHALL run every query under `queries/explore/` over the site's
tables and write each answer as `site/data/all/explore/<query>.json`,
with the hash of each query's text in `all/queries.json`, and print the
answers' files and size. A query MAY take one parameter, bound by name
(`$family`) and never substituted into the text; the data step SHALL run
it once per value and write `<query>/<value slug>.json`, the query's
hash recorded once. The queries SHALL be `trace_totals` (one row: the
span's first and last day, the months, requests, input tokens, output
tokens, users, models, instances), `family_mix` (requests per family
over the whole trace, most requested first and Other last), `endpoint_mix` (requests per endpoint group),
`daily_by_family` (one row per day, family and endpoint group, with the
request count, the input and output token sums and counts, and the TTFT
sum and count), `daily_by_model` (for the family given: one row per
day, model and endpoint group, the model one of the family's eight with
its chute id and name, or "Other <family>" with a null id, with the same
measures), `histograms_by_family` (one row per trace week, family,
endpoint group and metric, with the week's first calendar day and two
lists in bin order, the bins and the requests in each) and `histograms_by_model` (for the family given: the same per
week, model and endpoint group, the model as `daily_by_model` names it).
Every query SHALL be read by the page. The page SHALL draw
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
- **WHEN** `daily_by_family` names eleven families
- **THEN** `explore/daily_by_model/` and `explore/histograms_by_model/` SHALL each hold eleven files, one per family's slug

### Requirement: Size and contents
`site/data` SHALL hold only the query answers, the queries' hashes, the
figure answers and their index; no cache, no Parquet file, no image and
nothing of the trace. No file in `site/` SHALL exceed 25 MiB.

#### Scenario: No row file
- **WHEN** `make data` has run
- **THEN** `site/` SHALL hold no `.parquet` file and no `.png` file

### Requirement: Built from the artifact's committed files
`python -m site_data --artifact <dir> --out site/data` SHALL read, from
the artifact repository's checkout, the committed caches under
`data/paper/cache/` that the queries name, `data/paper/chute_models.csv`,
`data/paper/model_families.csv`, `config/figures.json` and, for every figure it lists, the plot-ready
table `data/paper/plotdata/<figure>.parquet`, and nothing under `output/`
and nothing of the trace; and, from this repository, `tables/weekly_histograms.parquet`.
It SHALL stop with a message naming the first
missing file and write nothing. Rebuilding from the same checkout and
table SHALL write identical files.

#### Scenario: A missing cache
- **WHEN** `data/paper/cache/trace_totals.parquet` is absent
- **THEN** the step SHALL stop naming it and write nothing

#### Scenario: A missing site table
- **WHEN** `tables/weekly_histograms.parquet` is absent
- **THEN** the step SHALL stop naming it and write nothing

#### Scenario: A figure without plotdata
- **WHEN** a listed figure's plotdata file is absent
- **THEN** the step SHALL stop naming it and write nothing

#### Scenario: Rebuilding
- **WHEN** the step runs twice on the same checkout
- **THEN** the two runs' files SHALL be byte for byte identical

### Requirement: Figure answers
`make data` SHALL write, for every figure that the artifact's
`config/figures.json` lists, in its sections and its external entries,
`site/data/all/figures/<figure>.json`: the rows of the artifact's
`data/paper/plotdata/<figure>.parquet`, column for column, with no
query, rounding or renaming, and `site/data/all/figures.json` listing
each figure's name and row count. It SHALL print the figure answers'
count and size. A plotdata table's columns SHALL be those of one chart
kind: `lines` (`series`, `x`, `y`, optional `panel`), `cdf` (`series`,
`x`, `cdf`), `bands` (`x`, `p10`, `p25`, `p50`, `p75`, `p90`), `cells`
(`x_low`, `x_high`, `y_low`, `y_high`, `value`), `raster` (`x`, `y`,
`value`), `scatter` (`x`, `y`, `value`), `boxes` (`series`, `low`, `q1`,
`median`, `q3`, `high`, `count`), `bars` (`series`, `x`, `value`,
optional `panel`), `stacked_bars` (`series`, `x`, `value`) or `legend`
(`series`, `rank`).

#### Scenario: Every figure of the paper
- **WHEN** `make data` has run against the released artifact
- **THEN** `site/data/all/figures/` SHALL hold 48 answers and the index SHALL list them

#### Scenario: An answer equals its plotdata
- **WHEN** a figure's plotdata is read in Python
- **THEN** its rows SHALL equal the rows of its answer file, column for column

### Requirement: The cache tables
The data step SHALL hold each cache it reads as a DuckDB table under the
cache file's name, `chute_models.csv` as `chute_models`,
`model_families.csv` as `model_families` and the site's
`weekly_histograms.parquet` as `weekly_histograms`. The caches read SHALL be
`trace_totals`, `daily_rollup` and `function_name_daily_requests`, and
no other. It SHALL add two tables derived from them, and no other:
`trace_calendar`, each trace day's calendar day, trace month and
calendar month, computed from the trace's start date (see Trace
months); and `family_models`, the named models of the daily rollup
ranked within their family by the rollup's requests, made by the setup
query `setup/family_models`. The queries SHALL read from these eight
tables and from nothing else. A query under `queries/explore/` and
`queries/setup/` SHALL NOT match a model's name against a family
pattern: a row's family is the cache's or the trace table's; the one
query that does is the trace query, which applies the artifact's rule
and is checked against the rollup.

#### Scenario: A query over the trace
- **WHEN** a query under `queries/explore/` or `queries/setup/` names a table that is not one of the eight
- **THEN** the query test SHALL fail naming the table

#### Scenario: A family's models
- **WHEN** an answer names a family's eight models
- **THEN** it SHALL take them from `family_models`, which ranks the rollup's named models within their family

### Requirement: Trace days and months
The caches count days and months from the trace's first request: a trace
month is a month-long stretch of days counted from the trace's first
day, not a calendar month, and the thirteenth holds the last two days.
The data step SHALL hold the trace's start date, 2025-04-11, as one
named constant with its source in a comment. The daily answers SHALL
carry each day as a calendar day and `trace_totals` SHALL count the
trace months, so the page never computes a date.

#### Scenario: The month count
- **WHEN** `trace_totals` is written
- **THEN** its `months` SHALL be 13, the trace months from the first day to the last

#### Scenario: A day's calendar day
- **WHEN** a daily answer is written
- **THEN** each row's `day` SHALL be the calendar day of its trace day, `2025-04-11` first

### Requirement: The trace table
`make tables TRACE=<the released trace's Parquet file> ARTIFACT=<the
artifact's checkout>` SHALL run the one query under `queries/trace/`,
`weekly_histograms.sql`, over the trace (held as the view `trace`, every
column of the released file), the artifact's model names and family
table and the `family_models` table, and write
`tables/weekly_histograms.parquet` beside a sidecar
`tables/weekly_histograms.json` holding the query's hash, the trace's
row count and the table's row count. The table SHALL hold one row per
trace week (seven trace days, the first from the trace's first day),
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
