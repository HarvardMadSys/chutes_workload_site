# site Specification

## Purpose
How the site is built and kept: the repository's layout and rules, the data step from the artifact's committed files to the query and figure answers, the tests, the look and the deployment.

## Requirements

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
the metric list and an Insights topic each have one home; a copy the
browser or the stylesheet must hold SHALL be tied to its home by a
test, and a copy a query must repeat (the family slug's expression) by
a query test. A family's other models' name, "Other <family>", is the
data's, written by the queries that name a family's models, and the
browser shows it as written. A shape that crosses a module's
boundary SHALL be written once, as a JSDoc `@typedef` with one
`@property` line per field or, in Python, a frozen dataclass, and other
places SHALL point to it. A comment SHALL state one fact per sentence
and SHALL hold no value of the shipped data that a rebuild can change,
no measurement, and no paper figure or table number. A topic module
SHALL be frozen once, whole, by `frozenTopic`. The tests SHALL enforce
the countable rules.

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
- **THEN** the page SHALL show its tab and its section, numbered by its place in the list, and the snapshot states SHALL include it, with no edit to `index.html`, the tabs or the snapshot module; the test that pins each topic's groups' card counts SHALL be updated with it

#### Scenario: A figure part added
- **WHEN** `renderFigure` appends a seventh part to a card and the card grid's rule still spans six rows
- **THEN** the node test SHALL fail naming both numbers

#### Scenario: A shape written as a sentence
- **WHEN** a module's header describes the fields of an object it takes or returns in a sentence
- **THEN** the fields SHALL be written as a `@typedef`, one line per field, and the header SHALL point to it

#### Scenario: A card left unfrozen
- **WHEN** a topic module holds a card, a chart or a list that can be changed
- **THEN** the node test that every object a card holds is frozen SHALL fail naming the card

### Requirement: Repository layout
The repository SHALL have the layout that README's Layout block maps,
and git SHALL track nothing beyond it and `.gitignore`. The block SHALL
be the one map of the repository: it SHALL name every folder and every
module of `site/js/` and `site_data/`, each with what it holds, and the
tests by file and by their naming rule; no other document or spec SHALL
hold a copy of it. `tests/test_readme.py` SHALL fail on a path the block
names that does not exist and on a module of `site/js/` or `site_data/`
that it does not name.

#### Scenario: Generated data is never committed by hand
- **WHEN** a file under `site/data/` differs from what `make data` writes for the artifact's checkout and `tables/`
- **THEN** the repository test SHALL fail naming the file when `ARTIFACT` is set

#### Scenario: A module in the wrong folder
- **WHEN** a module is added outside the folders README's Layout names
- **THEN** the repository test SHALL fail naming it

#### Scenario: The page's module
- **WHEN** `index.html` loads a module other than `js/page/main.js`
- **THEN** the repository test SHALL fail naming the module it loads

#### Scenario: A module the map does not name
- **WHEN** a module is added to `site/js/` without a line in README's Layout
- **THEN** `tests/test_readme.py` SHALL fail naming it

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
has passed: that job SHALL install the Python dependencies, Node and
Chromium with its system packages, and run `make test` without the
artifact's checkout, the tests that need it skipping, saying so. After
deploying, the workflow SHALL ask the published site for the page
(`/`), the daily and the histogram answers by family and one figure
answer, and fail on any answer but 200 with its content type. Every
hostname the site answers on SHALL be listed in `wrangler.jsonc`.

#### Scenario: A page missing after a deploy
- **WHEN** the published site answers `/` with 404
- **THEN** the deploy workflow SHALL fail naming that path

#### Scenario: A red main
- **WHEN** a push to `main` fails a test of `make test`
- **THEN** the deploy workflow SHALL NOT deploy, and the published site SHALL stay as it was

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
every colour token's contrast in both schemes. Every section SHALL be
laid out at the page's content width, centred, except the Traffic
Explorer's, which SHALL span the window less the gutters. The gutters
SHALL be the page's padding, and the page's content width, its width
less the gutters, a cap on each section that the Traffic Explorer's
alone does not take; the header and the footer SHALL cap themselves at
the page's width, gutters included, so a section's edges meet their
content's.

#### Scenario: A heading
- **WHEN** any heading renders
- **THEN** its computed font family SHALL begin with Crimson Text

#### Scenario: Dark system scheme
- **WHEN** the visitor's system prefers a dark scheme
- **THEN** the page SHALL render on the dark paper, every series at least 3:1 against its card

#### Scenario: A section's width
- **WHEN** the window is wider than the page's width
- **THEN** every section except the Traffic Explorer's SHALL be centred at the page's content width, its edges under the header's content's, and the explorer's SHALL reach the gutters at both sides, with no horizontal scroll

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

### Requirement: Figure answers
`make data` SHALL write, for every figure that the artifact's
`config/figures.json` lists, in its sections and its external entries,
`site/data/all/figures/<figure>.json`: the rows of the artifact's
`data/paper/plotdata/<figure>.parquet`, column for column, with no
query, rounding or renaming, and `site/data/all/figures.json` listing
each figure's name and row count. It SHALL print the figure answers'
count and size. A plotdata table's columns SHALL be those of one chart
kind, as README's column contract lists them: for each kind its
columns, what one row is, and the figures it draws. No other document
or spec SHALL hold a copy of the contract.

#### Scenario: Every figure of the paper
- **WHEN** `make data` has run against the released artifact
- **THEN** `site/data/all/figures/` SHALL hold 48 answers and the index SHALL list them

#### Scenario: An answer equals its plotdata
- **WHEN** a figure's plotdata is read in Python
- **THEN** its rows SHALL equal the rows of its answer file, column for column

#### Scenario: A kind's columns
- **WHEN** a reader looks for the columns of the bands kind
- **THEN** README's column contract SHALL list them, `x`, `p10`, `p25`, `p50`, `p75` and `p90`, and the data step's module SHALL point to it rather than list them

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

### Requirement: The chart kinds share one interface
Every chart kind SHALL be drawn by one function of one shape,
`draw<Kind>(rows, body, seriesColours, parameters, hidden)`: the rows of
its answer, the place to draw into, the Map from series name to colour
in the legend's order (not read by a kind without series), its
parameters and the Set of the series its legend hides. It SHALL settle
once its chart is in the place and named for a screen reader, by the
name its parameters give, or else by its figure's title and insight
(its caption where it has no insight), and SHALL return nothing; no
caller SHALL name a chart. Every kind that draws axes SHALL take them
as `x` and `y` in one shape, the axis options, whose names are listed
once. Each kind SHALL export the list of the parameter names it reads.

#### Scenario: One axis on two kinds
- **WHEN** a stacked-bars card and a bands card are drawn on the trace's month axis
- **THEN** both SHALL give it as `x: TRACE_MONTH_AXIS`, and both SHALL tick and write a month alike

#### Scenario: A chart is named by its kind
- **WHEN** any kind's draw function has settled, after the first drawing or a legend's press
- **THEN** the chart's SVG SHALL carry `role="img"` and its accessible name, with no call by its caller

### Requirement: One test harness
The node tests SHALL reach the browser through one import,
`tests/fake_page.js`: one `FakeElement` for every element and the
window, held in `tests/fake_element.js` and re-exported, which only its
own test imports directly; one `useFakePage` that makes `document`, `window` with its
location and history, `fetch`, `requestAnimationFrame` and
`ResizeObserver` stand-ins for one test, answering the answer files it
is given and 404 for any other, and removes them when the test ends;
and one `shippedAnswer` that reads a shipped answer as the page names
it. The fake SHALL throw on a selector it does not read. No file of
`tests/` but `fake_page.js` SHALL assign or mock a property of
`globalThis`, and none but the two modules of the fake SHALL define an
element, document, window or fetch of its own; a plain object holding
the one field a pure function reads is an argument, not a fake. Values and helpers
that several test files of one section share SHALL live in
`tests/<section>_fixtures.js`. No test module SHALL import another
test module, in Python or JavaScript. A test SHALL NOT assert a
constant against its own literal, nor copy a list that the code or the
shipped data already holds. The node tests SHALL run with the spec
reporter, one line per test, the failing tests listed again at the end
of the node step with their file and line. The repository test SHALL
fail on a property of `globalThis` set outside `tests/fake_page.js`,
and the naming test on a test module importing a test module.

#### Scenario: A test that fakes the document itself
- **WHEN** a node test file assigns `globalThis.document`
- **THEN** the repository test SHALL fail naming the file and the line

#### Scenario: A test module that imports another
- **WHEN** `tests/test_built_data.py` imports `test_tables` for a constant
- **THEN** the naming test (`tests/test_naming.py`) SHALL fail naming the two modules

#### Scenario: A selector the fake does not read
- **WHEN** a page module asks a `FakeElement` for `div > p`
- **THEN** the fake SHALL throw an error naming the part it does not read, `>`

#### Scenario: A failing node test
- **WHEN** a node test fails during `make test`
- **THEN** the node step's output SHALL end by naming the test, its file and its line, with its error

### Requirement: The fixture's trace table is written by hand
The fixture's weekly histograms SHALL be written in
`tests/fixture_trace.py` beside the fixture trace, as rows counted by
hand from it. The tests' site database SHALL be opened over those rows,
written as the builder writes its table, and SHALL NOT run the trace
table's builder, so that the trace query and the queries over the
site's tables are tested apart. The fixture's daily rollup SHALL be
written row by row, each row naming the trace entry it counts.

#### Scenario: A fault in the trace query
- **WHEN** `site/queries/trace/weekly_histograms.sql` puts a value in the wrong bin
- **THEN** the trace query's tests SHALL fail, and the tests of the queries over the site's tables SHALL pass

### Requirement: The documents
Each fact about the site SHALL be stated in one home, and every other
place that needs it SHALL point there: the specs what the visitor sees
and what the data must satisfy; `README.md` what the site is, where its
numbers come from, how to run, build and deploy it, and the one map of
the repository; `CONTRIBUTING.md` the site's words, the rules, how the
parts fit, the patterns to copy and how to verify a change; a module's
header and its `@typedef`s the shape of what crosses its boundary; a
constant's comment the reason for its value; and `CLAUDE.md` a pointer
to README and CONTRIBUTING, and the git rules. CONTRIBUTING SHALL open
with the site's words, SHALL follow two numbers from their source to the
page, one from a query and one from a plot-ready table, naming the file
and the test at each step, and SHALL hold a table that names, for each
kind of change, the test that fails and how to update it. Text SHALL be
moved between the homes, not deleted: a passage leaves a document only
for its home, or where its home already states it.

#### Scenario: A card's fields
- **WHEN** a reader looks for the fields a figure card may have
- **THEN** they SHALL find them in the `FigureCard` typedef, one line per field, and README, CONTRIBUTING and the topic modules SHALL point to it rather than list them

#### Scenario: Which test covers a draw function
- **WHEN** a contributor changes the body of a chart kind's draw function
- **THEN** CONTRIBUTING's test table SHALL say that the snapshot test alone covers the change and that the test needs Chromium

#### Scenario: One number followed to the page
- **WHEN** a newcomer reads CONTRIBUTING's "How the site is put together"
- **THEN** they SHALL find the family mix followed from its query to its donut and the daily request rate from its plot-ready table to its card, each step naming its file and its test

#### Scenario: A value the code holds
- **WHEN** the number of ticks a linear axis asks for changes in its constant
- **THEN** no paragraph of README or CONTRIBUTING SHALL need an edit

### Requirement: Chart colours
A chart's series SHALL take the colour slots `--series-1` to
`--series-8` in order, never cycled, and a ninth series SHALL fold into
"Other", in `--series-other`. The families SHALL take ten slots,
`--series-9` and `--series-10` included, in the order of their requests,
in the Traffic Explorer and in the Overview's family mix; the Insights'
cards of more than eight series SHALL take the same ten slots in their
legend's order. In the Traffic Explorer a family's models SHALL take the
slots in the order of their requests within the family. A figure that
shades a value (cells, raster, scatter) SHALL take a Plot colour scheme,
the paper's where it names one, with its colour legend above the chart,
ticked at the powers of ten on a log colour scale. No series SHALL be
told by its colour alone, since the palette's check simulates
deuteranopia and not protanopia or tritanopia: every chart of more than
one series SHALL have a legend, and every chart except a raster a
tooltip. Beyond the checks
that "The look follows Open Data" requires, a test SHALL check every
text colour at 4.5:1 on the paper and on a card, each slot's hue within
15° between the two schemes, and every pair of slots apart by an OKLab
distance of 5 hundredths or more under a deuteranopia simulation.

#### Scenario: The families
- **WHEN** the Traffic Explorer is drawn with no family chosen
- **THEN** the named families SHALL take ten distinct slots in the order of their requests, the most requested `--series-1`, and Other SHALL be drawn in `--series-other`

#### Scenario: The monthly share cards
- **WHEN** a monthly share card is drawn
- **THEN** its ten models SHALL take the ten slots in the order of the shared legend, and every chart of the card SHALL carry a legend

### Requirement: Chart marks
A bar SHALL be inset by one pixel on each side, leaving a two-pixel gap
between bars and between stacked segments, except the Traffic
Explorer's day bars, which are a pixel or two wide, and the share
cards' stacked segments, which take no gap so that a thin segment does
not vanish into it. Bars SHALL start at zero. Grid lines and axes SHALL
be drawn in the chart grid and axis inks, and labels in the label ink;
no text SHALL be coloured by its series. A dashed line, a series' or
the line where y equals x, SHALL use one dash pattern. A reference level
SHALL be a dashed rule in the label ink, its label at the rule's right
end on bars, and over cells on a halo in the card's colour, so that its
dashes read over any fill. A scatter's dots SHALL be outlined in the
axis ink and a little transparent, so that a near-white dot shows in
either scheme. A raster's rows SHALL be centred on their ticks, and
rows at least six pixels tall SHALL be parted by a two-pixel rule in
the card's colour. A cell's range in a tooltip whose two ends read alike
SHALL be written once. In a card grid, a chart with no legend SHALL sit
at the foot of its row, so that the x axes of the row line up. Two
measures of different scale SHALL be two charts, never one chart with
two y axes. A legend SHALL name only what is drawn.

#### Scenario: A reference level over cells
- **WHEN** a cells card marks a reference level
- **THEN** the level SHALL be a dashed rule in the label ink on a halo in the card's colour

#### Scenario: A thin share
- **WHEN** a monthly share card draws a model with a small share of a month
- **THEN** its segment SHALL touch the segments above and below it, with no gap between them

### Requirement: Axis ticks and number formats
A linear axis SHALL show at most seven ticks, so that its labels do not
run together on a phone. A log axis SHALL be ticked at the powers of
ten, at most six labelled, every second or more where it spans more. The
Traffic Explorer's day axis SHALL be ticked at the first day of each
month it shows, and at the range's first day where that falls on or
before the 15th of its month or where the range holds no first of a
month; on a plot narrower than 400 px, more than seven ticks SHALL be
thinned to every other one; and its labels SHALL be slanted so that
thirteen fit a card. Each quantity SHALL be written in one format: an
axis's counts as "1k" or "600M"; a value in a legend, a tooltip, a tile
or the stats strip with one decimal kept, "129.1k", "94.0%", "4.3 s",
and to three figures in billions, "2.04B"; an axis of durations from
milliseconds to hours as "1 ms", "0.1 s", "15 min", "1 h"; minutes into
a window as hours, "6 h" on an axis and "13.9 h" in a tooltip; a ratio
to two significant figures, "0.00047"; and a trace day in a tooltip with
its date, "Day 150 · Sep 8, 2025".

#### Scenario: A trace day under the pointer
- **WHEN** the pointer rests on trace day 150 of a daily card
- **THEN** the tooltip SHALL read "Day 150 · Sep 8, 2025"

#### Scenario: A wide log axis
- **WHEN** a log axis spans ten decades
- **THEN** it SHALL label at most six of its powers of ten

#### Scenario: A large value in a tooltip
- **WHEN** a tooltip shows 2,040,000,000 tokens
- **THEN** it SHALL read "2.04B"
