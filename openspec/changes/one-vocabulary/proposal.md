# Change: One vocabulary, one name per thing

## Why

A newcomer cannot yet guess where a thing lives from its name. The
page has three names: "the Explore page", "the landing page" and "the
one page". "explore" alone means five things: the page's module, a
folder holding the page's start, the topic tabs and the shared legend,
the folder of the query answers, the snapshot states and, by its
sound, the Traffic Explorer, which lives in `traffic/`. "Overview" is
the donut section and also the first Insights topic.
`FIGURE_SECTIONS` holds topics. `series` names the rule that splits a
chart's rows (by family, by model, by endpoint group) as well as the
names a chart draws. `drawn`, `shared`, `bars` and `orders` each hold
two shapes; `drawBars`, `barTipText` and `drawnPoints` are each
exported by two modules; in the raster, `height` and `rows` are both
pixels or rows and counts. `shared/charts.js` holds four modules in
one file, `shared/series.js` holds one card's policy colours, and
`insights/figure_card.js` is both a card's drawing and the home of the
trace's axes. No document defines the site's own words.

This change follows `distributions-below` and comes before every other
change of the series, so that each of them is written in the names
decided here once.

## What Changes

- **A Words section.** `CONTRIBUTING.md` opens with about forty lines
  that define each of the site's own words in one line: the page, a
  section, a topic, a card, a figure, a chart, a kind, a panel, an
  answer, a series, a breakdown, a legend, a place, the verbs `run`,
  `render`, `mount`, `place`, `draw` and `show`, and the rest. The
  code then uses each word in that sense.
- **The page has one name, and its folders say what they hold.**
  `js/explore/` becomes `js/page/` (the page's module `main.js`, its
  start, the topic tabs, the topic list `topics.js`). `js/pages/` goes.
  `js/landing/` becomes `js/sections/`, and its `donuts.js` becomes
  `mixes.js`, beside the chart kind `charts/donut.js`.
- **The Insights' words.** `FIGURE_SECTIONS` becomes `TOPICS`;
  `insights/overview.js` becomes `insights/workload.js`
  (`WORKLOAD_TOPIC`); the topic sections' class is `topic`; the
  snapshot states are named by the anchor each opens on. The public
  anchors `#overview` and `#insights-overview` do not change.
- **The breakdown.** `MODEL_SERIES`, `FAMILY_SERIES` and
  `ENDPOINT_SERIES` become `BY_MODEL`, `BY_FAMILY` and `BY_ENDPOINT`,
  typed once as a `Breakdown`, and `choiceSeries` becomes
  `choiceBreakdown`. "Series" is left for the names a chart draws.
- **One name for one shape.** `context.orders` becomes
  `context.mixes`; the traffic module's `drawn`, `shared`, `bars` and
  `orders` each get a name for what they hold; the twice-exported
  names become `drawTrafficBars`, `stackedBarTipText` and
  `drawnScatterPoints`; the raster counts its grid in `columnCount`
  and `rowCount`. The naming test (`tests/test_naming.py`) fails when
  two modules export one name.
- **The legend moves to `shared/legend.js`**, and its rule that a
  legend of fewer than two series hides nothing has one home.
- **`shared/charts.js` is split into its parts.** The frame, ink,
  reference rules and both colour scales go to `plot/frame.js`, the
  folder `axes/` becoming `plot/` with `ticks.js` as `plot/axes.js`; a
  figure's elements and the loading, note and error states go to
  `shared/figure.js`; the row helpers to `shared/rows.js`.
- **A card's colours sit with the cards.** The figure cards' fixed
  colours leave `shared/series.js` for `insights/card_series.js`, and
  the routing policies' rules go to `insights/routing_panels.js`.
  `figure_card.js` keeps the drawing of a card: the trace's day and
  month axes go to `plot/trace_axes.js`, and the endpoint mix reaches
  the cards from the page rather than by a second read.
- **Test files under one rule.** A node test file's name starts with
  the folder of the module it tests; a module's own test is named after
  it. The naming test checks the rule.

## What it moves

- About 40 modules change an import line; 13 modules move or are
  renamed, and `shared/charts.js` becomes three. No module's behaviour
  changes. The folders of `site/js/` become `page/`, `sections/`,
  `shared/`, `plot/`, `charts/`, `theme/`, `traffic/` and `insights/`.
- About 30 node test files are renamed; their tests do not change,
  except for imports, names and the one read the cards no longer make.
- The snapshot states' folders are renamed, from `explore-<topic>` to
  `insights-<topic>`; not one unit's text changes.
- The page requests `explore/endpoint_mix` once rather than twice.
- No query, answer, table, URL key, anchor or data path changes. The
  artifact repository is not touched.

## Pushback and open points

1. **The data paths keep `explore/`.** `site/queries/explore/`,
   `site/data/all/explore/` and the answer names (`explore/family_mix`)
   stay, and the Words section says that there `explore/` means "the
   query answers". Renaming them changes the published files' URLs, the
   head's preload, the deploy workflow's checks and `make data`, which
   is a data change, not a rename; it belongs with the data step's own
   names (`all/`, `ANSWERED_FOLDERS`) in a later change.
2. **Two renames beyond the reviews' list.** `landing/` becomes
   `sections/`, since "landing" is the page's third name, and
   `donuts.js` becomes `mixes.js`, since it sits beside
   `charts/donut.js` and runs the section `#mixes`. Both are cheap now
   and dearer after C to F have named them.
3. **Three folders end at their limit of nine modules:** `shared/`,
   `charts/` and `insights/`. `scrolling_row.js` moves to `page/`, its
   one user's folder, so that `shared/` can take the legend and the
   split. A tenth shared module will need a decision; G's
   `insights/topics/` would free `insights/`.
4. **`plot/` is named after the library.** It holds what every chart
   kind gives Observable Plot: the frame, the axes and the trace's
   axes. The Words section says so in one line. A name such as
   `chart_frame/` was not taken, since it holds the axes too.
5. **The test file names are taken here, not in E.** This change moves
   the modules, so it renames their tests once; E keeps the rule for
   the helper files it adds.

## Not in this change

- The legend's options object, the stacked bars' axis objects, the
  colour Map passed as itself, the `colourScale` option, the bands
  kind's key and one draw contract: `one-chart-interface`.
- The topic declared in one place, the topic headings written by the
  page, the families' order and the metric list: `one-home-per-rule`.
- One `fake_page.js` and shared fixtures: `one-test-harness`.
- `@typedef`s for the card and axis shapes, README and CONTRIBUTING
  with one home per fact, `style.css` reordered: `one-home-per-fact`.
- The legend's buttons set from the hidden set, the explorer's one
  `choose()`, the Insights' one entry point and `traffic_filter.js`'s
  split: the optional G.
- Renaming the spec capability `landing-page`.
