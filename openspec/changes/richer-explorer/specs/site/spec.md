## ADDED Requirements

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

## MODIFIED Requirements

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
  js/traffic/     the Traffic Explorer: its section, its filter, its controls, its day range and its distributions
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
