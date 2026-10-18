## ADDED Requirements

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

## MODIFIED Requirements

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
file SHALL be named after the module it tests and start with that
module's folder under `site/js/` (`charts_lines.test.js` for `charts/lines.js`,
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
