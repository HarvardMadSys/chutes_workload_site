# site

## ADDED Requirements

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
Makefile          make setup, setup-browser, data, serve, test, snapshots, deploy
wrangler.jsonc    the Cloudflare Worker that serves site/ as static assets
pyproject.toml    Python 3.12; pyarrow, pandas, duckdb, pypdfium2 and Pillow (pinned); pytest and Playwright (pinned) for tests
package.json      sets ES modules for node --test; wrangler, the one dev dependency; package-lock.json pins it
.nvmrc            the Node version the deploy workflow uses
.github/          workflows/deploy.yml: the deploy on every push to main
site_data/        builds site/data/ and site/figures/ from the artifact repository: the answers and the figure images
site/             exactly the files that are deployed
  index.html      the one page
  style.css       tokens, layout and components
  favicon.svg     the brand mark, for the browser tab
  js/shared/      the answers, the libraries, formatting, charts, series, the layout, the scrolling row
  js/charts/      the two chart kinds the Overview and the Traffic Explorer draw: stacked_bars, donut
  js/axes/        the ticks of the Overview's and the Traffic Explorer's axes
  js/theme/       the site's colours as the style tokens give them
  js/pages/       the page's module
  js/landing/     the hero, the stats strip, the donuts, the cite and team sections
  js/explore/     the page's start and its sections: the trends, the traffic explorer, the figure cards, the topic tabs
  js/insights/    one module per Insights topic: its takeaway and its cards
  queries/        one .sql file per answer, under explore/, and under setup/ the query of the derived table top_models
  data/           built by make data and tracked: the answers and the queries' hashes
  figures/        built by make data and tracked: one PNG per figure of the paper and their index
tests/            Python tests, node --test files, and snapshots/: the six page states as text
openspec/         the specs and the open changes; archived changes live in git history
```

#### Scenario: Generated data is never committed by hand
- **WHEN** `site/data` or `site/figures` changes after `make data`
- **THEN** it SHALL be committed with the change that needed it, and the repository test SHALL require it whole and current

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
artifact (small caches and one PDF written by the test) and SHALL return
the columns its reader needs. For every query, a test SHALL check that the
answer written for the fixture equals the query run live. A snapshot test
SHALL hold, under `tests/snapshots/`, the normalised text of every chart,
table, legend, text block and figure image (its source, width and
height) of six page states (the page with each topic shown), compare
them in headless Chromium on `make test`, and be rewritten by `make
snapshots` when a change is meant; it SHALL skip, saying so, where
Chromium is not installed, and fail, naming the host, where the
libraries or fonts cannot load.

#### Scenario: A query that no longer matches the data
- **WHEN** a column a query reads is renamed in a cache
- **THEN** `make test` SHALL fail on that query

#### Scenario: An answer that no longer matches its query
- **WHEN** the answer writer rounds, renames or drops a column the live query returns
- **THEN** `make test` SHALL fail on that query

#### Scenario: A card that changed
- **WHEN** a card's insight, an image's size or a trend's series changes without `make snapshots`
- **THEN** `make test` SHALL fail naming that unit

### Requirement: Deployment
`make deploy` SHALL publish `site/`, including its generated data and
figures, to the Cloudflare Worker that `wrangler.jsonc` names, which
serves `site/` as static assets. A push to `main` SHALL deploy the same
way through the repository's deploy workflow, which SHALL then ask the
published site for the page (`/`), the daily rollup answer and one
figure image, and fail on any answer but 200. Every hostname the site answers
on SHALL be listed in `wrangler.jsonc`.

#### Scenario: A page missing after a deploy
- **WHEN** the published site answers `/` with 404
- **THEN** the deploy workflow SHALL fail naming that path

### Requirement: The built data ships with the repository
Git SHALL track `site/data` and `site/figures` as `make data` built them:
the answers, the queries' hashes, every figure image and the images'
index. The shipped data SHALL be whole, with a tracked image for every
figure the index lists, and current, with every answer written from its
query's current text; `make test` SHALL fail otherwise. Rebuilding is
`make data ARTIFACT=<the artifact's checkout>`, and the rebuilt files are
committed with the change that needed them.

#### Scenario: Serving a fresh clone
- **WHEN** the repository is cloned and `make serve` runs
- **THEN** every number, chart, table row and figure SHALL be shown without building anything

#### Scenario: A query edited without rebuilding
- **WHEN** the text of a query changes and `make data` has not been rerun
- **THEN** `make test` SHALL fail naming the query

#### Scenario: A figure listed but not tracked
- **WHEN** the images' index names a file that is not tracked
- **THEN** the repository test SHALL fail naming the file

### Requirement: Type size
The base type size SHALL be 18 px, and no text the page sets, the
Overview charts' tick labels and legends included, SHALL render under
14 px. Headings SHALL be set in the display serif and keep their ratios
to the base. The 360-pixel layout SHALL still fit without horizontal
scrolling. Text inside a figure image is the paper's and is not held to
the minimum.

#### Scenario: The smallest text
- **WHEN** the page is opened at desktop width
- **THEN** the computed size of every text element SHALL be at least 14 px

#### Scenario: A phone
- **WHEN** the page is opened 360 pixels wide
- **THEN** the page SHALL not scroll sideways

### Requirement: The look follows Open Data
The site SHALL use Open Data's tokens: the paper background `#f8f7f5`,
white surfaces, ink `#1c1917`, the rule `#e4dfdb`, the crimson accent
`#a51c30` with its dark and tint; Crimson Text for headings, the stat
numbers and the affiliation, Inter for body text, and the monospace
stack, uppercase and letter-spaced, for eyebrows, chips, the nav and the
cite caption. Cards SHALL carry a 1px rule, a soft shadow and a 0.9rem
radius. A dark scheme SHALL follow the visitor's system preference, with
the paper, surfaces and inks retuned dark. The eight series slots SHALL
be the same hues in both schemes, at least 30° apart in OKLCH, each at
least 3:1 in contrast against its scheme's card, and a test SHALL check
every colour token's contrast in both schemes. A figure image SHALL sit
on a white panel in both schemes.

#### Scenario: A heading
- **WHEN** any heading renders
- **THEN** its computed font family SHALL begin with Crimson Text

#### Scenario: Dark system scheme
- **WHEN** the visitor's system prefers a dark scheme
- **THEN** the page SHALL render on the dark paper, every series at least 3:1 against its card, and every figure image on a white panel

### Requirement: Built from the artifact's checkout
`python -m site_data --artifact <dir> --out site/data --figures site/figures`
SHALL read, from the artifact repository's checkout, the committed caches
under `data/paper/cache/` that the queries name, `data/paper/chute_models.csv`,
`config/figures.json` and the PDFs under `figures/` that it lists, and
nothing under `output/` and nothing of the trace. It SHALL stop with a
message naming the first missing file, or the first listed figure that
does not render, and write nothing. Rebuilding from
the same checkout SHALL write identical files.

#### Scenario: A missing cache
- **WHEN** `data/paper/cache/trace_totals.parquet` is absent
- **THEN** the step SHALL stop naming it and write nothing

#### Scenario: A figure that does not render
- **WHEN** a listed figure's PDF counts one page but its page cannot be rendered
- **THEN** the step SHALL stop naming it and write nothing

#### Scenario: Rebuilding
- **WHEN** the step runs twice on the same checkout
- **THEN** the two runs' files SHALL be byte for byte identical

### Requirement: The caches as tables
The data step SHALL hold each cache it reads as a DuckDB table under the
cache file's name, and `chute_models.csv` as `chute_models`. The caches
read SHALL be `trace_totals`, `daily_rollup`,
`monthly_requests_tokens_by_model` and `function_name_daily_requests`,
and no other. It SHALL add two tables derived from them, and no other:
`trace_calendar`, each trace day's calendar day, trace month and
calendar month, computed from the trace's start date (see Trace months);
and `top_models`, the named models ranked by their requests over the
year, the sum of their monthly requests, made by the setup query
`setup/top_models`. The queries SHALL read from these seven
tables and from nothing else.

#### Scenario: A query over the trace
- **WHEN** a query names a table that is not one of the seven
- **THEN** the query test SHALL fail naming the table

#### Scenario: The most requested models
- **WHEN** an answer names the most requested models, the eight of the mixes and trends or the twenty of the daily rollup
- **THEN** it SHALL take them from `top_models`, so that every answer ranks the models alike

### Requirement: Trace months
The caches count days and months from the trace's first request: a trace
month is a month-long stretch of days counted from the trace's first
day, not a calendar month, and the thirteenth holds the last two days.
The data step SHALL hold the trace's start date, 2025-04-11, as one
named constant with its source in a comment, and every monthly answer
SHALL carry each trace month's number and the calendar month
(`YYYY-MM`) its first day falls in, so the page never computes a date
and the Overview's bars are labelled as the paper's axes are.

#### Scenario: The first and the last month
- **WHEN** the monthly answers are written
- **THEN** trace month 1 SHALL be labelled `2025-04` and trace month 13 `2026-04`

#### Scenario: A month that straddles two calendar months
- **WHEN** trace month 5 is written (its first day 2025-08-09)
- **THEN** it SHALL be labelled `2025-08`

### Requirement: Answers
`make data` SHALL run every query under `queries/explore/` over the cache
tables and write each answer as `site/data/all/explore/<query>.json`,
with the hash of each query's text in `all/queries.json`, and print the
answers' files and size. The queries SHALL be `trace_totals` (one row:
the span's first and last day, requests, input tokens, output tokens,
users, models, instances), `model_mix` (requests per named model, the
eight most requested named and the rest as Other), `endpoint_mix`
(requests per endpoint group), `requests_by_month_model`,
`tokens_by_month_model` (per calendar month, the model mix's eight and
Other), `requests_by_month_endpoint` (per calendar month and endpoint
group) and `daily_rollup` (one row per day, model and endpoint group
as the artifact's cache has them, the model's name or "Other", with
the request count, the input and output token sums and counts, and the
TTFT sum and count). Every query SHALL
be read by the page. The page SHALL draw from the answers alone and run
no query.

#### Scenario: An answer equals the live query
- **WHEN** a query is run in Python over the cache tables
- **THEN** its rows SHALL equal the rows of its answer file, column for column

#### Scenario: A query file without an answer
- **WHEN** the page asks for an answer file that does not exist
- **THEN** the page SHALL show that query's error in its own place

#### Scenario: The daily rollup answer
- **WHEN** `explore/daily_rollup` is written
- **THEN** its request counts summed over every row SHALL equal `trace_totals`' requests

### Requirement: Figure images
`make data` SHALL render every PDF that the artifact's `config/figures.json`
lists, in its sections and its external entries, to
`site/figures/<name>.png` at a scale that gives a 3.5-inch figure about
1,100 pixels of width, and write `site/figures/index.json` listing each
image's name, width and height. It SHALL print the images' count and
size. No image SHALL exceed 4 MiB and no file in `site/` 25 MiB.

#### Scenario: Every figure of the paper
- **WHEN** `make data` has run against the released artifact
- **THEN** `site/figures/` SHALL hold 48 images and the index SHALL list them

#### Scenario: A PDF missing from the artifact
- **WHEN** a listed PDF is absent
- **THEN** the step SHALL stop naming it and write nothing

### Requirement: Size and contents
`site/data` SHALL hold only the answers and the queries' hashes, and
`site/figures` only the images and their index; no cache, no Parquet
file and nothing of the trace.

#### Scenario: No row file
- **WHEN** `make data` has run
- **THEN** `site/` SHALL hold no `.parquet` file
