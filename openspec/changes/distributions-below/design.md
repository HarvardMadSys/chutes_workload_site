# Design: The distributions under the explorer, and the explorer as wide as the window

## The engineering rules

Binding, as `openspec/config.yaml` and the `site` spec state them: simple,
readable and maintainable first; no optimisation without a recorded
measurement; plain HTML, CSS and ES modules; names that are words; a
function at most 50 lines, a module at most 300, a folder at most nine
modules; every module tested and `make test` green at every commit.
This change, and the series it opens, is made for a reader who did not
write the code: where two ways do one thing, the plain one is taken,
and nothing is written that a newcomer cannot read once. Nothing here
changes a query, an answer, a table or the artifact repository.

## Decisions

### D1. The row of three charts under the day range

The explorer's wide card, from the top: the four tiles, the bars with
their legend, the day range's slider, then a row `div.traffic-
distributions` of three `div.distribution-chart`, each an `h3.figure-
title` and a `div.figure-body`, the place the chart is drawn into. The
title is an `h3`, level with the bars' title, which `renderFigure`
writes as an `h3`: the three charts stand beside the bars' figure, not
under its heading in a screen reader's outline. The
titles, placeholder copy for the authors: "Input tokens", "Output
tokens", "Time to first token". A chart has no caption, no definition
and no rows line, so it is not a `renderFigure` card (whose Definition
control is required): the two elements are made by the charts' module
itself. The place is a figure's body, so the chart is counted, named
and styled as every other chart is, and reserves a figure body's
12rem while it loads or shows a note. The chart is the `lines` kind
with `cdf: true`, at the kinds' default height (`CHART_HEIGHT`, 240
px) and default margins, so the tile charts' `TILE_CHART_HEIGHT` and
`TILE_CHART_MARGINS` go, and with them the stylesheet's `min-height:
140px` and both comments that told the reader to change the two
together: the height has one home, the kinds' default. The y axis,
"Share of requests", takes the kind's ticks, as the page's other CDFs
do; the three-tick list of the tile charts goes. The x axes keep their
fixed log domains and listed ticks (input 1 to 1M at 1, 100, 10k, 1M;
output 1 to 100k at 1, 1k, 100k; TTFT 0.01 to 100 s at 10 ms, 1 s,
100 s) and the clipping at the domain's ends. The accessible names
stay "Input tokens distribution", "Output tokens distribution", "Time
to first token distribution", so the snapshot units keep their names.

The row is a grid of three columns at desktop width, one column below
50rem, with the card grid's 1.5rem gap; `.traffic-distributions` and
`.distribution-chart` rules in the Traffic Explorer's part of the
stylesheet. The legend over the bars hides a series in the bars and
the three charts, as now; a handle's move redraws the three charts
from the histogram rows in hand; the loading, error and no-request
states are as the tile charts' were.

Not taken: three figure cards of `renderFigure` with an empty
definition. A Definition control that opens on nothing is worse than
none, and the user asked for no definitions.

### D2. The tiles write texts only

`traffic_tiles.js` goes back to one job: `renderTiles(list, summary,
percentiles)` replaces the list's children with the four `li`, each its
value, its label and its notes, as `tileTexts` gives them. `placeTiles`,
the `data-tile` keys and the `div.tile-text` and `div.tile-chart`
wrappers go, with the tiles' flex-column rules; a tile is again a list
item holding `strong` and `span`s, as the stats strip's numbers are.
The snapshot test reads the tiles' texts from `.traffic-tiles li`.

### D3. A charts' module keyed by metric, that makes its own places

`traffic_tile_charts.js` becomes `traffic_distribution_charts.js`. Its
exports:

- `DISTRIBUTION_CHARTS`: the three charts in their order, each `{
  metric, title, name, x, valueLabel, valueFormat }`; `metric` is the
  histogram rows' metric, `input_tokens`, `output_tokens` or `ttft`,
  and is the chart's key everywhere.
- `placeDistributionCharts(row)`: fills `row` with the three
  `div.distribution-chart` of D1, each showing the loading state, and
  returns the places by metric, `{ input_tokens, output_tokens, ttft
  }`. Called once, when the explorer lays out its card.
- `drawDistributionCharts(places, { rows, series, legend }, hidden)`
  and `drawDistributionCurves(drawn, hidden)`, as `drawTileCharts` and
  `drawTileCurves` are now, the places looked up by metric.
- `showChartsLoading(places)`, `showChartsError(places, error)`, as
  now.

`choicePercentiles` of `traffic_distributions.js` returns `{
input_tokens, output_tokens, ttft }`, the same keys, and `tileTexts`
reads them so; the two homes of "input"/"output"/"ttft" as tile keys
go. `traffic.js` holds `view.chartPlaces` as the charts' module returns
them and `view.distributionCharts` (the drawing the legend redraws),
and `explorerCard` appends the row after the range. Moving the row
elsewhere later is then one line of `explorerCard` and the stylesheet.

Not taken: one module for the tiles and the charts. They are read at
different times (the tiles with the bars, the charts after), and a
module that does both is the module this change takes apart.

### D4. The explorer as wide as the window

The page's width cap moves from `.page` to its sections. `.page` loses
its `max-width` and its auto margins and keeps its padding, the
gutters among it (`padding: 2rem var(--gutter) 0`), and its column of
sections. `.page > section` takes `width: 100%` (auto margins stop a
column's item from stretching), `max-width: calc(var(--page-width) - 2
* var(--gutter))`, the page's content width, and `margin-inline:
auto`. The Traffic Explorer's section, `#traffic`, takes `max-width:
none`, so it spans the window less the gutters. Every box is
border-box, so the header's `--page-width` holds its gutters and a
section's edges meet the header's brand; the header and the footer
cap themselves as before (`.header-inner`, `.footer-inner`). At 1280
and 360 px the page is pixel for pixel what it was. The bars and the
three charts are drawn at their body's width, as every chart is; the
window's width at the time of the draw is the width they take, as
now.

Not taken: the gutter on each section (`.page > section` with
`max-width: var(--page-width)` and `padding-inline: var(--gutter)`,
`.page` with no side padding), which would set the width one way, as
the header and the footer set theirs. A section's padding lies inside
its box, so the section rules, the hero's background band
(`.hero::before`) and every section's box ran out into the gutters at
1280 and 360 px.

Not taken: a breakout margin (`margin-inline: calc(50% - 50vw)`) on
the one section. It is the one trick the stylesheet would hold, `100vw`
counts the scrollbar and so overflows the page sideways by its width,
and the reader must know why the number is negative.

### D5. The explorer's tests by selector

`FakeElement` of `tests/fake_page.js` gains `querySelector(selector)`
and `querySelectorAll(selector)`: `selector` is one simple selector, a
tag (`input`), a class (`.range-track`), an id (`#traffic-explorer`) or
a data attribute (`[data-copy]`, `[data-copy="bibtex"]`), or several
simple selectors parted by spaces, each matched among the descendants
of the last match, as the browser does; `matches(simple)` on an
element decides each. The fake keeps its `classes` set and its
`attributes` map, so matching is a lookup; about thirty lines, with a
test of their own in `tests/fake_page.test.js`. The explorer's tests
(`traffic.test.js`, `traffic_tiles.test.js`,
`traffic_distribution_charts.test.js`, `traffic_controls.test.js`,
`traffic_period_buttons.test.js`) then reach the controls, the tiles,
the bars' figure, the range's inputs and the charts' places by the
selectors the stylesheet and `tests/snapshot_traffic.py` use; the
`controlsOf` helper is written once, in `fake_page.js`. The legend's
and the Insights' tests keep their child indices until
`one-test-harness`.

Not taken: a DOM library under node. The fakes are forty lines the
reader can hold; a library is a dependency and a second DOM to learn.

### D6. One treatment of a family that cannot be read

Today a family's answer that fails at the page's opening shows its
error in the bars and the three charts and leaves the tiles without
percentiles (`showChoiceError`), while the same failure on a choice
shows the error in the bars alone and snaps the drop-down back. Both
now go through `showChoiceError`; the controls still snap back to the
family shown last, as they do. The explorer's header lists, in one
sentence, which failure shows where.

### D7. Tests

- `tests/fake_page.test.js`: the selectors of D5 (a class, an id, a
  data attribute with and without a value, a tag, a descendant chain,
  a miss giving null or an empty list).
- `tests/traffic_distribution_charts.test.js` (from
  `traffic_tile_charts.test.js`): the three places made and keyed by
  metric, each with its title; the fixed domains and ticks; the rows
  beyond a domain kept; loading and error in each place, logged once;
  the no-request note; the legend's hiding.
- `tests/traffic_tiles.test.js`: the four tiles written from the
  summary and the percentiles keyed by metric; no chart places.
- `tests/traffic.test.js`: the card's order (tiles, bars, range, the
  row of three); the histogram answer read once the bars are drawn,
  the charts and the notes loading until then; a failed read, at the
  opening and on a choice, showing the error in the bars and the three
  places and the tiles without percentiles; the legend redrawing the
  charts.
- `tests/snapshot_traffic.py`: the charts read from
  `.traffic-distributions .distribution-chart`, named by their
  accessible name as now; `make snapshots` once, the three charts'
  axis units expected to change (the y ticks) and nothing else.
- The page at 360, 1280 and 1920 px in both schemes: the explorer's
  section as wide as the window, every other section at the page's
  width, the console clean.
