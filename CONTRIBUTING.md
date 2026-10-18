# Contributing

This site will be read, run and maintained by people who did not write it. A
reader must be able to follow any module on a first read. The rules below are
binding, and `make test` checks the countable ones.

## Words

Each word below has one meaning in the code, the tests and these documents.

- **the page**: `site/index.html`, the site's one page, started by
  `js/page/main.js`.
- **section**: a part of the page under its own heading: hero, Overview,
  Traffic Explorer, Insights, Cite, Team. A section that reads answers is
  *run*, as `run(container, context)`: the stats strip, the Overview's mixes
  and the Traffic Explorer. The hero, Cite, Team and the Insights are
  rendered or mounted instead.
- **Overview**: the section of the two mixes, `#overview`. Nothing else is
  called so.
- **mix**: one of the Overview's donuts: the requests' shares by family or by
  endpoint group. `context.mixes` holds the two answers' rows.
- **Traffic Explorer**, or **the explorer**: the section of bars, tiles and
  distributions, `js/traffic/`. Its anchor is `#traffic`; the element it runs
  in is `#traffic-explorer`.
- **choice**: what the explorer shows, kept in the URL: a `TrafficChoice`
  (`traffic/traffic_choice.js`).
- **tile**: one of the explorer's four numbers. The stats strip's are its
  *numbers*.
- **topic**: one of the Insights' tabs, a `Topic` (`insights/figure_card.js`),
  listed in `TOPICS` of `js/page/topics.js`. The first is the workload
  (`insights/workload.js`); its anchor stays `#insights-overview` for shared
  links.
- **group**: a topic's heading, takeaway and grid of cards, a `TopicGroup`.
- **figure**: a titled chart with its caption and Definition, as
  `renderFigure` lays it out.
- **card**: the bordered box a figure or a mix sits in (`.card`). An
  *Insights card* is one of the paper's figures (`fig_…`) in a topic, with
  its words: a `FigureCard`.
- **panel**: one of several charts in one card, drawn from the rows whose
  `panel` column names it.
- **answer**: a JSON file under `site/data/all/` that the page reads by name.
  A *query answer* comes from a `.sql` file; a *figure answer* is the
  artifact's plot-ready table and runs no query. In a data path, `explore/`
  means the query answers, not the explorer.
- **artifact**: the paper's artifact repository, whose checkout `ARTIFACT`
  names. A *cache* is one of its committed query caches, under
  `data/paper/cache/`. A *plot-ready table* is a figure's
  `data/paper/plotdata/<figure>.parquet`, in the columns of one kind.
- **trace table**: `tables/weekly_histograms.parquet`, the one table the site
  builds from the released trace. The *trace query*,
  `queries/trace/weekly_histograms.sql`, builds it.
- **data step** and **trace step**: `make data` (`site_data/`), which writes
  the answers, and `make tables`, which writes the trace table.
- **fixture artifact**: the small artifact and trace the Python tests build
  (`tests/fixture_artifact.py`, `fixture_plotdata.py`, `fixture_trace.py`).
- **trace day**, **trace week**, **trace month**: one day, seven days, a
  month-long stretch, counted from the trace's first day; not calendar weeks
  or months. `site_data/months.py` defines all three (README's "Trace days").
- **chart**: what one draw function draws into one body.
- **kind**: one of the nine ways to draw a chart, a module of `js/charts/`.
  An Insights card names its kind by a key of `CHART_KINDS`. That list adds
  `cdf`, lines drawn as a CDF, and leaves out `donut`, which only the
  Overview draws.
- **Plot**: Observable Plot, the charting library. `js/plot/` holds what the
  chart kinds and the cards give it: the frame, the axes, the trace's axes.
- **series**: the names a chart draws, each a line, a slice or a stack of
  segments.
- **breakdown**: how rows split into series: `BY_FAMILY`, `BY_MODEL` or
  `BY_ENDPOINT`, each a `Breakdown` (`shared/series.js`).
- **legend**: the buttons above a chart that hide and show its series; one
  button is an *entry*.
- **slot**: one of the theme's series colours.
- **palette**: which slots a card's series take (`PALETTES`). The theme's
  palette is its whole set of colours (`tests/palette.js`).
- **container**: a section's element, from `index.html`.
- **place**: an empty element laid out to be filled later
  (`placeDistributionCharts`, `placePanels`). A figure's place is what
  `renderFigure` fills; a chart's place is the body a kind draws into.
- **body**: the element a chart is drawn into. `showLoading`, `showNote` and
  `showError` take a container, a place or a body.
- Verbs: **run** a section; **render** markup once from data; **mount**
  render and listen; **place** lay out empty elements to fill later; **draw**
  a chart; **show** a state.
- **state** and **unit**: the snapshot test opens the page in one state per
  topic, and reads each unit (a chart, a legend, a block of text) as text.
- **placeholder**: `// placeholder:` marks words that are not the paper's
  own, for the authors.
- **the paper's words**: placeholder copy keeps the paper's own words (its
  sections, panels, the overview paragraph); they are the authors', not the
  code's.

## The rules

- **A fact has one home**, the first of these that fits it, and every other
  place points there:
  1. the specs, `openspec/specs/`: what the visitor sees and what the data
     must satisfy;
  2. `README.md`: what the site is, where its numbers come from, how to run,
     build and deploy it, and the one map of the repository;
  3. this file: the words, the rules, how the parts fit, the patterns to
     copy, and how to verify a change;
  4. a module's header and its `@typedef`s: the shape of what crosses its
     boundary;
  5. a constant's comment: why it has its value;
  6. `CLAUDE.md`: a pointer to README and this file, and the git rules.

  A spec says what the visitor sees; the constant that meets it, how the
  code gets there. Text moves to its home; it is not deleted. A copy the
  browser must hold is tied to its home by a test, as the trace's calendar
  is (the test table's row "The trace's calendar").
- **Simple before fast.** Write the plainest correct code. Cache, precompute,
  split a file or add an index only after a measured run shows the plain
  version is too slow, and record the measurement in the change's
  `design.md`.
- **Plain over clever.** No nested comprehensions, no lambdas or arrow
  functions longer than one expression, no state set on objects the code does
  not own, no side effects at import.
- **Names are words.** `requests`, `models`, `days`, `endpointGroup`. A
  one-letter name is only a loop index. Python modules are imported by name
  without aliases; JavaScript uses named imports. A name is exported by one
  module of `site/js/` only. A second module takes its kind or its section in
  its name (`drawTrafficBars`, `stackedBarTipText`).
- **One job per unit.** A function is at most 50 lines, a module at most 300,
  a folder of `site/js/` at most nine modules. A function that computes two
  things is split.
- **Docstrings state definitions; comments explain why.**
  - A module's header (its docstring in Python, its opening comment in
    JavaScript) says what the module holds.
  - A shape that crosses a module's boundary is one JSDoc `@typedef`, one
    `@property` line per field, or in Python a frozen dataclass; other
    places point to it.
  - Every export has a docstring (Python) or JSDoc (JavaScript) that states
    its definition: what it returns, for which input.
  - A constant that is a decision gets a name and a one-line comment saying
    what it decides.
  - A comment inside a function says why, in one line.

  A comment states one fact per sentence, writes "except" for an exception,
  writes a list as a list, and gives examples where a rule has cases. It
  holds no value of the shipped data that a rebuild can change. None tells
  how the code came to be, who did what, or a paper figure number; history
  is in git. A header over ten lines is a sign to look again, not a
  failure: `tests/module_headers.test.js` lists each as a warning. A
  sentence a first-time reader needs stays, however long the header; none
  is cut to reach a count.
- **SQL is a literal.** Every query is one `.sql` file under `site/queries/`.
  No SQL is written in JavaScript or in the data step, and no query is
  assembled from strings. A number or a value a query needs is a parameter,
  bound by name by DuckDB and never written into the text:
  - an answer's query takes at most one, the family (`$family`);
  - the trace query takes the week's two, `$trace_epoch` and
    `$days_per_trace_week`, from `months.py` (`TRACE_QUERY_PARAMETERS` of
    `site_data/tables.py`).

  A query of `queries/explore/` or `queries/setup/` reads the site's nine
  tables and nothing else. The site spec's "The cache tables" names them;
  `tests/test_site_database.py` checks that the database holds nine, and
  `tests/test_queries.py` reads them from the database to check each query.
  The trace query reads the view `trace`, `chute_models`, `model_families`
  and `family_models`, and nothing else (`TRACE_QUERY_TABLES`, in the same
  test file). `months.py` is the one place the data step computes a date: a
  query joins `trace_calendar` or `trace_weeks` rather than doing date
  arithmetic. It joins `trace_weeks` with an explicit `ON trace_weeks.week =
  …`, since the query test's table check (`duckdb.get_table_names`) cannot
  bind a `USING` join.
- **Every definition comes from the artifact.** A query filters, groups,
  counts and sums. None restates a definition the artifact owns, and neither
  a query nor the browser decides what a user, a model's name, an endpoint
  group or a trace month is. A number no cache holds is added to the
  artifact as a cache, in its caching pattern, and then read here. The one
  exception is the trace table: the site reads the released trace once, in
  `make tables`. Its trace query applies the artifact's family rule and
  endpoint groups to the trace's rows, held to the artifact's by a test that
  compares the table with the daily rollup (`tests/test_tables.py`).
  Nothing else reads the trace.
- **No framework, no bundler, no npm dependency.** Plain HTML, CSS and ES
  modules. Libraries come from a CDN at exact versions, named only in
  `site/js/shared/libraries.js`.
- **Only what is needed.** Add a module, a column, a token or a dependency
  when a task needs it, not before.

## How the site is put together

```
make tables
  the released trace, as the view trace; the artifact's chute_models.csv, model_families.csv and daily rollup
  → queries/trace/weekly_histograms.sql, the week bound from site_data/months.py
  → tables/weekly_histograms.parquet and its sidecar, tables/weekly_histograms.json

make data
  the artifact's caches, chute_models.csv and model_families.csv, and tables/weekly_histograms.parquet
  → nine tables in DuckDB, trace_calendar, trace_weeks and family_models among them
  → queries/explore/<query>.sql
  → data/all/explore/<query>.json, a family query's data/all/explore/<query>/<family>.json, and data/all/queries.json

  the artifact's config/figures.json and data/paper/plotdata/<figure>.parquet
  → data/all/figures/<figure>.json and data/all/figures.json

the page
  index.html
  → js/page/main.js
  → js/page/start.js, the section modules and js/shared/
  → data/all/explore/<query>.json and data/all/figures/<figure>.json
```

README's Layout maps every folder and module. Two numbers, followed from
their source to the page, pass every folder a newcomer opens.

**The family mix, from its query to its donut.**

1. `site/queries/explore/family_mix.sql`: the requests per family over the
   trace, most first, Other last. `tests/test_queries.py` runs it on the
   fixture artifact and checks its columns and numbers.
2. `make data` (`site_data/answers.py`) writes its rows to
   `site/data/all/explore/family_mix.json` and its hash to
   `site/data/all/queries.json`. `tests/test_answers.py` checks the answer
   against the query run live; `tests/test_built_data.py` checks that the
   shipped answer is current.
3. `page/start.js` reads it once, `readAnswer("explore/family_mix")`, and
   hands it on as `context.mixes.families`. `tests/shared_answers.test.js`
   checks the file read; `tests/page_start.test.js` checks that it is read
   once, before the explorer's daily answer.
4. `sections/mixes.js` (`runMixes`) draws it with `drawDonut` of
   `charts/donut.js` and a legend. `tests/sections_mixes.test.js` and
   `tests/charts_donut.test.js` check their pure parts.
5. The donut in `#overview`: the snapshot unit `model_families.chart`
   (`tests/snapshots/insights-overview/`).

**The daily request rate, from its plot-ready table to its card.**

1. The artifact's `data/paper/plotdata/fig_request_rate_day.parquet`,
   listed in its `config/figures.json`. With `ARTIFACT`,
   `tests/test_figures_registry.py` checks that a card draws it.
2. `make data` (`site_data/figure_answers.py`) copies it to
   `site/data/all/figures/fig_request_rate_day.json` and lists it in
   `site/data/all/figures.json`. `tests/test_figure_answers.py` checks the
   copy, column for column, on the fixture artifact;
   `tests/test_built_data.py` checks the shipped answer and its index.
3. Its card in `insights/workload.js`: its words, `kind: "lines"` and its
   `chart`, its x axis `TRACE_DAY_AXIS` of `plot/trace_axes.js`.
   - `tests/insights_cards_words.test.js` counts its words;
   - `tests/insights_cards_answers.test.js` checks that its answer has its
     kind's columns;
   - `tests/insights_figure_card.test.js` checks its parameters against
     the kind's list;
   - `tests/insights_cards_domains.test.js` checks that its answer fits its
     y domain;
   - `tests/insights_workload.test.js` checks its tooltip.
4. `drawFigureChart` of `insights/figure_card.js` reads the answer when the
   topic is first shown, and draws it by `CHART_KINDS.lines`, whose `draw`
   is `drawLines` of `charts/lines.js`. `tests/charts_lines.test.js` checks
   the kind's pure parts; the draw itself runs only in the snapshot test.
5. The card in `#insights-overview`: the snapshot unit
   `daily_request_rate.chart` (`tests/snapshots/insights-overview/`).

**The page's parts.** Each module's header says what it does; the
landing-page spec says what the visitor sees.

- `index.html` is a shell: a header, titled sections with ids, a footer,
  and one `<script type="module">`. It holds no data and no inline script.
- The page's module, `js/page/main.js`, lists its sections in `SECTIONS`,
  each `{ id, run }`, starts the charting library's load (see "JavaScript
  style") and calls `startPage` of `page/start.js`. `startPage` asks once
  for the answers the sections share, writes the Insights' topic sections
  and mounts their tabs, mounts the header, renders the footer, and runs
  each section as `run(container, context)`. The header of `page/start.js`
  lists what `context` holds.
- The header links the page's sections by anchor alone (`LINKED_SECTIONS`
  of `shared/layout.js`); its brand links the page with the URL's keys.
- `readAnswer(name)` of `shared/answers.js` reads `data/all/<name>.json`, a
  query's answer or a figure's (`readAnswer("figures/<figure>")`). The page
  runs no query.
- The topic tabs, `page/topic_tabs.js`, show one topic at a time and keep
  it in the history: a tab chosen pushes a new entry. `page/start.js` is
  the page's one listener of `popstate` (`followHistory`) and tells each
  section that asked through `context.onReturn`. `TOPICS` of
  `page/topics.js` is the one place a topic is declared; the tabs, the node
  tests and the snapshot states all read it.
- **The order of the reads** is the landing-page spec's "The page appears
  before the data"; `tests/page_start.test.js` checks it, and
  `tests/shared_answers.test.js` checks the head's preload.
- **The URL keys** are the fields of `TrafficChoice`
  (`traffic/traffic_choice.js`), their one home, with the drop-downs'
  entries and `METRICS`. `traffic/traffic_filter.js` holds the arithmetic
  over the rows a choice keeps and imports the choice, never the reverse. A
  choice replaces the history entry (`context.replaceQuery`); only a tab
  adds one. `traffic/traffic_controls.js` keeps the controls and the URL in
  step (`ControlsCallbacks`, `MountedControls`).

**Adding a section.**

1. Give it a place in `index.html`: an element with an id, under a heading
   if it is a part of its own.
2. Write its module with `async run<Thing>(container, context)`, which
   shows the loading state in the container at once and then draws its
   answer into it.
3. Add `{ id, run }` to the page module's `SECTIONS`.

The stylesheet's `.page > section` lays a section out at the page's width
less the gutters; the Traffic Explorer's `#traffic` alone is uncapped. A new
topic of figures is a module of `js/insights/` instead, added to `TOPICS`.
It becomes a tab and a section, numbered by its place, with no edit to
`index.html`, the tabs or the snapshot states.

## Patterns to copy

**A query** (`site/queries/explore/endpoint_mix.sql`):

```sql
-- One row per endpoint group (`chat`, `chat_stream`, `completion`, `completion_stream`, `other`): its requests over
-- the whole trace, most requested first.
SELECT function_group AS endpoint_group,
       sum(requests) AS requests
FROM function_name_daily_requests
GROUP BY endpoint_group
ORDER BY requests DESC, endpoint_group;
```

The first line says what one row is. Columns are named in words. A number
the query needs is bound by name from its one home, never written in.
`tests/test_queries.py` runs every query against the fixture artifact. It
checks the query's columns against `EXPECTED_COLUMNS`, the tables it reads
against the site's database's, and its numbers against values counted by
hand.

**A query that takes the family** (`site/queries/explore/daily_by_model.sql`):

```sql
-- One row per calendar day, model and endpoint group of the family `$family`, the query's one parameter, bound by name:
-- ...
       coalesce(family_models.name, 'Other ' || $family) AS model,
-- ...
LEFT JOIN family_models ON family_models.chute_id = daily_rollup.chute_id
WHERE daily_rollup.family = $family
```

The query names `$family` in its first line. DuckDB binds it by name
(`site_database.run_query(connection, name, {"family": "DeepSeek"})`), so
no family's name can change the SQL. Listing the query in `FAMILY_QUERIES`
of `site_data/answers.py` makes the data step answer it once per family
and record its hash once, the text being the same for every family.
`tests/test_queries.py` runs it with the family of `QUERY_PARAMETERS`.

**One answer per query.** `make data` answers every query of
`queries/explore/` once, as README's "The answers" says. A query of
`queries/setup/` makes a table of the site's database and is not answered.
**Rerun `make data` after editing a query**: the page reads the answers,
not the queries, and `tests/test_built_data.py` fails while a query's text
differs from the one its answer was written from.

**A list-valued answer** (`site/queries/explore/histograms_by_family.sql`):
a query whose rows hold lists builds each with DuckDB's ordered `list`,
one list per column, all in one order:

```sql
       list(bin_requests.bin ORDER BY bin_requests.bin) AS bins,
       list(bin_requests.requests ORDER BY bin_requests.bin) AS requests
```

The answer writes each list as a JSON array of numbers. The page reads the
two lists of a row together, the requests of `bins[i]` being
`requests[i]`. It is the same information as a row per bin, in a fifth of
the bytes.

**The trace query** (`site/queries/trace/weekly_histograms.sql`) is run by
`make tables` (`site_data/tables.py`), not `make data`:

- the trace is the view `trace`, made by DuckDB's Python API from the file
  `TRACE=` names, so no path is written into the SQL;
- it sorts its rows by every key, so that a rebuild writes the same bytes;
- its sidecar records the hash of its text, as `queries.json` does for the
  answers. **Rerun `make tables` after editing it**, then `make data`.

It is tested over the fixture's small trace, against the trace table
counted by hand there (`tests/fixture_trace.py`). The tests' site database
is opened over that table, so a fault in the query fails only its own
tests.

**Adding a query.**

1. Write `site/queries/explore/<name>.sql` as above.
2. List its columns in `EXPECTED_COLUMNS` of `tests/test_queries.py` and
   test its numbers on the fixture there; raise the count of answers in
   `tests/test_answers.py`.
3. Run `make data ARTIFACT=<the artifact's checkout>` and commit
   `site/data` with the change.
4. Read it in the page with `readAnswer("explore/<name>")`, then run
   `make snapshots`.

**A pure JavaScript module with its test** (`site/js/shared/format.js`,
`tests/shared_format.test.js`): a header saying what the module holds;
exported functions, each with a JSDoc stating its definition; module-level
constants with a comment; helpers below the exports. Its `node --test`
file has one `test()` per behaviour. The test file is named after the
module, its folder's word first, as README's Layout says
(`tests/test_naming.py` checks it). What two test modules share is a module
of its own, as `tests/counted_requests.py`, never a test module imported.

**A Python module with its test** (`site_data/months.py`,
`tests/test_months.py`): a module docstring stating the definition, a
frozen dataclass for anything that crosses a boundary, and functions that
each do one job.

**A link off the site** (`externalLink` of `shared/layout.js`, the hero's
buttons in `sections/hero.js`) opens in a new tab and ends in an arrow,
which the stylesheet draws after its text (`a[target="_blank"]::after`).
An entry may name a mark of `LINK_MARKS` (`shared/link_marks.js`, whose
header says how a mark is drawn), written before its text by
`linkMark(name)`, which throws on a name that is no mark's. A new mark is
one path added to `LINK_MARKS`, its source named in the module's header.

**A topic** is a `Topic` of groups, each a `TopicGroup` of cards
(`insights/figure_card.js`); the landing-page spec's "Insights" gives the
word limits of their takeaways and headings. A topic module writes its
topic as one `frozenTopic({ … })`, which freezes it whole.
`topicCards(topic)` of `page/topics.js` lists a topic's cards group by
group, the one way the tests list them. `TOPIC_FIELDS` and `GROUP_FIELDS`
in `tests/page_topics.test.js` list the fields.

**A figure card** is a `FigureCard` (`insights/figure_card.js`), of those
fields and no other (`CARD_FIELDS` and `OPTIONAL_CARD_FIELDS` in
`tests/page_topics.test.js`). A line of words that is not the paper's own
carries a `// placeholder:` comment above it. The card's legend has a
button per series where there is more than one, and none where each panel
holds one series, which its title names. The workload topic's first card:

```js
{
  figure: "fig_request_rate_day",
  title: "Daily request rate",
  insight: "Aggregate demand is non-stationary.",
  caption: "Daily request volume rises through mid-2025, peaks around late summer and fall, and then declines into early 2026.",
  definition: "Requests per day over the trace's year.",
  kind: "lines",
  chart: {
    x: TRACE_DAY_AXIS,
    // From zero, so the caption's growth reads at its true ratio, to a little past the busiest day.
    y: { label: "Requests per day", domain: [0, 36e6], tickFormat: formatCountTick },
    valueLabel: "Requests",
    valueFormat: formatCompactCount,
  },
},
```

**The column contract.** A figure's plot-ready table holds the columns of
one chart kind, and its answer is that table, column for column; README's
column contract lists each kind's columns and its figures. The table is
the artifact's: a number the site needs and the table lacks is added
there, never computed in the browser. `tests/insights_cards_answers.test.js`
(`KIND_COLUMNS`) checks every shipped answer against its card's kind.

**Adding a figure.** A figure is the artifact's: it ends at its plot-ready
table and the card's words.

1. **The table.** The artifact writes the figure's plot-ready table in the
   columns of one kind, commits it as
   `data/paper/plotdata/<figure>.parquet` and lists the figure in its
   `config/figures.json`.
2. **The card**, in its topic's module of `js/insights/`, in the group
   whose run it belongs to, in the paper's order. It holds its words, its
   `kind`, and in `chart` the paper's axes (titles, log scales, limits and ticks)
   and its kind's parameters, with `panels`, `legend`, `series` or
   `palette` where the figure needs them. A figure that says something no
   group says starts a group of its own, with a heading and a takeaway (a
   `// placeholder:` comment above them where they are not the paper's
   words). A check of the card as drawn goes in its topic module's test
   (`tests/insights_caching.test.js` for a card of `insights/caching.js`).
   The test table below names the other tests a card meets.
3. **The answer.** Run `make data ARTIFACT=<the artifact's checkout>`,
   which writes `site/data/all/figures/<figure>.json` and lists it in
   `site/data/all/figures.json`, and commit `site/data` with the change.
4. **The snapshots.** Run `make snapshots` and commit `tests/snapshots`
   with the change. A new card adds units, a new group a heading and a
   takeaway to its topic's text unit; no other unit may move.

**The patterns a card copies.**

- *Fixed series colours.* The global series and the three highlighted
  models take the same colour on every card (`FIXED_SERIES_COLOURS` of
  `insights/card_series.js`). A card of these series lists them in
  `HIGHLIGHTED_SERIES` order, labels them with `HIGHLIGHTED_LABELS`, and
  draws the global series dashed (`dashed: ["Global"]`), its legend swatch
  dashed too.
- *Panels.* A figure of several panels holds a `panel` column; the card
  lists `panels`, as `FigureCard` says (the balancing topic's user zooms
  and the routing card).
- *A legend answer.* Where the paper orders series by a legend of its own,
  the card names the legend answer in `legend`, and its series take the
  legend's ranks (the two monthly shares).
- *Shared axes and colours.* A constant two cards share is exported once:
  the count colour (`COUNT_COLOUR`) from `insights/card_series.js`; the
  trace's day axis (`TRACE_DAY_AXIS`, whose tooltip gives the day's date)
  and month axis (`TRACE_MONTH_AXIS`) from `plot/trace_axes.js`. A card on
  the month axis says what the star of the partial last month means in its
  definition. One topic's axes are constants of its module.

**The chart kinds** (`js/charts/`) are nine modules, one per shape. The
Overview draws `donut`, the Traffic Explorer `stacked_bars`, which also
draws the two monthly shares. The figures draw `lines` (a CDF and the
explorer's distribution charts among them), `bands`, `cells`, `raster`,
`scatter`, `boxes` and `bars`. Each exports one draw function, as the draw contract
in `plot/frame.js` states it; it replaces the place's content with one Plot
chart, except the donut, which draws plain SVG of its own.

- Each module exports `<KIND>_PARAMETERS` (`LINES_PARAMETERS`), the frozen
  list of every parameter name its kind reads: the shared names first,
  `ChartParameters` of `plot/frame.js`, then its own. An axis, `x` or `y`,
  is an `AxisOptions` of `plot/axes.js`, its names listed in
  `AXIS_OPTION_NAMES`. A new parameter goes into its kind's list.
- A kind's draw function's JSDoc opens with "Reads `<KIND>_PARAMETERS`" and
  says what its own names decide; its module's header says what rows it
  takes.
- Its pure functions (the rows drawn, the tooltip's text, a scale's
  options) are exported and tested in `tests/charts_<kind>.test.js`.
- A kind imports only from `shared/`, `plot/` and `theme/`.
- A kind takes only parameters two or more charts use, or a frame or axis
  setting (the stacked bars' `barInset` and `segmentInset`, the lines'
  `gap`, an axis's `inset` and `tickRotate`).
- A kind's tooltip is written by its `…TipText` function, its x after the
  x axis's title (`axisValueText` of `plot/axes.js`), or by the axis's
  `tipFormat` alone where it gives one.

**The legend** (`shared/legend.js`) takes a `Legend` and a `LegendState`,
typedefs at the head of the module; a card gives it its kind's `swatch`
from `CHART_KINDS`. `mountLegend` places the buttons, which hold the hidden
set; `drawWithLegend` places them above a chart and draws it again after
each press.

## JavaScript style

- ES modules only. `import { thing } from "./module.js"`, with the `.js`
  extension; namespace imports only for a library in `libraries.js`.
- Nothing outside `libraries.js` imports it statically: node cannot load
  the CDN's `https://` modules, so a module that did would be untestable.
  A function that draws loads what it needs where it needs it,
  `const { Plot } = await import("../shared/libraries.js");`, with a
  one-line comment saying why. The module's pure functions then stay
  testable with `node --test`.
- The page's module, which node does not run, also starts that import as
  it runs, so that the library loads beside the explorer's daily answer
  rather than once the first chart asks for it. Its failure is ignored
  there, since each chart shows its own.
- Static markup is an `innerHTML` template; interactive elements are built
  with `document.createElement` so listeners attach to the element, not to a
  string. Text that comes from data goes through `textContent` or a template
  the data cannot break.
- One `mount<Thing>(container, ...)` function per component: it draws and
  wires listeners. State lives in the URL or in the arguments; no module
  keeps mutable state beyond what the page owns.
- Loading and error states come from `shared/figure.js`: a section shows
  `loading` until its answer arrives and `is-error` with the message if it
  throws. One failed answer never stops the others.
- Numbers and dates go through `shared/format.js`. The site spec's "Axis
  ticks and number formats" says how each quantity is written; colours and
  marks are its "Chart colours" and "Chart marks".

## Verifying a change

```bash
make test       # the Python tests, the node tests and the snapshot test
make snapshots  # when the change is meant to alter what the page shows
make serve      # then open http://localhost:8000
```

The node step prints one line per test, its name after a tick or a cross.
It lists every failing test again at the end as `test at <file>:<line>`
with its error, so a failure is read from the node step's last lines.
`make test` passes the artifact's checkout as `ARTIFACT`; README's "Running
it" names the tests that skip without one.

| You changed | The test that fails | To update it |
|---|---|---|
| A query's text | `test_built_data.py`: the answer is stale | `make data`, then `make snapshots` if the page moves |
| A query's columns or numbers | `test_queries.py` (`EXPECTED_COLUMNS`, the hand-counted values) | the expected values, if the change is meant |
| The answer writer | `test_answers.py`: an answer against its query run live, a family's rows against the totals | |
| The rest of the data step (`site_data/`) | the test named after its module (`test_loading.py`, `test_months.py`, `test_site_database.py`, `test_main.py` for `__main__.py`), on the fixture artifact | |
| The trace query | `test_tables.py`: the sidecar's hash; with `ARTIFACT`, the table against the daily rollup | `make tables TRACE=…`, then `make data` (README's "Building the data") |
| The figure answers' writer | `test_figure_answers.py`: each answer against its plot-ready table | |
| A figure in the artifact | `test_figures_registry.py`, with `ARTIFACT`; `page_topics.test.js`: every answer the index lists is one card's figure or legend | a card for it |
| A card's words, a topic's or a group's | `insights_cards_words.test.js`; the snapshot's texts unit | `make snapshots` |
| A card's kind, or its answer's columns | `insights_cards_answers.test.js` | the card, or the artifact's table |
| A card's `chart` | `insights_figure_card.test.js` (the parameter lists); its topic's `insights_<topic>.test.js`; the snapshot's chart unit | `make snapshots` |
| A card's fixed domain, or a rebuild that outgrows one | `insights_cards_domains.test.js`, naming the figure, the axis, the domain and the value; the snapshot | the domain, or `INTENDED_CLIPS` with its reason (README's "Building the data") |
| A card's series, palette or legend | `insights_card_series.test.js`; `insights_routing_panels.test.js` for the routing policies | |
| A constant two topics' cards share | `insights_cards_charts.test.js` | |
| Inside a kind's draw function | the snapshot alone, since node cannot load Plot; without Chromium it skips with a framed message | `make setup-browser` once, then `make snapshots` |
| A kind's pure helper | `charts_<kind>.test.js` | |
| The trace's calendar | `shared_format.test.js` (`TRACE_FIRST_DAY`), `plot_trace_axes.test.js` (`TRACE_MONTH_NAMES`) | both copies |
| The explorer's choice or URL keys | `traffic_choice.test.js`, `traffic.test.js`; the snapshot's controls unit | |
| The period buttons or the slider | `traffic_controls_period_buttons.test.js`, `traffic_range.test.js`; the snapshot's range unit | |
| A legend other charts follow | `shared_legend_state.test.js` | |
| The order of the reads | `page_start.test.js`; `shared_answers.test.js` (the head's preload) | |
| A topic | `page_topics.test.js`; the snapshot states | |
| `index.html`'s title, module or sections | `page_index.test.js` | |
| A part `renderFigure` appends | `shared_figure.test.js`: the card grid's span | the span in `style.css` |
| A colour token | `palette_contrast.test.js` | name the token's role there |
| A module's length, a folder's size, an import, a global set in a test | `test_repository.py` | split the module |
| A name exported twice, or a test file's name | `test_naming.py` | |
| A module or folder added, moved or renamed | `test_readme.py` | README's Layout |
| A module header over ten lines | nothing: `module_headers.test.js` lists it for review | look again; keep a sentence a reader needs |
| `style.css`, beyond its colours and the card grid's span | nothing: the snapshot reads text, not pixels | look at 360 px and at desktop width, light and dark |
| The deploy workflow's paths | `test_deployment.py` | |

No node test runs a `Plot.plot` call, so the snapshot test is the one
check of a draw function.

**The node tests' browser.** The node tests drive the page's modules on
the fake page of `tests/fake_page.js`, the one import through which a test
reaches the browser. `tests/test_repository.py` fails on any other file of
`tests/` that sets or mocks a property of `globalThis`. A test reaches an
element by a selector of a form `tests/fake_element.js` reads, never by its
place among an element's children. What two test files of one folder share
lives in `tests/<folder>_fixtures.js`, as README's Layout lists them.

**The snapshot test** (`tests/snapshot.py`, whose header says what it
reads) ends `make test`. It fails with the name of each unit that changed.
A change that is meant to alter a chart or a text, a data rebuild among
them, runs `make snapshots` to rewrite the files and commits them with the
change. The diff of `tests/snapshots/` is reviewed like code: it is what a
visitor will see differently, and a line there that the change did not
mean to move is a bug. A change that should alter nothing a visitor sees,
such as a refactoring, leaves the snapshots as they are. A unit is named
by its card's title, so a retitled card shows as a "new" unit and its old
one as "no longer shown". The test reads each state once, when it has
drawn, and waits on conditions, never on time (`wait_until_drawn`). A part
of the page that is drawn later than these adds its own condition there.

**By hand.** Before committing anything that touches the page:

- open it at 360 px wide and at desktop width, in light and dark mode;
- check that the console is clean;
- check that a Traffic Explorer choice survives a reload, opens the same
  from a copied link, and follows Back and Forward.

`make setup-browser` installs a headless Chromium; a short Playwright
script from the virtual environment (`.venv/bin/python`) can open
`http://localhost:8000`, collect the console and take the screenshots.

One task per commit, `make test` green at every commit. Commit messages say
what changed and why in one line, and end with the attribution lines the
repository's `CLAUDE.md` gives.
