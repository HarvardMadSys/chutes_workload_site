# Design: One test harness

## The engineering rules

Binding, as `openspec/config.yaml` and the `site` spec state them: simple,
readable and maintainable first; no optimisation without a recorded
measurement; plain HTML, CSS and ES modules; names that are words; a
function at most 50 lines, a module at most 300, a folder at most nine
modules; every module tested and `make test` green at every commit.
The rules hold for the tests as for the site: a test file is a module.
This change touches `tests/`, the Makefile and the documents' mentions
of test files, and nothing else. No file under `site/`, `site_data/`,
`tables/` or `tests/snapshots/` changes, and the snapshots must not
change.

The names below are those after the earlier changes of the series:

- `distributions-below`: `traffic_distribution_charts.js`; the
  `FakeElement.querySelector` and `querySelectorAll` of its D5 (a tag,
  a class, an id, a data attribute with or without a value, and such
  selectors parted by spaces), tested in `tests/fake_page.test.js`; and
  `controlsOf` in `fake_page.js`.
- `one-vocabulary`: the folders `page/`, `sections/` and `plot/`; the
  modules of its D1, `shared/charts.js` split into `plot/frame.js`,
  `shared/figure.js` and `shared/rows.js` (its D6); and the node test
  files named by its D9: a file starts with the folder of the module it
  tests, a second file of one module adds what it tests after the
  module's name, a check over every Insights card starts
  `insights_cards_`, and `palette_contrast` and `module_headers` keep
  their names. `test_node_test_files_start_with_a_folder` holds that
  rule; this change follows it and adds no naming rule of its own.
- `one-home-per-rule`: a topic is declared once, `{ id, title,
  takeaway, groups }` in its module, with `TOPICS` and `topicNumber` in
  `page/topics.js`; the page writes the topic sections, and the topic
  tabs take their anchors, numbers and titles from `TOPICS` (its D11).
  The snapshot step's loud skip is its D15.

## Decisions

### D1. The exports of `tests/fake_page.js`

`tests/fake_page.js` is the one import through which a node test
reaches the browser. Every later test uses these exports and no other
stand-in for the browser. The element is held in `tests/fake_element.js`
and re-exported here: the fake in one module came to 347 lines, over
the 300 a module may hold, so it is split by what each part holds, the
element (about 200 lines) and the page (about 150), and a test still
imports from `fake_page.js` alone:

```js
/** The address the fake page is opened at, before its query and anchor. */
export const PAGE_ADDRESS = "http://localhost/index.html";

/** An element of the page, or the window: what the page's modules set on it and read from it (D2). */
export { FakeElement } from "./fake_element.js";   // class FakeElement { constructor(tag = "", id = "") }

/** The browser's history as the page uses it: entries, pushState, replaceState, back, forward (unchanged). */
class FakeHistory { constructor(window, address) }   // not exported: a test reads it as `useFakePage(…).history`

/**
 * Make `document`, `window`, `fetch`, `requestAnimationFrame` and `ResizeObserver` stand-ins for the test of
 * `context`, and remove them when it ends (D3). Returns `{ reads, frames, history }`.
 */
export function useFakePage(context, { query = "", elements = [], answers = {}, onRead = () => undefined } = {})

/** What the page reads for `readAnswer(name)`, parsed: `site/data/all/<name>.json`. */
export function shippedAnswer(name)

/** Wait until every promise a click or a draw started, and that can settle, has. */
export function settled()

/** Run the animation frames asked for, as the browser does before it paints. */
export function runFrames(frames)

/** A promise with its `resolve` and `reject`, `{ promise, resolve, reject }`, for an answer the test lets arrive. */
export function deferred()
```

Gone from it: `useFakeDocument` (`useFakePage` with no options does its
job), `FakeFigureBody` (a test draws into the body that `renderFigure`
makes, D2), and what belongs to one section's tests (D5): `EVERYTHING`
and `controlsOf` to the explorer's fixtures, `topicSections` and
`shownIds` to the page's; `TOPIC_ANCHORS` and `TOPIC_TITLES` go (D5);
and `fetchedAnswer` goes, since `useFakePage`'s `answers` do its job.

`fake_page.js` and `fake_element.js` import nothing from `site/`, so
that a fault in a page module never breaks the fake every test stands
on. The page's own tests stay in `tests/fake_page.test.js`, which
`distributions-below` started; the element's are in
`tests/fake_element.test.js`, a helper's test named after it, the one
file that imports `fake_element.js` directly.

### D2. One `FakeElement`

One class, in `tests/fake_element.js` and imported through
`fake_page.js`, serves every element the tests make or the page's
modules create through `document.createElement`, and the window. A
plain object holding the one field a pure function reads is an
argument, not a fake: `chartWidth({ clientWidth: 286 })`. It has, as
plain fields, what the modules set and read: `tag`, `id`, `className`,
`textContent`, `value`, `hidden`, `dataset` (an object), `style` (an
object), `attributes` (a `Map`), `classes` (the set `classList.toggle`
writes), `listeners` (a `Map` from an event's type to its list of
listeners), `children`, `parentElement` (null until appended),
`scrollLeft`, `clientWidth` and `scrollWidth` (0). Any other property a
module sets (`type`, `disabled`, `tabIndex`, `min`, `max`) is a plain
field the test reads back. Its methods:

| Member | What it does |
|---|---|
| `setAttribute(name, value)`, `getAttribute(name)` | read and write `attributes` |
| `addEventListener(type, listener)` | adds `listener` to the type's list |
| `dispatch(type, event = {})` | calls each listener of `type` with `event`, in the order added |
| `append(...children)`, `replaceChildren(...children)` | as the DOM's, each child's `parentElement` set to this element |
| `classList.toggle(name, isOn)` | as now |
| `innerHTML` | reads back the markup last written; writing it also reads into `children` each element of the markup that holds text alone, a tag, at most a class and its text (`<p class="figure-definition-text"></p>`), in order; other markup stays only in the string |
| `querySelector(selector)`, `querySelectorAll(selector)` | `distributions-below`'s walker: the descendants that match, in document order; the first, or null |
| `closest(selector)` | this element or its nearest ancestor through `parentElement` that matches, or null |
| `focus()` | sets `document.activeElement` to this element |
| `scrollIntoView()` | does nothing: the fake page has no layout |
| `getBoundingClientRect()` | `{ left: 0, right: 0 }` |

The selectors are `distributions-below`'s, and one more form of a
simple selector: a tag followed by one data attribute, with or without
a value (`button[data-copy]`, `tag[data-x="v"]`), by which the cite
section's copy buttons are found. This change adds one rule to them: a
selector of any other form (`:not(…)`, `>`, `,`, `[class$=…]`, a tag
with a class or with two attributes) throws an `Error` naming it, so
that a test never passes on a selector the fake misread.

The other additions each replace a private fake:

- `parentElement` and `closest` let `legendPlace` and `chartName` of
  `shared/figure.js` walk up from a body to its figure as in the
  browser. A test that needs a figure's body calls the real
  `renderFigure` on a `FakeElement` and draws into the body it returns.
  `FakeFigureBody`, the legend tests' `legendSlot` and
  `shared_figure.test.js`'s `bodyOfFigure` go.
- The `innerHTML` reading lets the Definition control's
  `details.querySelector(".figure-definition-text")` find its
  paragraph. `FakeCardPart` and `fakeElement()`, whose `querySelector`
  returned a new element on every call, and the figure card's tests'
  own `FakeElement` go.
- `click()`, which the legend's private fake had, is `dispatch("click")`.
  The private fake kept one listener per event type, so a second
  listener replaced the first; the shared fake keeps the list, as the
  browser does.

One selector stays out of reach: `nameChart` finds a chart's SVG by
`svg:not(svg svg):not([class$="-ramp"])`. Its one test, in
`shared_figure.test.js`, gives its body a `querySelectorAll` of its own
in one line, with a comment naming that selector; the snapshot test
checks every chart's name in Chromium.

Not taken: a DOM library (happy-dom or jsdom) as a dev dependency. The
page's modules use about twenty members of an element; the fake that
has them is two modules under 300 lines each (D1), read in one sitting, and its
methods name exactly what the modules rely on. A whole DOM would hide
that, would let a test lean on layout the page does not do in node, and
would be a second npm dependency beside wrangler. Not taken either: a
`Proxy` that answers any property, which would let a misspelt member
pass.

### D3. One `useFakePage`

```js
const page = useFakePage(context, {
  query: "?family=kin",                                 // the address after index.html: query and anchor; "" by default
  elements: [header, tabsRow, explorer, insights],     // what document finds, each with its descendants; none by default
  answers: { "data/all/explore/daily_by_family.json": rows, [KIN_FILE]: kin.promise },
  onRead: (file) => barsAtRead.push(barsState()),      // optional: called as each file is fetched, before its answer
});
// page.reads    the files fetched, in order
// page.frames   the animation frames asked for and not yet run, for runFrames
// page.history  the window's FakeHistory
```

It sets, for the test of `context` alone:

- `document`: `createElement(tag)` makes a `FakeElement`;
  `querySelector`, `querySelectorAll` and `getElementById` search
  `elements` and their descendants, in the order given, with D2's
  selectors; `activeElement` is null until an element is focused.
- `window`: a `FakeElement`, so that it takes `popstate` listeners and
  dispatches them, with `location` (a `URL` of `PAGE_ADDRESS` and
  `query`) and `history`, a `FakeHistory` that moves `location` as the
  browser does.
- `fetch`: through `context.mock.method`, so node restores it. A file
  of `answers` is answered `{ ok: true, json }` with its rows; a value
  that is a promise is awaited, and one that rejects makes the fetch
  reject, as a network failure does; any other file answers `{ ok:
  false, status: 404, statusText: "Not Found" }`. `answers` is read at
  each fetch, so a test may add a file later (the next read succeeds).
  Each file fetched is pushed to `reads` and given to `onRead` first.
- `requestAnimationFrame`: pushes its callback to `frames`; nothing
  runs until the test calls `runFrames(page.frames)`.
- `ResizeObserver`: a class whose `observe` does nothing; the
  scrolling row asks for one.

`document`, `window`, `requestAnimationFrame` and `ResizeObserver` are
deleted in `context.after`: node has none of its own, so there is
nothing to restore. `console` is left alone. A test that expects an
error to be logged mocks `console.error` itself, in one line, and
counts the calls; a fake that silenced the console would hide an
unexpected error from every other test.

The options are one object, every key optional, so that a test of a
legend writes `useFakePage(context)` and a test of the page's start
names only what it needs. `onRead` exists for one test, that the
explorer reads the histogram answer only once its bars are drawn
(`compact-explorer` D4's order). That test must see the bars at the
moment of the read; the alternative, that test faking `fetch` on its
own, is what this change removes.

Not taken: separate `useFakeDocument`, `useFakeWindow` and
`useFakeFetch`. Eight files would combine three calls in different
orders, and a test of the page needs all three.

### D4. One `shippedAnswer`

`shippedAnswer(name)` reads `site/data/all/<name>.json` with
`readFileSync` and parses it, `name` as `readAnswer` names the answer:
`"explore/daily_by_family"`, `"explore/daily_by_model/deepseek"`,
`"figures/fig_seasonality"`, and `"figures"` for the figure answers'
index. It replaces the five copies (in
`insights_cards_caching_balancing`, `insights_figure_card`,
`insights_cards_charts`, `sections_mixes` and `traffic_filter`), the
figure card's tests' `readJson`, and the direct reads of the index in
`page_topics.test.js` and of the trace totals in
`shared_format.test.js`. One name for one answer, the page's: a card's
test writes `shippedAnswer(`figures/${card.figure}`)`.

### D5. Fixtures per section

A value or helper that two test files of one section share lives in
`tests/<section>_fixtures.js`, a helper named for what it holds as
`one-vocabulary` D9 names helpers. One used by one file stays in it.
Each fixture module imports only `fake_page.js`, the site's modules and
`node:assert`.

- `tests/traffic_fixtures.js`: `SHIPPED_ROWS` and `TRACE_DAYS` (the
  shipped daily answer by family and its days, read by the choice's,
  the filter's and the range's tests); `EVERYTHING` (the choice of everything,
  today in `fake_page.js` and redefined in `traffic_filter.test.js` and
  `page_start.test.js`); `DAYS` (the trace's first and last days and
  each quarter's ends); `FAMILIES` (Kin and Other as the family
  drop-down offers them); `KIN_ROWS` and `dayRow(fields)` (a daily row
  of the explorer's answers, every count zero but those given);
  `MOUNT_ENTRIES` and `NO_FAMILY_ENTRIES` (the families and days, and
  the no-family models, the controls are mounted with in both controls
  files); `controlsOf(row)`, from `fake_page.js`; `pressedButtons(buttons)`; and
  `recordingExplorer()` (the page's part the controls are given,
  recording the queries written, the returns asked for, the choices
  drawn and the families whose models were asked for; today
  `useFakeWindow` without its window, written in both controls files).
- `tests/insights_fixtures.js`: `everyCard()`, `everyGroup()` and
  `cardOf(figure)`, over `TOPICS`; today `everyCard` and `cardOf` are
  written twice each and `everyGroup` once beside a third `everyCard`.
  And `tickLabels(figure, axis)`, the tick labels of the axis of a
  card's chart, which the caching and the balancing topics' tests both
  read once D6 parts them.
- `tests/page_fixtures.js`: `topicSections()`, a `section#insights`
  holding one `section#<id>` per topic of `TOPICS`, for a test that
  mounts the tabs without the page's start (a test that runs the start
  gives `section#insights` alone, and the page writes the topics into
  it), and `shownIds(sections)`. The fake keeps no list of topics of
  its own: `TOPIC_ANCHORS` and `TOPIC_TITLES`, which
  `one-home-per-rule` derives from `TOPICS`, go.

- `tests/shared_fixtures.js`: `LEGEND` and `FIGURE` (a legend of two
  series and a figure's words), which the legend's two test files,
  `shared_legend.test.js` and `shared_legend_state.test.js`, share.

Not taken: one `fixtures.js` for every section. It would hold the
traffic choices beside the cards and grow with every section; a test
file imports the fixtures of the section it tests.

### D6. Where the moved tests go

The files keep `one-vocabulary`'s names and rule. This change moves
tests between files in four places, each by that rule:

| Today, after `one-vocabulary` | After this change |
|---|---|
| `insights_figure_card.test.js` | the module's own tests stay: the card's element, its parts, its Definition control, its parameters, a frozen card, a failed read. The checks of every card against its shipped answer (its kind's columns, its panels, its series, its palette, its legend, the index) move to `insights_cards_answers.test.js` |
| `insights_cards_charts.test.js`, `insights_cards_caching_balancing.test.js` | the tests of one card move to the test of the topic module that declares it: `insights_workload.test.js`, `insights_tokens.test.js`, `insights_users.test.js`, `insights_evolution.test.js`, `insights_caching.test.js`, `insights_balancing.test.js`; a test of cards of two topics (the trace's day axis that the daily and the hourly lines share, and the colour of a count that the users' and the caching topics' cards take) stays in `insights_cards_charts.test.js`; `insights_cards_caching_balancing.test.js` goes |
| `shared_layout.test.js` | its two tests of `index.html`'s sections and module move to `page_index.test.js`, the page's file beside its module's |
| `plot_frame.test.js`, `plot_trace_axes.test.js`, `shared_layout.test.js`, `shared_series.test.js`, `theme_colours.test.js`, `page_index.test.js`, `page_topics.test.js`, `sections_hero.test.js`, `sections_team.test.js`, `insights_cards_answers.test.js`, `insights_cards_charts.test.js` | lose or rewrite the tests of D7 |

The Insights' card checks were split in two by size: the caching and
balancing cards in one file and the other four topics' in another, 367
lines together. Split by the topic module that declares each card, a
reader who changes a card in `insights/caching.js` finds its test in
`insights_caching.test.js`. Every name above starts with a folder of
`site/js/`, as `test_node_test_files_start_with_a_folder` requires.

`shared_legend.test.js` and `shared_legend_state.test.js`, and
`traffic_controls.test.js` and `traffic_controls_period_buttons.test.js`,
stay two files each. Once their private fakes and copied fixtures go,
each pair would fit in one file under 300 lines. They stay apart
because `one-vocabulary` names a second file of a module by what it
tests, and merging them would move tests without making one easier to
find.

### D7. Tests that restate data

A test that copies a constant's literal, or a list the code or the data
already holds, fails only when someone changes that value on purpose,
and then they change the test too. It proves nothing and costs every
intended change a second edit. A test that a removed feature stays
removed guards what nothing brings back. These go:

| Test or assert (file after `one-vocabulary`) | Why it proves nothing |
|---|---|
| "a chart's margins hold its 14.6 px tick labels and axis titles" (72, 48, 32), `plot_frame.test.js` | asserts the frame's margins against their own literals |
| `assert.equal(CHART_HEIGHT, 240)` in "a chart is as tall as its card's height", `plot_frame.test.js` | the constant's literal; the same test's next asserts, that a chart takes `CHART_HEIGHT` where its card gives no height and the card's height where it does, stay |
| "a dashed line is dashes of four pixels and gaps of three" (`DASH`), `plot_frame.test.js` | the constant's literal; the legend's "a dashed swatch is its colour in dashes of four pixels and gaps of three" checks the dash as drawn |
| "the percentiles run from the 10th to the 90th" (`PERCENTILES`), `charts_bands.test.js` (already gone, with `one-chart-interface`) | copies the bands' columns; `insights_cards_answers` checks every bands card's answer for them, so a column that moves fails there |
| "the header links no About page", `shared_layout.test.js` | the header's links are checked as an exact list of four by "the header links the page's four sections by anchor alone"; an About link fails that |
| `doesNotMatch(markup, /Copyright\|Accessibility\|footer-legal/)` in the footer's test, `shared_layout.test.js` (its title losing "and no copyright or policy text") | the footer's lists are checked exactly, and its text is a snapshot unit, so a returning line shows there |
| `doesNotMatch(page, /class="eyebrow"/)`, `page_index.test.js` | a removed feature; every section's text is a snapshot unit |
| "the hero has no eyebrow above its title", `sections_hero.test.js` | a removed feature; the hero is a snapshot unit, and "the title is the page's h1" stays |
| "the six topics are in the order of their tabs" (`SELECTORS`), `page_topics.test.js` (already gone, with `one-home-per-rule`) | after `one-home-per-rule` both sides are read from `TOPICS`, so it compares the list with itself |
| "every topic holds its cards in groups of the paper's runs" (`GROUP_CARD_COUNTS`), `page_topics.test.js` | copies the topic modules' groups; a card missing or added fails "every figure answer of the index is one card's figure, or the legend of the cards that name it" and, with `ARTIFACT`, `test_figures_registry.py` |
| "only the two share cards name the legend, and only the ratio, the TTL coverage and the routing are wide" (`SHARE_PANELS`, `WIDE_CARDS`), `page_topics.test.js` | copies three cards' `isWide` and two cards' `legend`; the spec's table names them, and moving a flag is the change itself |
| `assert.deepEqual(Object.keys(PALETTES), [...])` in "a card naming a palette names one of the palettes", `insights_cards_answers.test.js` | copies the object's keys; the test's loop, that every card's palette is one of them, stays |
| "each endpoint group is labelled in words" (`ENDPOINT_LABELS`), `shared_series.test.js` | copies the object; the breakdown's test that `BY_ENDPOINT` labels by `ENDPOINT_LABELS` stays, and the labels are snapshot units in the endpoint legends |
| `SERIES_SLOTS.length === 8`, `[0]` and `[7]` in "the series slots cannot be changed" (once "the eight series slots are the series tokens in order, and cannot be changed"), `theme_colours.test.js` | the constant's literal; the colours names take from the slots are checked by the same file's tests, and `isFrozen` stays |
| `assert.equal(SERIES_COLUMN, "series")` in "a figure's shown rows are its panel's…", `shared_series.test.js` | the constant's literal; the answers' `series` column is `KIND_COLUMNS`' contract, checked against every card |
| `TRACE_DAY_AXIS.label === "Day of the trace"`, `insights_cards_charts.test.js`, and `TRACE_MONTH_AXIS.label === "Month"`, `plot_trace_axes.test.js` | each axis's title literal; the titles are snapshot units of every chart on the axis |
| `REFERENCE_STYLE.stroke === "currentColor"` in "a reference rule is a dashed horizontal rule at its value, haloed over cells, or nothing" (once "… at its value in the label ink, …"), `plot_frame.test.js` | the constant's literal; the rule's style is checked as passed to Plot by the test's other asserts |

Rewritten, not dropped:

- "every figure answer of the index is drawn once, but the share
  legend" no longer names the legend. It reads: every figure of the
  index is one card's figure, or the legend of the cards that name it.
- The Team's test copies its five authors. It becomes: the section
  writes each author as one list item holding a name and an
  affiliation, neither empty. `sections/team.js` keeps a test of its
  own, as every module does.
- `shared_layout.test.js`'s URL keys, `model=qwen3&period=q3`, use the
  `period` key that the page no longer reads. They become live keys,
  `family=qwen&endpoint=chat`, in the header's tests and in the query
  string's, which used `period` too.

Kept: the kinds' columns (`KIND_COLUMNS`), the spec's contract of the
figure answers, and the card's fields (`CARD_FIELDS`), which catch a
misspelt field.

### D8. The fixture's trace table by hand

`tests/fixture_trace.py` holds what the fixture has of the released
trace, apart from the artifact, as the code keeps the two apart:

- moved from `fixture_artifact.py`: `TRACE_SCHEMA`, `TraceRequests`,
  `TRACE_REQUESTS`, `write_fixture_trace` and `fixture_trace_records`;
- moved from `test_tables.py`: the 22 rows counted by hand, as
  `WEEKLY_HISTOGRAMS`, each a `HistogramRow(week, family, chute_id,
  endpoint_group, metric, bin, requests)` named tuple with the bins'
  comment above them; a named tuple equals the plain tuple the query
  returns, so the query's test compares them as now;
- new: `TRACE_TABLE_SCHEMA` (`week` and `bin` int32, `requests` int64,
  the rest strings, as the builder writes them) and
  `write_trace_table(folder)`, which writes `WEEKLY_HISTOGRAMS` as
  `weekly_histograms.parquet` into `folder` with
  `pyarrow.Table.from_pylist` and that schema.

`trace_time` stays in `fixture_artifact.py`, which `fixture_trace.py`
imports.

`conftest.py`'s session fixture `fixture_tables` calls
`fixture_trace.write_trace_table` instead of `tables.main`. The
`weekly_histograms` fixture loads that folder through
`loading.load_trace_table`, as now, so the frame's types are the ones
the data step reads. The pytest fixture `fixture_trace`, the trace's
Parquet file, is renamed `trace_file`, since the module takes the name.
A fault in the trace query then fails the trace query's tests, in
`test_tables.py` and `test_queries.py`'s columns test, and no test of a
query over the site's tables.

`test_tables.py` keeps the one test that ties the query to the table,
`test_the_trace_query_gives_the_fixture_s_weekly_histograms`, and the
builder's tests, which run `tables.main` into their own folders and
compare with `WEEKLY_HISTOGRAMS`. Its check that the histograms add up
to the rollup's counted requests reads `WEEKLY_HISTOGRAMS`, so it
checks the hand count against the rollup; the query is checked against
the hand count by the test before it.

`fixture_artifact.py`'s daily rollup is written row by row:
`DAILY_ROLLUP_ROWS`, one dict per row, each under a comment naming the
entry of `fixture_trace.TRACE_REQUESTS` it counts, and
`ROLLUP_SCHEMA` (`day` `timestamp[us]`, the strings `large_string`, the
counts `int64`, the sums `float64`), written by
`pyarrow.Table.from_pylist(DAILY_ROLLUP_ROWS, schema=ROLLUP_SCHEMA)`.
The test that each trace entry adds up to its rollup row stays: it
checks numbers written by hand on both sides.

Not taken: deriving the rollup from `TRACE_REQUESTS` inside the
fixture. The fixture would then compute what the artifact computes, and
the check that the trace adds up to the rollup would compare the
fixture's own arithmetic with itself.

### D9. Test modules import no test module, and the rules are tested

- `test_built_data.py` imports `test_tables` for `COUNTED_COLUMNS`. The
  check "a family's histogram requests equal the daily rows' counted
  requests" is written three times. `tests/counted_requests.py` holds
  `COUNTED_COLUMNS`, the `FamilyMetric` named tuple, and
  `daily_counted_requests(rows)` and `histogram_requests(rows)`, the
  requests per family and metric from daily answer rows and from
  histogram answer rows. `test_built_data.py` checks the shipped
  answers with them. `test_answers.py`'s input-only check becomes the
  same check over the fixture's answers, every metric. `test_tables.py`
  keeps its finer check per week, with `COUNTED_COLUMNS` from there.
- `test_site_database.py` imports `test_queries` for `SITE_TABLES`. The
  query test "reads only the site's tables" takes the tables from the
  `connection` fixture (`SHOW TABLES`), so the database is the one list.
  `test_site_database.py` keeps its literal set of the nine names: that
  test is where the nine are stated.
- `test_queries.py`'s docstring that names `test_tables.FIXTURE_HISTOGRAMS`
  names `fixture_trace.WEEKLY_HISTOGRAMS`.

Two tests hold the rules of this change, each with a planted case, as
the existing rule tests do:

- in `test_naming.py`, beside the rule on test files' names: no Python
  test module imports a module named `test_*`, and no node test file
  imports a `*.test.js` file;
- in `test_repository.py`: no file of `tests/` but `fake_page.js`
  assigns a property of `globalThis` or mocks a method of it
  (`globalThis.<name> =`, `mock.method(globalThis`).

### D10. A readable run

The Makefile's node step becomes `node --test --test-reporter=spec
"tests/*.test.js"`. Out of a terminal, node's default reporter is TAP:
2,518 lines for 410 tests, no file names, the warnings at line 1,686.
The spec reporter prints one line per test, about 460 lines for 435 tests, and lists
every failing test again at the end as `test at <file>:<line>` with its
error, so a failure is read from the last lines of the run. The step
order is kept: pytest, node, then the snapshot test, so that the
snapshot step's framed message when it skips (`one-home-per-rule` D15)
stays the run's last lines.

Not taken: the `dot` reporter, 21 lines. It hides which tests ran,
which a newcomer checking that a new test ran wants to see. pytest's
default output already names each file on one line and is left as it
is.

### D11. What does not move

No site module, query, answer, table or snapshot changes; `make test`'s
snapshot step passing unchanged is the check. Every test that is moved
keeps its name and its asserts, except those D7 drops or rewrites and
the selectors that replace a `children[n]` read. A child read by index
stays where the children are a list of like elements in order, the
legend's buttons or a list's items; an element with a name, a class or
a data attribute is reached by selector.
