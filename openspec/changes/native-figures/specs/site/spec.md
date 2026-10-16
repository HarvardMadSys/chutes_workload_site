# site (delta)

## MODIFIED Requirements

### Requirement: Repository layout
The repository SHALL have this layout, and git SHALL track nothing beyond it
and `.gitignore`:

```
README.md         what the site shows, where the numbers come from, how to build the data, serve and deploy
CONTRIBUTING.md   the rules, the patterns to copy, and how to verify a change
CLAUDE.md         a pointer to the two files above and the git rules
Makefile          make setup, setup-browser, data, serve, test, snapshots, deploy
wrangler.jsonc    the Cloudflare Worker that serves site/ as static assets
pyproject.toml    Python 3.12; pyarrow, pandas and duckdb (pinned); pytest and Playwright (pinned) for tests
package.json      sets ES modules for node --test; wrangler, the one dev dependency; package-lock.json pins it
.nvmrc            the Node version the deploy workflow uses
.github/          workflows/deploy.yml: the deploy on every push to main
site_data/        builds site/data/ from the artifact repository: the query answers and the figure answers
site/             exactly the files that are deployed
  index.html      the one page
  style.css       tokens, layout and components
  favicon.svg     the brand mark, for the browser tab
  js/shared/      the answers, the libraries, formatting, charts, series, the layout, the scrolling row
  js/charts/      the nine chart kinds: donut, stacked_bars, lines, bands, cells, raster, scatter, boxes, bars
  js/axes/        the ticks of the charts' axes
  js/theme/       the site's colours as the style tokens give them
  js/pages/       the page's module
  js/landing/     the hero, the stats strip, the donuts, the cite and team sections
  js/explore/     the page's start and its sections: the trends, the legend, the traffic explorer, the topic tabs
  js/insights/    the figure cards and the topics: one module per Insights topic with its takeaway and its cards
  queries/        one .sql file per query answer, under explore/, and under setup/ the queries of the derived tables
  data/           built by make data and tracked: the query answers, the queries' hashes, the figure answers and their index
tests/            Python tests, node --test files, and snapshots/: the six page states as text
openspec/         the specs and the open changes; archived changes live in git history
```

#### Scenario: Generated data is never committed by hand
- **WHEN** a file under `site/data/` differs from what `make data` writes for the artifact's checkout
- **THEN** the repository test SHALL fail naming the file when `ARTIFACT` is set

#### Scenario: A module in the wrong folder
- **WHEN** a module is added outside the folders above
- **THEN** the repository test SHALL fail naming it

### Requirement: Size and contents
`site/data` SHALL hold only the query answers, the queries' hashes, the
figure answers and their index; no cache, no Parquet file, no image and
nothing of the trace. No file in `site/` SHALL exceed 25 MiB.

#### Scenario: No row file
- **WHEN** `make data` has run
- **THEN** `site/` SHALL hold no `.parquet` file and no `.png` file

### Requirement: Tests
`make test` SHALL run the Python tests and `node --test`, and SHALL pass at
every commit. Every `.sql` file SHALL be run by a test against a fixture
artifact (small caches and one plotdata table per chart kind, written by
the test) and SHALL return the columns its reader needs. For every query,
a test SHALL check that the answer written for the fixture equals the
query run live; for every figure, that its answer equals its plotdata
rows. A node test SHALL check that every card's kind is one of the nine
and that the card's shipped answer has the kind's columns. A snapshot
test SHALL hold, under `tests/snapshots/`, the normalised text of every
chart (its series, legend and tick labels), table, legend and text block
of six page states (the page with each topic shown), compare them in
headless Chromium on `make test`, and be rewritten by `make snapshots`
when a change is meant; it SHALL skip, saying so, where Chromium is not
installed, and fail, naming the host, where the libraries or fonts cannot
load.

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
the queries' hashes, the figure answers and their index. The shipped
data SHALL be whole, with a tracked answer for every figure the index
lists, and current, with every query answer written from its query's
current text; `make test` SHALL fail otherwise. Rebuilding is `make data
ARTIFACT=<the artifact's checkout>`, and the rebuilt files are committed
with the change that needed them.

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

## ADDED Requirements

### Requirement: Built from the artifact's committed files
`python -m site_data --artifact <dir> --out site/data` SHALL read, from
the artifact repository's checkout, the committed caches under
`data/paper/cache/` that the queries name, `data/paper/chute_models.csv`,
`config/figures.json` and, for every figure it lists, the plot-ready
table `data/paper/plotdata/<figure>.parquet`, and nothing under `output/`
and nothing of the trace. It SHALL stop with a message naming the first
missing file and write nothing. Rebuilding from the same checkout SHALL
write identical files.

#### Scenario: A missing cache
- **WHEN** `data/paper/cache/trace_totals.parquet` is absent
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

## REMOVED Requirements

### Requirement: Built from the artifact's checkout
**Reason**: Replaced by "Built from the artifact's committed files": the step reads plotdata tables and renders no PDF, so the rendering scenario has no meaning.
**Migration**: The new requirement carries the missing-cache and rebuilding scenarios unchanged.

### Requirement: Figure images
**Reason**: The figures are drawn by the site from their plotdata answers; no image is rendered or shipped.
**Migration**: `site/figures/` and its index are deleted; `figure_images.py`, pypdfium2 and Pillow leave the repository.
