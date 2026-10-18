## MODIFIED Requirements

### Requirement: The code follows CONTRIBUTING
The code SHALL follow the rules in `CONTRIBUTING.md`, which are binding:
simple before fast, plain over clever, names that are words, each of
the site's own words used in the one sense that CONTRIBUTING's Words
section gives it, one job per unit (a function at most 50 lines, a
module at most 300, a folder at most nine modules), docstrings that
state definitions and comments that say why, and SQL as literals in one
`.sql` file each under `site/queries/`. No two modules of `site/js/`
SHALL export one name. The tests SHALL enforce the countable rules.

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

### Requirement: Repository layout
The repository SHALL have this layout, and git SHALL track nothing beyond it
and `.gitignore`:

```
README.md         what the site shows, where the numbers come from, how to build the data, serve and deploy
CONTRIBUTING.md   the site's words, the rules, the patterns to copy, and how to verify a change
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
  index.html      the page
  style.css       tokens, layout and components
  favicon.svg     the brand mark, for the browser tab
  js/page/        the page's module and its start, the topic tabs and their scrolling row, the list of the Insights' topics
  js/sections/    the hero, the stats strip, the Overview's two mixes, the cite and team sections
  js/shared/      the answers, the libraries, formatting, a figure's elements and states, the rows' helpers, series and breakdowns, the legend of buttons, the layout, the link marks
  js/plot/        what every chart kind gives the charting library: the frame and ink, the axes, the trace's day and month axes
  js/charts/      the nine chart kinds: donut, stacked_bars, lines, bands, cells, raster, scatter, boxes, bars
  js/theme/       the site's colours as the style tokens give them
  js/traffic/     the Traffic Explorer: its section, its filter, its controls, its bars, its day range, its tiles, and its distributions and their three charts
  js/insights/    the figure cards and their colours, and the topics: one module per Insights topic with its takeaway and its groups of cards, and the routing card's panels and policies
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
shipped answer has the kind's columns. A node test file SHALL be named
after the module it tests and start with that module's folder under
`site/js/` (`charts_lines.test.js` for `charts/lines.js`,
`traffic_bars.test.js` for `traffic/traffic_bars.js`), a check over
every Insights card starting `insights_cards_`, except the checks of the
stylesheet and of the module headers and the test of a test helper,
named after the helper (`fake_page.test.js`); the naming test SHALL
check the first word of each name. A snapshot test SHALL hold, under
`tests/snapshots/`, the normalised text of every chart (its series,
legend, titles and tick labels), table, legend and text block of six
page states (the page opened at each topic's anchor, each state's
folder named by that anchor), compare them in headless Chromium on
`make test`, and be rewritten by `make snapshots` when a change is
meant; it SHALL skip, saying so, where Chromium is not installed, and
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

#### Scenario: A card that changed
- **WHEN** a card's insight, a chart's series or a trend's series changes without `make snapshots`
- **THEN** `make test` SHALL fail naming that unit

#### Scenario: A test file named after no folder
- **WHEN** a node test file `legend.test.js` is added for `shared/legend.js`
- **THEN** the naming test (`tests/test_naming.py`) SHALL fail naming the file, which is to be `shared_legend.test.js`

#### Scenario: A rename that moves nothing
- **WHEN** a module is renamed and the page shows what it showed
- **THEN** `make snapshots` SHALL leave every unit's text as it was
