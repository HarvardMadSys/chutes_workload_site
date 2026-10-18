# Contributing

This site will be read, run and maintained by people who did not write it. A
reader must be able to follow any module on a first read. The rules below are
binding, and `make test` checks the countable ones.

## Words

Each word below has one meaning in the code, the tests and these documents.

- **the page**: `site/index.html`, the site's one page, started by `js/page/main.js`.
- **section**: a part of the page under its own heading: hero, Overview, Traffic Explorer,
  Insights, Cite, Team. A section that reads answers is *run*: `run(container, context)`.
- **Overview**: the section of the two mixes, `#overview`. Nothing else is called so.
- **mix**: one of the Overview's donuts: the requests' shares by family or by endpoint group.
  `context.mixes` holds the two answers' rows.
- **Traffic Explorer**, or **the explorer**: the section of bars, tiles and distributions, `js/traffic/`.
- **choice**: what the explorer shows, kept in six URL keys: family, model, endpoint, metric, from, to.
- **tile**: one of the explorer's four numbers.
- **topic**: one of the Insights' six tabs, listed in `js/page/topics.js`. The first is the
  workload (`insights/workload.js`); its anchor stays `#insights-overview` for shared links.
- **group**: a topic's heading, takeaway and grid of cards.
- **figure**: a titled chart with its caption and Definition, as `renderFigure` lays it out.
  **card**: one of the paper's figures (`fig_…`) in a topic, with its words.
- **panel**: one of several charts in one card, drawn from the rows whose `panel` column names it.
- **answer**: a JSON file under `site/data/all/` that the page reads by name. A *query answer*
  comes from a `.sql` file; a *figure answer* is the artifact's plot-ready table and runs no query.
  In a data path, `explore/` means the query answers, not the explorer.
- **trace day**, **trace week**, **trace month**: one day, seven days, a month-long stretch,
  counted from the trace's first day, 2025-04-11; not calendar weeks or months.
- **chart**: what one draw function draws into one body. **kind**: one of the nine ways to
  draw one, a module of `js/charts/`.
- **Plot**: Observable Plot, the charting library. `js/plot/` holds what every kind gives it:
  the frame, the axes, the trace's axes.
- **series**: the names a chart draws, each a line, a slice or a stack of segments.
- **breakdown**: how rows split into series: `BY_FAMILY`, `BY_MODEL` or `BY_ENDPOINT`.
- **legend**: the buttons above a chart that hide and show its series; one button is an *entry*.
- **slot**: one of the theme's series colours. **palette**: which slots a card's series take.
- **container**, **place**, **body**: the elements the code fills: a section's `container`
  from `index.html`, a figure's `place` that `renderFigure` lays out, a chart's `body` that
  a kind draws into. `showLoading`, `showNote` and `showError` take any of the three.
- Verbs: **run** a section; **render** markup once from data; **mount** render and listen;
  **place** lay out empty elements to fill later; **draw** a chart; **show** a state.
- **state** and **unit**: the snapshot test opens the page in six states, one per topic, and
  reads each unit (a chart, a legend, a block of text) as text.
- **placeholder**: `// placeholder:` marks words that are not the paper's own, for the authors.

## The rules

- **Simple before fast.** Write the plainest correct code. Cache, precompute,
  split a file or add an index only after a measured run shows the plain
  version is too slow, and record the measurement in the change's
  `design.md`.
- **Plain over clever.** No nested comprehensions, no lambdas or arrow
  functions longer than one expression, no state set on objects the code does
  not own, no side effects at import.
- **Names are words.** `requests`, `models`, `days`, `endpointGroup`. A
  one-letter name is only a loop index. Python modules are imported by name
  without aliases; JavaScript uses named imports. A name one module of
  `site/js/` exports, no other exports: a second takes its kind or its
  section in its name (`drawTrafficBars`, `stackedBarTipText`).
- **One job per unit.** A function is at most 50 lines, a module at most 300,
  a folder of `site/js/` at most nine modules. A function that computes two
  things is split.
- **Docstrings state definitions; comments explain why.** A module's header
  (its docstring in Python, its opening comment in JavaScript) says what the
  module holds and the shape of what crosses its boundary: the rows it reads,
  the objects it takes and returns. Every export has a docstring (Python) or
  JSDoc (JavaScript) that states its definition: what it returns, for which
  input. A constant that is a decision gets a name and a one-line comment
  saying what it decides. A comment inside a function says why, in one line.
  None tells how the code came to be, who did what, or a paper figure number;
  history is in git. A header over ten lines is a sign to look again, not a
  failure: `tests/module_headers.test.js` lists each as a warning, and a
  sentence a first-time reader needs stays, however long the header; none is
  cut to reach a count.
- **SQL is a literal.** Every query is one `.sql` file under `site/queries/`.
  No SQL is written in JavaScript or in the data step, and no query is
  assembled from strings. A query takes at most one parameter, the family
  (`$family`), bound by name by DuckDB and never written into the text. A
  query of `queries/explore/` or `queries/setup/` reads the site's eight
  tables and nothing else (`SITE_TABLES` in `tests/test_queries.py`):
  - the artifact's three caches, each the table of its file's name:
    `trace_totals`, `daily_rollup` and `function_name_daily_requests`;
  - `chute_models`, the artifact's model names (`chute_id`, `name`), and
    `model_families`, its family table (`match_order`, `family`,
    `pattern`), which no answer matches a name against: a row's family is
    the daily rollup's or the trace table's;
  - `trace_calendar`, made by `site_data/months.py`: each trace day's
    calendar day, its trace month and the calendar month that trace month
    is labelled with. It is the one place the data step computes a date; a
    query joins it rather than doing date arithmetic. The site's
    JavaScript holds two copies for its axes and tooltips: the trace's
    first day, `TRACE_FIRST_DAY` of `shared/format.js`, which
    `tests/shared_format.test.js` checks against the shipped `trace_totals`, and
    the months' names, `TRACE_MONTH_NAMES` of `plot/trace_axes.js`,
    which `tests/plot_trace_axes.test.js` derives from that first
    day by `months.py`'s rule; a change to the calendar is made in both,
    and those tests fail until it is;
  - `family_models`, the rows of `setup/family_models.sql`: the daily
    rollup's named models ranked within their family. A family's answer
    takes its eight from it;
  - `weekly_histograms`, the site's trace table, `tables/weekly_histograms.parquet`,
    which `make tables` builds and `make data` loads.

  The one query over the trace, `queries/trace/weekly_histograms.sql`,
  reads the view `trace` and `chute_models`, `model_families` and
  `family_models`, and nothing else (`TRACE_QUERY_TABLES`, in the same
  test file).
- **Every definition comes from the artifact.** A query filters, groups,
  counts and sums; none restates a definition the artifact owns, and neither
  a query nor the browser decides what a user, a model's name, an endpoint
  group or a trace month is. A number no cache holds is
  added to the artifact as a cache, in its caching pattern, and then read
  here. The one exception is the trace table: the site reads the
  released trace once, in `make tables`, and its trace query applies the
  artifact's family rule and endpoint groups to the trace's rows, held to
  the artifact's by a test that compares the table with the daily rollup
  (`tests/test_tables.py`). Nothing else reads the trace.
- **No framework, no bundler, no npm dependency.** Plain HTML, CSS and ES
  modules. Libraries come from a CDN at exact versions, named only in
  `site/js/shared/libraries.js`.
- **Only what is needed.** Add a module, a column, a token or a dependency
  when a task needs it, not before.

## How the site is put together

```
make tables: the released trace as the view trace, and the artifact's chute_models.csv, model_families.csv and daily
               rollup (for family_models)  →  queries/trace/weekly_histograms.sql  →  tables/weekly_histograms.parquet
               and its sidecar, tables/weekly_histograms.json
make data:  the artifact's caches, chute_models.csv and model_families.csv, and tables/weekly_histograms.parquet  →
              eight tables in DuckDB, with trace_calendar and family_models  →  queries/explore/<query>.sql  →
              data/all/explore/<query>.json (a family query's data/all/explore/<query>/<family>.json, once per
              family) and data/all/queries.json
            the artifact's config/figures.json and data/paper/plotdata/<figure>.parquet  →  data/all/figures/<figure>.json
              and data/all/figures.json
The page:   index.html  →  js/page/main.js  →  js/page/start.js, the section modules and js/shared/
              →  data/all/explore/<query>.json and data/all/figures/<figure>.json
```

README's Layout maps every folder and module, and `tests/test_readme.py`
checks that each path it names exists.

- `index.html` is a shell: a header, titled sections with ids, a footer,
  and one `<script type="module">`. It holds no data and no inline script.
  It holds the page's sections: the hero and stats strip, the Overview
  (`#overview`), the Traffic Explorer (`#traffic`), the Insights
  (`#insights`), Cite (`#cite`) and Team.
- The page's module, `js/page/main.js`, lists its sections in
  `SECTIONS`, each `{ id, run }`, starts the charting library's load
  (see "JavaScript style") and calls `startPage` of `page/start.js`
  with the sections. `startPage` asks for the answers the sections share,
  places the Insights' groups and cards and their tabs, draws the header
  and the footer, and runs each section as `run(container, context)`;
  `context` is described in `page/start.js`. Its `mixes` are the rows of
  `explore/family_mix` and `explore/endpoint_mix`, asked for once: the
  donuts' rows, and the order every chart, the Insights' cards among
  them, colours the endpoint groups by.
- The header links the page's sections by anchor alone (`LINKED_SECTIONS`
  of `shared/layout.js`); its brand links the page with the URL's keys. On
  a phone it is two rows, the brand and the four links, which wrap, and the
  page measures its height for the sections' scroll margin.
- `shared/answers.js` reads a query's answer by name:
  `readAnswer("explore/trace_totals")` reads
  `data/all/explore/trace_totals.json`, which `make data` wrote by running
  `queries/explore/trace_totals.sql`; `readAnswer("figures/<figure>")`
  reads a figure's plot-ready rows. The page runs no query.
- The Insights' six topics are tabs (`page/topic_tabs.js`), following
  the ARIA tabs pattern (one tab stop, the arrow keys, Home and End, each
  topic a tab panel): one is shown and the others hidden, the shown one
  named by the URL's hash and kept in the history entry's state; a tab
  chosen pushes a new entry with its topic, so Back returns to the topic
  before. `page/start.js` is the page's one listener of `popstate`
  (`followHistory`): on Back or Forward it shows the entry's topic, draws
  the header from the entry's query and tells each section that asked
  through `context.onReturn`. `page/topics.js` lists the topics in
  `TOPICS`, one module each in `js/insights/`, and `index.html`
  holds, under the Insights heading and its `#topic-tabs` row, a section
  with a heading for each, its id the topic's anchor. `placeTopic` of
  `page/start.js` writes the rest of a topic's section: its takeaway,
  then for each group its heading (an `h3`), its takeaway and a card grid
  of its cards, each card's title an `h4`. A topic's answers are fetched
  the first time it is shown, so a topic never shown requests none.
- **The order of the reads.** The explorer's answers come first, as the
  page's largest. `index.html`'s head preloads the explorer's daily
  answer by family (`<link rel="preload" as="fetch" crossorigin>`), so
  the browser starts it with the stylesheet, before the modules have
  loaded; `tests/shared_answers.test.js` checks that the preload names the file
  `readAnswer` reads for `FAMILY_QUERY` of `traffic/traffic.js`. The
  hero's and the Overview's answers are read as the page starts; the
  explorer reads its histogram answer once its bars are drawn; and
  `startPage` draws the Insights' opening topic once every section has
  drawn or shown its error (`Promise.allSettled`), so its figure answers
  are read last. A tab pressed before then draws its topic at once, and
  the opening topic is never drawn twice. A family's answers are read
  when the family is first chosen; nothing is read for a topic not shown
  or a family not chosen. `tests/page_start.test.js` runs the page's
  start with the explorer on a fake page and checks this order.
- **The Traffic Explorer's URL keys.** The explorer's choice is the URL's
  `family` (a family's slug, `daily_by_family`'s `family_slug`), `model`
  (within the family, a named model's `chute_id`, or `other` for its other
  models), `endpoint` (an endpoint group: `chat`, `chat_stream`,
  `completion`, `completion_stream`, `other`), `metric` (`input_tokens`
  or `output_tokens`; requests when absent) and `from` and `to` (the first
  and last chosen day, `YYYY-MM-DD`). `traffic/traffic_filter.js` is their
  one home: `readTrafficChoice` reads them when the page starts, a value it
  does not know falling back to everything (a `model` with no `family`, or
  not among the family's, too); the days follow the day range's rules of
  `traffic/traffic_range.js` (`clippedRange`): a day outside the trace is
  clamped to its nearer end, a `from` after its `to` is dropped with it,
  and a range that starts on the trace's first day or ends on its last
  writes no `from` or no `to`; the URL is then rewritten so. There is no
  `period` key: a `period` is neither read nor written. `writeTrafficChoice`
  writes the keys on every change, through
  `context.replaceQuery`, which replaces the history entry rather than
  adding one; the day range's slider writes its range when a handle is
  released. The period buttons set `from` and `to` to their quarter's
  days within the trace. `traffic/traffic_controls.js` keeps the
  controls and the URL in step: on Back or Forward (`context.onReturn`) it
  reads the keys again, and an entry of another choice is shown and drawn.
  The default, everything, writes no key; a key the explorer does not read
  is left as it is; and the keys change nothing outside the explorer.

**Adding a section.** Give it a place in `index.html`, an element with an
id, under a heading if it is a part of its own; write its module with
`async run<Thing>(container, context)`, which shows the loading state in the
container at once and then draws its answer into it; and add `{ id, run }`
to the page module's `SECTIONS`. A section of `main.page` is laid out
at the page's width by the stylesheet's `.page > section`, which caps it
at the page's width less the gutters, `.page` keeping the gutters as its
padding; the Traffic Explorer's `#traffic` alone is uncapped. A new
topic of figures is a module of `js/insights/` instead, added to
`TOPICS` and to `index.html`'s Insights, where it becomes a
tab.

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
that is a choice carries a comment (`AND family_models.rank <= 8  -- the
eight models a family's drop-down names`). Every query is run by
`tests/test_queries.py` against the fixture artifact, which checks its
columns against `EXPECTED_COLUMNS`, the tables it reads against
`SITE_TABLES`, and its numbers against values counted by hand.

**A query that takes the family** (`site/queries/explore/daily_by_model.sql`):

```sql
-- One row per calendar day, model and endpoint group of the family `$family`, the query's one parameter, bound by name:
-- ...
LEFT JOIN family_models ON family_models.chute_id = daily_rollup.chute_id
                       AND family_models.rank <= 8  -- the eight models a family's drop-down names
WHERE daily_rollup.family = $family
```

A query takes at most one parameter, the family, written `$family` and
named in the query's first line. DuckDB binds it by name
(`site_database.run_query(connection, name, {"family": "DeepSeek"})`);
the value is never substituted into the text, so no family's name can
change the SQL. Listing the query in `FAMILY_QUERIES` of
`site_data/answers.py` makes the data step answer it once per family, as
below, and record its hash once, the text being the same for every
family; `tests/test_queries.py` runs it with the family of
`QUERY_PARAMETERS` bound.

**One answer per query.** Every query under `queries/explore/` is answered
by `make data`, once, over the whole trace: its rows in
`data/all/explore/<query>.json`, and every answer is read by the page. A
query that takes the family (`FAMILY_QUERIES` of `site_data/answers.py`,
`explore/daily_by_model` and `explore/histograms_by_model`) is answered
once per family of
`explore/daily_by_family`, each family bound as `$family` and its rows
written to `data/all/explore/<query>/<family_slug>.json`, the slug being
`daily_by_family`'s `family_slug` column, the one place a slug is made. A
query under `queries/setup/` makes a table of the site's database and is
not answered. `make data` also records the hash of the text of every query
the answers depend on, the answered ones (a family query once) and
`setup/family_models`, in
`data/all/queries.json`. **Rerun `make data` after editing a query**: the
page reads the answers, not the queries, and `tests/test_built_data.py`
fails while a query's text differs from the one its answer was written
from. `tests/test_answers.py` checks each answer written for the fixture
against its query run live there.

**A list-valued answer** (`site/queries/explore/histograms_by_family.sql`):
a query whose rows hold lists builds each with DuckDB's ordered `list`,
one list per column, all in one order:

```sql
       list(bin_requests.bin ORDER BY bin_requests.bin) AS bins,
       list(bin_requests.requests ORDER BY bin_requests.bin) AS requests
```

The answer writes each list as a JSON array of numbers, and the page
reads the two lists of a row together, the requests of `bins[i]` being
`requests[i]`; the same information as a row per bin, in a fifth of the
bytes. The page reads a histogram answer only after the bars it goes
with are drawn, so the bars never wait for it.

**The trace query** (`site/queries/trace/weekly_histograms.sql`): the one
query over the released trace, run by `make tables` (`site_data/tables.py`)
rather than `make data`. The trace is the view `trace`, made by DuckDB's
Python API from the file `TRACE=` names, so no path is written into the
SQL; the query reads it with `chute_models`, `model_families` and
`family_models`, sorts its rows by every key so that a rebuild writes the
same bytes, and its result is the trace table,
`tables/weekly_histograms.parquet`, tracked. Its sidecar,
`tables/weekly_histograms.json`, records the hash of the query's text
and the trace's and the table's row counts; `tests/test_tables.py` fails
while the hash differs from the query's text, as `all/queries.json` does
for the answers. **Rerun `make tables` after editing it**, then `make
data`. The query is tested over the fixture's small trace
(`fixture_artifact.TRACE_REQUESTS`) against histograms counted by hand.

**Adding a query.** Write `site/queries/explore/<name>.sql` as above; list
its columns in `EXPECTED_COLUMNS` of `tests/test_queries.py` and test its
numbers on the fixture there; raise the count of answers in
`tests/test_answers.py`; run `make data ARTIFACT=<the artifact's checkout>`
and commit `site/data` with the change; read it in the page with
`readAnswer("explore/<name>")`; then run `make snapshots`.

**A pure JavaScript module with its test** (`site/js/shared/format.js`,
`tests/shared_format.test.js`): a header saying what the module holds, exported
functions each with a JSDoc stating its definition, module-level constants
with a comment, helpers below the exports, and a `node --test` file with one
`test()` per behaviour.

**A Python module with its test** (`site_data/months.py`,
`tests/test_months.py`): a module docstring stating the definition, a
frozen dataclass for anything that crosses a boundary, and functions that
each do one job.

**A link off the site** (`externalLink` of `shared/layout.js`, the hero's
buttons in `sections/hero.js`): it opens in a new tab and ends in an arrow,
which the stylesheet draws after its text (`a[target="_blank"]::after`).
The hero's Dataset, Paper and Code buttons and the footer's Elsewhere
links name a mark in their entries, `mark: "huggingface"`, `"document"`
or `"github"`, and are written with `linkMark(name)` of
`shared/link_marks.js` before their text: an inline `<svg>` of one path
filled with `currentColor`, so it takes the link's colour in either
scheme, hidden from screen readers, one em square by the `.link-mark`
rule. An entry with no `mark` is written without one, as the Cite
sentence's link to the paper is. `linkMark` throws on a name that is no
mark's rather than writing "undefined". A new mark is one path added to
`LINK_MARKS`, its source named in the module's header;
`tests/shared_link_marks.test.js` checks the marked links and that no link on
the site carries a mark.

**A topic and its groups.** A topic of the Insights holds its cards in
groups, each a run of the paper's figures that says one thing together:

```js
{ selector, takeaway, groups: [{ heading, takeaway, cards }] }
```

A topic's `selector` is its section in `index.html`; its `takeaway`, the
paper's finding for its section in plain words, is one sentence of at
most thirty words, written under its heading. A group's `heading` is at
most six words, with no full stop; its `takeaway`, what its figures show
and, where the paper draws one, what that means for a serving system, is
at most two sentences and forty words; its `cards` are in the paper's
order. A topic module freezes the topic, each group and each `cards` list, and
`topicCards(topic)` of `page/topics.js` lists a topic's
cards group by group, the one way the tests list them.
`tests/insights_cards_words.test.js` counts these limits and a card's below;
`TOPIC_FIELDS` and `GROUP_FIELDS` in
`tests/page_topics.test.js` list the fields.

**A figure card.** Every figure of the Insights is drawn by the site from
its answer, the artifact's plot-ready table, by one frozen card object of
the fields below, and of no other:
`CARD_FIELDS` and `OPTIONAL_CARD_FIELDS` in
`tests/page_topics.test.js` list them.

- `figure`: the figure's name, its file name in the artifact's
  `config/figures.json` without `.pdf`; the card draws
  `data/all/figures/<figure>.json`.
- `title`: the card's heading.
- `insight`: the card's point, under its title: one sentence of at most
  twenty words, the paper's lead-in for the figure. It is also the chart's
  accessible name, after the title.
- `caption`: evidence for the insight, under the chart, in up to three
  short sentences and at most forty words: the paper's caption.
- `definition`: what is drawn, in plain words, in up to three short
  sentences and at most sixty words, alone behind the Definition control:
  the artifact's README's account of the figure, naming no cut-off used to
  pick its rows and no bin width.
- `kind`: the chart kind that draws it, a key of `CHART_KINDS` in
  `insights/figure_card.js` (`cdf` is the lines kind with a share axis).
- `chart`: the parameters handed to the kind's draw function: its axes,
  `valueLabel`, `valueFormat` and the kind's own (`js/charts/<kind>.js`).
- `panels` (optional): `[{ panel, title, chart }]`, one chart per panel of
  a multi-panel figure, from the rows of its `panel`, under its title.
- `legend` (optional): the name of a legend answer, rows `{ series, rank }`,
  whose order the card's series take.
- `series` (optional): the names of the series drawn, in the order they are
  drawn and listed in the legend; the answer's other series are left out
  (the stacked bars fold them into "Other").
- `palette` (optional): the colour slots the series take, a key of
  `PALETTES` in `insights/card_series.js`: `"series"`, the eight series
  slots, when not given; `"families"`, the ten, for more than eight;
  `"endpoints"`, the Overview's endpoint colours; `"policies"`, a colour
  per routing policy.
- `isWide` (optional): true for a card that takes its group's whole width.

A line of words that is not the paper's own carries a `// placeholder:`
comment above it, for the authors to review.
`insights/figure_card.js` draws the card: it reads the answer, colours the
series (`insights/card_series.js`: the global series and the three
highlighted models in fixed colours, `FIXED_SERIES_COLOURS`, the others
the free slots of its palette in the order of its `series`, else the
answer's), places a legend of buttons where there
is more than one series (none where each panel holds one series, which
its title names), and draws the chart by its kind at the card's width. A
topic makes each card with `frozenCard` of the same module, which freezes
the card and every object it holds, its chart and panels included.

```js
frozenCard({
  figure: "fig_request_rate_day",
  title: "Daily request rate",
  insight: "Aggregate demand is non-stationary.",
  caption: "Daily request volume rises through mid-2025, peaks around late summer and fall, and then declines into early 2026.",
  definition: "Requests per day over the trace's year.",
  kind: "lines",
  chart: {
    x: TRACE_DAY_AXIS,
    // From zero, so the caption's growth reads at its true ratio; the busiest day, 34.9M, sits under the top.
    y: { label: "Requests per day", domain: [0, 36e6], tickFormat: formatCountTick },
    valueLabel: "Requests",
    valueFormat: formatCompactCount,
  },
}),
```

**The column contract.** A figure's plot-ready table holds the columns of
one chart kind, and its answer is that table, column for column; README's
"Where the numbers come from" lists each kind's columns and its figures.
The table is the artifact's: the figure's reproduce script writes it and
draws the paper's PDF from it (the rasters and the density and P90 grids
from the points it bins), so a number the site needs and the table
lacks is added there, never computed in the browser.
`tests/insights_figure_card.test.js` (`KIND_COLUMNS`) checks every shipped
answer against its card's kind.

**Adding a figure.** A figure is the artifact's: it ends at its plot-ready
table and the card's words.

1. **The table.** The artifact writes the figure's plot-ready table in the
   columns of one kind, commits it as
   `data/paper/plotdata/<figure>.parquet` and lists the figure in its
   `config/figures.json`.
2. **The card**, in its topic's module of `js/insights/`, in the group
   whose run it belongs to, in the paper's order: its words, its `kind`,
   and in `chart` the paper's axes (titles, log scales, limits and ticks)
   and its kind's parameters, with `panels`, `legend`, `series` or
   `palette` where the figure needs them. A figure that says something no
   group says starts a group of its own, with a heading and a takeaway (a
   `// placeholder:` comment above them where they are not the paper's
   words). Raise its group's count in `GROUP_CARD_COUNTS` of
   `tests/page_topics.test.js`, or add the new group's count
   there in its place, which also checks that the
   cards draw every answer of the index once (the shared legend is named by
   two cards); `tests/insights_figure_card.test.js` checks that its answer
   has its kind's columns; `tests/insights_cards_words.test.js` counts the words of
   its insight, caption and definition; and, with `ARTIFACT`,
   `tests/test_figures_registry.py` checks that the cards draw every figure
   the artifact lists, and no other.
3. **The answer.** Run `make data ARTIFACT=<the artifact's checkout>`,
   which writes its answer to `site/data/all/figures/<figure>.json` and
   lists it in `site/data/all/figures.json`, and commit `site/data` with
   the change.
4. **The snapshots.** Run `make snapshots` and commit `tests/snapshots`
   with the change: a new card adds units, a new group a heading and a
   takeaway to its topic's text unit; no other unit may move.

**The patterns a card copies.**

- *Fixed series colours.* The global series and the three highlighted
  models take the same colour on every card (`FIXED_SERIES_COLOURS` of
  `insights/card_series.js`); a card of these series lists them in
  `HIGHLIGHTED_SERIES` order, labels them with `HIGHLIGHTED_LABELS`, and
  draws the global series dashed (`dashed: ["Global"]`), its legend
  swatch dashed too.
- *Panels.* A figure of several panels holds a `panel` column; the card
  lists `panels`, each drawn as its own chart under its title from its
  rows, with the card's `chart` and the panel's own parameters, under one
  legend (the balancing topic's user zooms and the routing card). A
  panel's `chart.series` names the series it draws, the others left to
  the other panels; the legend still lists them all.
- *A legend answer.* Where the paper orders series by a legend of its own,
  the card names the legend answer in `legend` and its series take the
  legend's ranks (the two monthly shares).
- *Shared axes and colours.* A constant two cards share, such as the count
  colour (`COUNT_COLOUR`), the trace's day axis (`TRACE_DAY_AXIS`, whose
  tooltip gives the day's date) or its month axis (`TRACE_MONTH_AXIS`,
  ticked by the months' names, the partial thirteenth starred, and inset
  from the plot's edges by its `inset` so its first name clears the y
  axis's lowest label; a card on it says what the star means in its
  definition), is
  exported once, the colour from `insights/card_series.js` and the
  trace's axes from `plot/trace_axes.js`; one topic's axes are
  constants of its module.

**The chart kinds** (`js/charts/`), nine modules, one per shape: the
Overview's `donut` and the Traffic Explorer's `stacked_bars`, and the
figures' `lines` (a CDF among them), `bands`, `cells`, `raster`,
`scatter`, `boxes` and `bars`, the stacked bars drawing the two monthly
shares too and the lines the Traffic Explorer's distribution charts.
These nine chart modules are not quite a card's nine kinds:
`CHART_KINDS` of `insights/figure_card.js` names `cdf`, drawn by
`lines`, and no `donut`, which only the Overview draws, for its two
mixes, by family and by endpoint. Each module exports one draw function of one
interface, `draw<Kind>(rows, body, colours, parameters, hidden)`: the rows
of its answer, the place to draw into, `colours.series` (the Map of its
series' colours in the legend's order), its named parameters (a card's
`chart`, with its kind's and a panel's) and the Set of series its legend
hides; it replaces the place's content with one Plot chart, but the donut,
which is plain SVG of its own drawing. Its module's header says what rows
it takes and its draw function's JSDoc what each parameter decides; its
pure functions (the rows drawn, the tooltip's text, a scale's options) are
exported and tested in `tests/charts_<kind>.test.js`. A kind imports only
from `shared/`, `plot/` and `theme/`. A kind takes only parameters two or
more charts use, or a frame or axis setting (the bars' `margins`, `inset`
and `xTickRotate`, the stacked bars' `segmentInset` and `xInset`, the
lines' `gap`).
Every Plot kind takes `height`, the chart's height in pixels,
`CHART_HEIGHT` (240) when not given (`titledFrame` of `plot/frame.js`);
the two cards of a grid row take the same height, so the row stays level.
Every Plot kind but the raster has a tooltip, written by the kind's
`…TipText` function, its x after the x axis's title (`axisValueText` of
`plot/axes.js`), or written by the axis's `tipFormat` alone where it
gives one (a trace day with its date; the stacked bars take it as
`xTipFormat`, the Traffic Explorer's day bars writing the whole day where
a tick names only the month; the cells write each edge of a cell's range
by it, after the axis's title); the donut's slices carry their tooltip as an
SVG `<title>` each. The lines kind joins a CDF's points with straight
lines, its tooltip naming the point nearest the pointer in x and y; with
`tipAllSeries` its tooltip lists every drawn series' value at the hovered
x, highest first, and with `series` it draws only the series named (a
panel's own).

## JavaScript style

- ES modules only. `import { thing } from "./module.js"`, with the `.js`
  extension; namespace imports only for a library in `libraries.js`.
- Nothing outside `libraries.js` imports it statically: node cannot load
  the CDN's `https://` modules, so a module that did would be untestable.
  A function that draws loads what it needs where it needs it,
  `const { Plot } = await import("../shared/libraries.js");`, with a
  one-line comment saying why. The module's pure functions then stay
  testable with `node --test`. The page's module, which node does not
  run, also starts that import as it runs, its failure ignored there
  since each chart shows its own, so that the library loads beside the
  explorer's daily answer rather than once the first chart asks for it;
  the URL keeps its one home.
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
- Numbers and dates go through `shared/format.js`.

## Charts

Every chart is drawn with Observable Plot, the donuts as plain SVG; the
Insights' figures are drawn from their plot-ready tables.

- **Colour.** Series colours are the tokens `--series-1` to `--series-8` in
  `style.css`, assigned in that order to a chart's series and never cycled;
  a ninth series folds into "Other" (`--series-other`). The exceptions
  are the families, in the Traffic Explorer's chart and the Overview's
  family mix alike, which name all ten named families and so take two
  more, `--series-9` and `--series-10` (`familyColours`), and the
  Insights' cards of more than eight series, the two monthly share cards
  (the `families` palette of `insights/card_series.js`), which take the
  same ten slots in their legend's order. The families
  take the slots from the first, in the order of their requests
  (`explore/family_mix`'s, and the explorer's `familyOrder`), and the
  endpoint groups from `ENDPOINT_FIRST_SLOT`, in
  `explore/endpoint_mix`'s order, so the two donuts do not open on one
  colour; in the Traffic Explorer a family's models take the slots in the
  order of their requests within the family. The palette is Open Data's tokens
  (paper, surfaces, inks, rule and crimson) in light and the same inks
  turned over in dark, with ten series slots: ten OKLCH hues no two
  closer than 30°, each the same hue in both schemes, set apart in
  lightness so that a red-green colour-blind reader can tell every pair
  apart. `tests/palette_contrast.test.js` is the validation: it reads both
  schemes from `style.css` (through `tests/palette.js`) and checks every
  series colour at 3:1 on its scheme's card, every text colour at 4.5:1 on
  the paper and on a card, each slot's hue across the schemes, the hues'
  spread, and every pair of slots at an OKLab distance of 5 under a
  deuteranopia simulation. A new colour token is named there as text, a
  mark (`--series-*`) or a tint, or the test fails. Protanopia and
  tritanopia are not simulated, so no series is told by its colour alone:
  every chart of more than one series ships a legend, and every chart but
  a raster a hover tooltip. A figure that shades a value (`cells`,
  `raster`, `scatter`) takes a Plot scheme instead, the paper's where it
  names one, with its colour legend above the chart, ticked at the powers
  of ten on a log colour scale.
- **Marks.** A 1px inset on each side of a bar, a 2px gap between bars and
  stacked segments (`BAR_INSET`; none for the Traffic Explorer's day bars,
  which are a pixel or two wide), grid and axes in `--chart-grid` and
  `--chart-axis`, labels in `--chart-label`. A share chart's stacked bars
  take no gap between their segments (`segmentInset: 0`), since a thin
  segment would vanish into it. Text is never coloured by
  series. Bars start at zero. A dashed line, a series' or the line where y
  equals x, is dashed by `DASH` of `plot/frame.js`; a reference level a
  card marks is a dashed rule in the label ink (`referenceRule`): the
  cells' and the scatter's `yReference`, the bars' `reference`, whose label
  sits at the rule's right end; over cells it lies on a halo in the card's
  colour (`haloedReferenceRule`), so its dashes read over any fill. A scatter's dots are outlined in the axis
  ink and a little transparent, so a near-white dot shows on either
  scheme. A bands card shows, in its legend's place, a key naming its two
  bands and its median (`bandKey`), not buttons. A raster's rows are
  centred on their ticks, and rows at least `MIN_ROW_HEIGHT_FOR_RULES`
  pixels tall are parted by a 2px rule in the card's colour; a raster wider
  or taller than its plot is drawn pooled, each pixel the most requests
  among the hours and rows it covers, so no cell vanishes between two
  pixels. A cell's range in its tooltip whose two ends read alike is
  written once, "100%". In a card grid, a chart with no legend sits at the
  foot of its row, so the x axes of a row line up.
- **One axis.** Two measures of different scale are two charts.
- **The card.** A chart's card shows its title (on the Insights an `h4`
  under its group's heading, with its insight under it), its legend above
  the chart (none where it has a single series, but a bands card, which
  shows its key there), its caption under the chart, and a Definition
  control that opens on its definition: alone on a figure card of the
  Insights; with the line of rows it rests on in the two Overview mixes
  and the Traffic Explorer's bars.
  A legend names only what is drawn. After each drawing the chart is named
  for a screen reader by its title and caption, `nameChart` in
  `shared/figure.js`, or by the name it is given.
- **The distribution charts.** The Traffic Explorer's row of three
  charts under the day range (README's "What the site shows") is
  `traffic/traffic_distribution_charts.js`. A chart is keyed everywhere
  by the histogram rows' metric it draws, `input_tokens`,
  `output_tokens` or `ttft`: in `DISTRIBUTION_CHARTS`, in its places and
  in the tiles' percentiles (`choicePercentiles`). It has no card: no
  caption, definition, rows line or legend of its own, the bars' legend
  hiding a series in the bars and the three charts alike.
  `placeDistributionCharts(row)` makes the module's own places, each a
  `div.distribution-chart` of an `h3.figure-title` (level with the bars'
  title, not under it) over a `div.figure-body`, and returns them by
  metric; where the row stands is `explorerCard`'s choice, in
  `traffic/traffic.js`. Each chart is drawn by the lines kind with
  `cdf: true` at the kinds' default height and margins, its y axis the
  share of requests at the kind's ticks, and named by its value and
  "distribution", "Input tokens distribution". Each x axis is log over
  the domain README gives, the same for every choice, its ticks listed
  beside it in `DISTRIBUTION_CHARTS` from the domain's start to its end:
  input tokens at 1, 100, 10k and 1M; output tokens at 1, 1k and 100k;
  TTFT at 10 ms, 1 s and 100 s (`formatTtftTick`). The rows past a
  domain's end are kept, so a line is cut at the chart's edge rather
  than ended before it. A choice none of whose requests records a value
  shows a note in that chart's place. The tiles are numbers only:
  `renderTiles` of `traffic/traffic_tiles.js` replaces the list's
  children with the four `li`, each its value, label and notes.
- **Axis text.** A linear axis asks Plot for `TICK_COUNT` ticks
  (`plot/axes.js`), which gives at most six or seven. The exception is an
  axis of months: the Traffic Explorer's is ticked at the first day of
  each month it shows, and at the range's first day when it falls in its
  month's first half (`LAST_NAMED_FIRST_DAY`) or when the range holds no
  first of a month; on a plot narrower than
  `NARROW_PLOT_WIDTH`, more than `MAX_NARROW_TICKS` ticks are thinned to
  every other one. Its labels are slanted so that thirteen fit a
  card. The explorer's distribution charts are ticked as "The
  distribution charts" says. A figure's axes are the paper's: its
  titles, its log scales, ticked at the powers of ten (every second or
  more past `MAX_LOG_TICKS`), its limits, and its ticks where the card
  gives them, so that a phone's axis does not run its labels together.
  The one exception is the per-user inter-arrival band card, on a
  linear axis to `IAT_CAP_SECONDS` (400 s) that clips its bands, so that
  the median's move over the year shows. One format per
  quantity: an axis's counts as "1k", "600M" (`formatCountTick`); a value
  in a legend, a tooltip, a tile or the stats strip with one decimal kept
  ("129.1k", "94.0%", "4.3 s", and three figures in billions, "2.04B"),
  a duration in seconds (`formatCompactCount`, `formatShare`,
  `formatSeconds`). An axis of durations from milliseconds to hours is
  written "1 ms", "0.1 s", "15 min", "1 h" (`formatDurationTick`), of
  minutes into a window as hours, "6 h" (`formatHoursTick`), and in a
  tooltip to a tenth, "13.9 h" (`formatHours`), a ratio to
  two significant figures, "0.00047" (`formatSignificant`), and a trace
  day in a tooltip with its date, "Day 150 · Sep 8, 2025"
  (`formatTraceDay`).

## Verifying a change

```bash
make test       # the Python tests, the node tests and the snapshot test
make snapshots  # when the change is meant to alter what the page shows
make serve      # then open http://localhost:8000
```

A change to the trace query, or to the artifact's family table or daily
rollup's kept models, also runs `make tables TRACE=<the released
trace's Parquet file> ARTIFACT=<the artifact's checkout>` first, then
`make data`: it reads the 91 GB trace once, in about half a minute and
16 GB of memory on a 344-thread machine, and `make test` with `ARTIFACT`
then checks the table against the daily rollup.

The node tests drive the page's modules on the fake page of
`tests/fake_page.js`. The explorer's tests reach an element by the fake
page's `querySelector` and `querySelectorAll` (a tag, a `.class`, an
`#id`, a `[data-x]` or `[data-x="v"]`, or a chain of them parted by
spaces, each matched among the descendants of the one before), never by
its place among an element's children, and by the selectors the
stylesheet and `tests/snapshot_traffic.py` use; `controlsOf`, a row's
controls, lives in `fake_page.js` too.

`make test` ends with the snapshot test (`tests/snapshot.py`): it opens
six states of the page in headless Chromium (the page opened at each
Insights topic's anchor) and compares every chart (an Insights card's as
its accessible name, its panels' titles, its colour legend's title and
labelled ticks, and its axes' tick labels and titles), legend and block of
text they show with its text file in `tests/snapshots/`, failing with the
name of each unit that changed. It also fails when the page, opened at a
topic, requested another topic's figure answers. A
change that is meant to alter a chart or a text, a data rebuild among
them, runs `make snapshots` to rewrite the files and commits them with the
change. The diff of `tests/snapshots/` is reviewed like code: it is what a
visitor will see differently, and a line there that the change did not
mean to move is a bug. A change that should alter nothing a visitor sees,
such as a refactoring, leaves the snapshots as they are.

The test reads each state once, when it has drawn, and it waits on
conditions, never on time (`wait_until_drawn`): the topic's tab selected,
no loading line visible, the hero and the footer counting the months,
every chart of the Overview and the Traffic Explorer drawn and named (as
many as `CHART_COUNTS` says), every card of the topic drawn and the first
tile showing a number. A part of the page that is drawn later than
these adds its own condition there. Without Chromium (`make
setup-browser`) the snapshot test skips, saying so. It needs the network,
since the page loads Plot from its CDN and the fonts from Google: offline
it fails, naming each request that failed and its host. A unit is named by
its card's title, so a retitled card shows as a "new" unit and its old one
as "no longer shown".

Before committing anything that touches the page: open it at 360 px wide
and at desktop width, in light and dark mode; check that the console is
clean; check that a Traffic Explorer choice survives a reload, opens
the same from a copied link, and follows Back and Forward. `make setup-browser` installs a headless
Chromium; a short Playwright script from the virtual environment
(`.venv/bin/python`) can open `http://localhost:8000`, collect the console
and take the screenshots.

One task per commit, `make test` green at every commit. Commit messages say
what changed and why in one line, and end with the attribution lines the
repository's `CLAUDE.md` gives.
