# Design: One vocabulary, one name per thing

## The engineering rules

Binding, as `openspec/config.yaml` and the `site` spec state them: simple,
readable and maintainable first; no optimisation without a recorded
measurement; plain HTML, CSS and ES modules; names that are words; a
function at most 50 lines, a module at most 300, a folder at most nine
modules; every module tested and `make test` green at every commit.
This change is a refactor: it renames and moves, and the page shows
exactly what it showed. The snapshot test is the check: not one unit's
text may change, and the snapshot states' folders are renamed whole.
Nothing here changes a query, an answer, a table, a URL key, an anchor
or the artifact repository. It follows `distributions-below` and uses
that change's names (`traffic_distribution_charts.js`,
`drawDistributionCharts`, `view.distributionCharts`).

The owner's instruction for the series: "The refactor should be on the
purpose of simplicity and readability, not clever tricks." Each name
below is the plainest word the repository already uses for the thing.

## Decisions

### D1. The names, decided once

Every rename of this change, so that the later changes of the series
can rely on them. A path is under `site/js/` unless it says otherwise.

Folders:

| Old | New |
|---|---|
| `explore/` | `page/` |
| `pages/` | removed; its one module is `page/main.js` |
| `landing/` | `sections/` |
| `axes/` | `plot/` |

Modules:

| Old | New |
|---|---|
| `pages/explore.js` | `page/main.js` |
| `explore/start.js` | `page/start.js` |
| `explore/topic_tabs.js` | `page/topic_tabs.js` |
| `explore/figure_sections.js` | `page/topics.js` |
| `explore/legend.js` | `shared/legend.js` |
| `shared/scrolling_row.js` | `page/scrolling_row.js` |
| `landing/hero.js`, `stats.js`, `cite.js`, `team.js` | `sections/hero.js`, `stats.js`, `cite.js`, `team.js` |
| `landing/donuts.js` | `sections/mixes.js` |
| `insights/overview.js` | `insights/workload.js` |
| `axes/ticks.js` | `plot/axes.js` |
| `shared/charts.js` | `plot/frame.js`, `shared/figure.js` and `shared/rows.js` (D6) |
| part of `insights/figure_card.js` | `plot/trace_axes.js` (D8) |

Exported names:

| Old | New |
|---|---|
| `FIGURE_SECTIONS` | `TOPICS` |
| `OVERVIEW_TOPIC` | `WORKLOAD_TOPIC` |
| `MODEL_SERIES`, `FAMILY_SERIES`, `ENDPOINT_SERIES` | `BY_MODEL`, `BY_FAMILY`, `BY_ENDPOINT` |
| `choiceSeries` | `choiceBreakdown` |
| `drawBars` of `traffic/traffic_bars.js` | `drawTrafficBars` |
| `barTipText` of `charts/stacked_bars.js` | `stackedBarTipText` |
| `drawnPoints` of `charts/scatter.js` | `drawnScatterPoints` |
| `rasterGrid`'s and `pooledGrid`'s `width`, `height` | `columnCount`, `rowCount` |
| `rasterYDomain(rows)`, `rowBoundaries(rows)`, `rowRules(Plot, rows, plotHeight)` | each takes `rowCount` |
| `divergingColour` of `charts/scatter.js` | `plot/frame.js`, beside `sequentialColour` |
| `FIXED_SERIES_COLOURS`, `HIGHLIGHTED_SERIES`, `HIGHLIGHTED_LABELS`, `figureColours`, `endpointFigureColours` of `shared/series.js` | `insights/card_series.js` |
| `POLICY_SEPARATOR`, `POLICY_COLOURS`, `seriesPolicy`, `policyColours` of `shared/series.js`; `policyLegend` of `insights/card_series.js` | `insights/routing_panels.js` |
| `COUNT_COLOUR` of `insights/figure_card.js` | `insights/card_series.js` |
| `TRACE_DAY_AXIS`, `TRACE_MONTH_TICKS`, `TRACE_MONTH_NAMES`, `PARTIAL_TRACE_MONTH`, `TRACE_MONTH_AXIS`, `traceMonthName` of `insights/figure_card.js` | `plot/trace_axes.js` |
| `ENDPOINT_PALETTE` of `insights/figure_card.js` | `insights/card_series.js`, beside `POLICY_PALETTE` (D8) |
| `ENDPOINT_ORDER`, `endpointOrder` of `insights/figure_card.js` | removed (D8) |

Keys, parameters and locals:

| Old | New |
|---|---|
| `context.orders` | `context.mixes` |
| a mix's `series` in `MIXES` | `breakdown` |
| `series`, the breakdown, in `drawTrafficBars` and its return `{ series, legend }` | `breakdown`, `{ breakdown, legend }` |
| `orders` in `traffic.js` and `traffic_bars.js` | `colourOrders` |
| `drawn` in `traffic.js` (the bars' `{ series, legend }`, then spread with `summary`) | `barSeries`, `{ breakdown, legend }`; `summary` passed beside it |
| `drawn`, the parameter of `drawDistributionCurves` | `distributionCharts` |
| `{ rows, series, legend }` of `drawDistributionCharts` | `{ rows, breakdown, legend }` |
| `bars`, the parameter of `drawDayBars` | `drawing`, as its caller names it |
| `shared` of `drawWithLegend` and `traffic.js` | `legendState` |
| `figureSections` of `topic_tabs.js` | `topics` |
| `drawnSections` of `start.js` | `drawnTopics` |

Markup, styles, tests and snapshots:

| Old | New |
|---|---|
| `class="figure-section"` on `#traffic` | `class="traffic"` |
| `class="figure-section"` on each topic's `<section>` | `class="topic"` |
| `class="figure-sections"` on `#insights` | `class="insights"` |
| `h2#overview-heading` | `h2#workload-heading` |
| `<script src="js/pages/explore.js">` | `<script src="js/page/main.js">` |
| `tests/snapshots/explore-<topic>/` | `tests/snapshots/insights-<topic>/` |
| `EXPLORE_STATES` of `snapshot_units.py` | `PAGE_STATES`, the six anchors |
| `explore_page_units` | `page_units` |
| `test_the_explore_page_s_start_imports_the_answers_module` | `test_the_page_s_start_imports_the_answers_module` |
| `FIGURE_SECTIONS_MODULE` of `test_figures_registry.py` | `TOPICS_MODULE` |
| the node test files | the table of D9 |

Kept as they are: the anchors `#overview`, `#traffic`, `#insights`,
every `#insights-<topic>` (`#insights-overview` among them) and the
tab ids made from them; the ids `#traffic-explorer`, `#mixes`,
`#stats` and `#hero`; every data path and answer name; the URL keys.
A shared link to the page opens where it opened.

### D2. The page has one name

The page is "the page", in code, comments, tests and documents:
never "the Explore page" or "the landing page". Its module is
`page/main.js`, in the folder of what starts and frames it: `start.js`,
`topic_tabs.js`, `topics.js` and `scrolling_row.js`. `scrolling_row.js`
moves there because its one user is `topic_tabs.js` and because
`shared/` needs the room (D6). `landing/` becomes `sections/`: it
holds the page's sections that have no folder of their own (hero,
stats, mixes, cite, team), and "landing" was the page's third name.
`donuts.js` becomes `mixes.js`, as it runs `#mixes` with `runMixes`
and draws the two mixes, and a grep for "donut" then finds the kind
and the prose about the two donuts the mixes draw.

`test_repository.py` checks that `index.html` loads `js/page/main.js`
and that `page/start.js` imports the answers module, where it checked
`pages/` and `explore/`.

Not taken: `js/main.js` at the top of `js/`, as the review offered. A
module outside every folder is a special case for the folder test and
for the layout block; `page/main.js` is not.

### D3. The Insights' words

`page/topics.js` exports `TOPICS`, the six topics in tab order, and
`topicCards`. The first topic is "The workload at a glance", so its
module is `insights/workload.js` and its constant `WORKLOAD_TOPIC`;
"Overview" is then only the donut section. The topic's anchor stays
`#insights-overview`, because links to it have been shared; the Words
section names this one exception.

The class `figure-section` was on the Traffic Explorer and on the six
topics, and `figure-sections` on the Insights. They become `traffic`,
`topic` and `insights`, as the other sections are classed by their
names (`overview`, `cite`, `team`). Each rule of `style.css` that
named `.figure-section` names `.traffic` and `.topic` instead, so it
matches exactly the elements it matched; `one-home-per-fact` reorders
the stylesheet and may drop a branch that matches nothing.

The snapshot states are named by the anchor each opens the page on:
`insights-overview` to `insights-balancing`. `PAGE_STATES` in
`snapshot_units.py` is the list of the six anchors, where
`EXPLORE_STATES` mapped a second name to each. The state folders are
renamed by `make snapshots`, and `git diff -M` shows six whole-folder
renames and no changed line.

Not taken: renaming the topic headings' ids beyond
`overview-heading`. Nothing references them, and `one-home-per-rule`
writes the topic headings from the topic list.

### D4. The breakdown

`shared/series.js` exports three objects of the shape
`{ order, column, colours, labels? }`: which rows give the colour
order, the answer column naming a row's series, the function from
those rows to a Map of colours, and the labels where a series is not
written by its name. They are rules for splitting rows into series,
not series. They become:

```js
/**
 * How a chart splits its rows into series.
 * @typedef {{ order: string, column: string, colours: function, labels?: object }} Breakdown
 */
export const BY_FAMILY = …;   // the Overview's family mix, the explorer with no family chosen
export const BY_MODEL = …;    // the explorer with a family chosen
export const BY_ENDPOINT = …; // the endpoint mix, the explorer with a model chosen
```

`choiceBreakdown(choice, familyName)` returns the one the bars split
by; `drawTrafficBars` returns `{ breakdown, legend }`, and the
distribution charts take the bars' `breakdown`. "Series" keeps its one
meaning: the names a chart draws, each a line, a slice or a stack of
bar segments, and the entries its legend lists.

`breakdown` is the word because the bars are "split by" family, model
or endpoint group in the spec, and "breakdown" is the noun of that.
Not taken: `Grouping`, which collides with the Insights' groups.

### D5. One name for one shape

- `context.orders`, `{ families, endpoints }`, holds the rows of the
  two mix answers: the donuts draw them, and they give the families'
  and endpoint groups' colour order. It becomes `context.mixes`.
- In `traffic.js` and `traffic_bars.js`, the object of the three
  breakdowns' colour-order rows, `{ families, models, endpoints }`, is
  `colourOrders`; a breakdown's `order` names its key there.
- In `traffic.js`, the bars' return is `barSeries`, `{ breakdown,
  legend }`, and `summary` is passed to `drawDistributions` as its
  own argument, so no object is spread into another of the same name.
- The distribution charts as last drawn, which the legend redraws,
  are `distributionCharts` in both modules, as `view` already names
  them after `distributions-below`.
- `drawDayBars` names its drawing options `drawing`, as its caller
  does; `bars` is the input of `drawTrafficBars` alone.
- `drawWithLegend`'s last parameter, `{ hidden, onToggle }`, is
  `legendState`: the series hidden at first and the function told each
  new hidden set. `one-chart-interface` turns the parameter into the
  legend's options object; the name it takes there is the same.
- Twice-exported names get the kind or the section in their name:
  `drawTrafficBars`, `stackedBarTipText`, `drawnScatterPoints`. A
  naming test (`tests/test_naming.py`),
  `test_no_two_modules_export_one_name`, collects the
  names after `export function`, `export async function` and
  `export const` in `site/js/` and fails naming both modules of a name
  exported twice.
- The raster's grid is `{ columnCount, rowCount, values }`, from
  `rasterGrid` and `pooledGrid`; `rasterYDomain`, `rowBoundaries` and
  `rowRules` take `rowCount`. `height` is then always pixels and
  `rows` always the answer's rows. Plot's own raster options keep
  Plot's keys, `width` and `height`, given the counts.

Not taken: renaming `colourScale`, a function and a parameter key at
once. `one-chart-interface` drops the parameter, which ends the
collision.

### D6. `shared/charts.js` in its three parts, and `plot/`

`shared/charts.js` holds four groups that share nothing but the file.
They go where a newcomer would look for them:

- `plot/frame.js`: the Plot options every chart kind starts from:
  `CHART_HEIGHT`, `BAR_INSET`, `DASH`, `SURFACE_INK`, the reference
  styles, `GRID_STYLE`, `AXIS_STYLE`, `chartFrame`, `titledFrame`,
  `chartWidth`, `referenceRule`, `haloedReferenceRule`, `colourScale`,
  `sequentialColour`, and `divergingColour` from `charts/scatter.js`,
  so both colour scales sit together.
- `plot/axes.js`: today's `axes/ticks.js`, renamed because it holds a
  card's axis options, scales, axis marks and tooltip text, not only
  ticks. It imports its styles from `plot/frame.js` beside it.
- `shared/figure.js`: a figure's elements and states: `renderFigure`,
  `chartName`, `nameChart`, `legendPlace`, `showLoading`, `showNote`,
  `showError`, `showErrorNote` and `textElement`, which `renderFigure`
  uses and which the sections import.
- `shared/rows.js`: `columnTotal`, `distinct`, `panelRows`,
  `logColumns` and `positiveRows`.

The folders' counts afterwards: `page/` 5, `sections/` 5, `shared/` 9
(answers, figure, format, layout, legend, libraries, link_marks, rows,
series), `plot/` 3, `charts/` 9, `theme/` 1, `traffic/` 8,
`insights/` 9. `charts.test.js` is split the same way into
`plot_frame.test.js`, `shared_figure.test.js` and
`shared_rows.test.js`.

Not taken: `plot/` holding the row helpers. `distinct` and
`columnTotal` serve modules that draw nothing, so a reader looks for
them under `shared/`. Nor a `chart_frame/` folder: it would hold the
axes as well, so it would be named for half of what it holds.

### D7. A card's colours sit with the cards

`shared/series.js` keeps what its first sentence says: the series
column, a series' label, the rows a legend leaves shown, a legend's
entries, `ENDPOINT_LABELS` and the three breakdowns. What only the
Insights' cards use leaves it:

- to `insights/card_series.js`, beside `PALETTES`, their one user:
  `FIXED_SERIES_COLOURS`, `HIGHLIGHTED_SERIES`, `HIGHLIGHTED_LABELS`,
  `figureColours` and `endpointFigureColours`; the topic modules
  import the highlighted series from there;
- to `insights/routing_panels.js`, beside `ROUTING_POLICIES`, whose
  names `POLICY_COLOURS` must match: `POLICY_SEPARATOR`,
  `POLICY_COLOURS`, `seriesPolicy`, `policyColours` and
  `policyLegend`. `routing_panels.js` builds the series names
  `"<model>, <policy>"` with the separator it now holds.
  `card_series.js` imports `policyColours` and `policyLegend` from it;
  `routing_panels.js` imports nothing from `card_series.js`, so there
  is no cycle.

`card_series.js` grows from 113 to about 170 lines, and
`routing_panels.js` from 97 to about 150. Their tests move with them
from `series.test.js`, the policies' to a new
`insights_routing_panels.test.js`.

### D8. `figure_card.js` draws a card

`insights/figure_card.js` draws a card from its answer and holds
`CHART_KINDS`. The rest leaves it:

- `plot/trace_axes.js`: the trace's day and month axes that cards
  hand to the kinds, `TRACE_DAY_AXIS`, `TRACE_MONTH_TICKS`,
  `TRACE_MONTH_NAMES`, `PARTIAL_TRACE_MONTH`, `TRACE_MONTH_AXIS` and
  `traceMonthName`. `insights/` is at nine modules, and these are
  axes, so they sit with the axes.
- `COUNT_COLOUR`, a card's colour scheme for a count, to
  `insights/card_series.js` with the other card colours.
- The endpoint mix. The page reads `explore/endpoint_mix` once, as
  `context.mixes.endpoints`; `figure_card.js` read it a second time for
  the Daily API calls card. `startPage` first builds the shared
  answers, `{ totals, mixes }`, then mounts the Insights with `mixes`,
  then adds the history part (`replaceQuery`, `onReturn`) to make the
  sections' context, since the history needs the mounted tabs;
  `drawFigureChart(body, card, mixes)` awaits `mixes.endpoints` for a
  card of the endpoints' palette. `ENDPOINT_ORDER` and `endpointOrder`
  go; `ENDPOINT_PALETTE`, the palette's name, moves to
  `insights/card_series.js` beside `POLICY_PALETTE`, and
  `figure_card.js` and `workload.js` import it from there. The rows reach the card by the route they
  reach the Overview and the explorer by.

Not taken: the bands kind's key as a property of `CHART_KINDS`. That is
part of the kinds' one contract, `one-chart-interface`'s.

### D9. Test file names under one rule

A node test file's name starts with the folder of the module it
tests. A module's own test is named after the module, the folder
written once where the module's name already starts with it:
`charts_lines.test.js` for `charts/lines.js`, `traffic_bars.test.js`
for `traffic/traffic_bars.js`, `traffic.test.js` for
`traffic/traffic.js`. A second file of one module adds what it tests
after the module's name. A check over every Insights card is
`insights_cards_<what>.test.js`. The checks of the stylesheet and of
the headers, `palette_contrast` and `module_headers`, keep their names.
A test helper that is not a test (`fake_page.js`, `palette.js`) is
named for what it holds. The naming test, `tests/test_naming.py`,
holds `test_node_test_files_start_with_a_folder`: the word before the first
`_` (or the whole name) is a folder of `site/js/`, except for the two
named checks and for the test of a test helper, which is named after
the helper it tests (`fake_page.test.js` for `fake_page.js`).

| Old | New |
|---|---|
| `answers.test.js` | `shared_answers.test.js` |
| `charts.test.js` | `plot_frame.test.js`, `shared_figure.test.js`, `shared_rows.test.js` |
| `colours.test.js` | `theme_colours.test.js` |
| `explore_legend.test.js` | `shared_legend.test.js` |
| `explore_legend_shared.test.js` | `shared_legend_state.test.js` |
| `explore_start.test.js` | `page_start.test.js` |
| `explore_topic_tabs.test.js` | `page_topic_tabs.test.js` |
| `scrolling_row.test.js` | `page_scrolling_row.test.js` |
| `insights_figure_sections.test.js` | `page_topics.test.js` |
| `figure_words.test.js` | `insights_cards_words.test.js` |
| `insights_figure_cards.test.js` | `insights_figure_card.test.js` |
| `insights_figure_charts.test.js` | `insights_cards_charts.test.js` |
| `insights_caching_balancing.test.js` | `insights_cards_caching_balancing.test.js` |
| `insights_month_axis.test.js` | `plot_trace_axes.test.js` |
| `format.test.js` | `shared_format.test.js` |
| `layout.test.js` | `shared_layout.test.js` |
| `link_marks.test.js` | `shared_link_marks.test.js` |
| `series.test.js` | `shared_series.test.js` |
| `ticks.test.js` | `plot_axes.test.js` |
| `landing_hero.test.js`, `landing_stats.test.js`, `landing_cite.test.js`, `landing_team.test.js` | `sections_hero.test.js`, `sections_stats.test.js`, `sections_cite.test.js`, `sections_team.test.js` |
| `landing_donuts.test.js` | `sections_mixes.test.js` |
| `traffic_period_buttons.test.js` | `traffic_controls_period_buttons.test.js` |

Unchanged: `charts_<kind>.test.js`, `traffic*.test.js` except the one
above, `insights_card_series.test.js`, `palette_contrast.test.js` and
`module_headers.test.js`.

Not taken: a strict check that each name maps to a module file. The
"folder written once" and "what it tests" parts would make the check
a parser of names; the first word is what a reader looks for.

### D10. The Words section

`CONTRIBUTING.md` opens with it, before "The rules"; README's and
CLAUDE.md's headers point to it. `one-home-per-fact` keeps it as the
one home of these definitions. The draft, as it will read:

```markdown
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
```

That is 40 lines. As built, the section is wrapped to CONTRIBUTING's
width, and the whole-branch review widened **section**, **Traffic
Explorer**, **tile**, **card**, **kind**, **palette** and **place** to
the senses the code uses, gave **container**, **place** and **body** a
line each and added **the paper's words**; CONTRIBUTING's Words section
is the text. A word not in it is used in its everyday sense.

Not taken: a glossary in its own file. It would be a third document
to find; CONTRIBUTING is where a newcomer starts.

## Alternatives not taken

- `js/main.js` at the top of `js/` (D2).
- Renaming the data paths' `explore/` (proposal, point 1).
- `Grouping` for the breakdown (D4).
- A `chart_frame/` folder (D6).
- A check that maps every test file to its module (D9).
- A glossary file of its own (D10).
