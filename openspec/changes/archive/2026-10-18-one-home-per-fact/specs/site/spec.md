## ADDED Requirements

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
