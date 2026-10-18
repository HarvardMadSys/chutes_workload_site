# Design: One interface for the chart kinds

## The engineering rules

Binding, as `openspec/config.yaml` and the `site` spec state them: simple,
readable and maintainable first; no optimisation without a recorded
measurement; plain HTML, CSS and ES modules; names that are words; a
function at most 50 lines, a module at most 300, a folder at most nine
modules; every module tested and `make test` green at every commit.
The owner's instruction for this series: the refactor is for simplicity
and readability, not clever tricks; where a review offers a clever
alternative, the plain one is taken and the reason given. This change is
a pure refactor: nothing here changes a picture, a tooltip, an
accessible name, a query, an answer, a table or the artifact
repository, and the snapshots not moving is the check of every task.

## Decisions

The change follows `distributions-below` and `one-vocabulary`, and names
modules and functions as they leave them (`one-vocabulary`, design D1
and D6): the Plot frame, the ink, the reference rules and both colour
scales are `plot/frame.js`; the axes are `plot/axes.js`; the trace's
day and month axes are `plot/trace_axes.js`; a figure's elements and
states, `nameChart` and `chartName` among them, are `shared/figure.js`;
the row helpers are `shared/rows.js`; the legend is `shared/legend.js`;
the workload topic is `insights/workload.js`; the Overview's mixes are
`sections/mixes.js`; the explorer's bars are drawn by `drawTrafficBars`
and its distribution charts by `traffic/traffic_distribution_charts.js`;
the stacked bars' tooltip is `stackedBarTipText` and the scatter's points
`drawnScatterPoints`; the legend's last argument is `legendState`.

### D1. One shape for an axis

Every kind that draws axes takes them as `x` and `y`, each an
`AxisOptions`, the one shape the cards write most. Its `@typedef` sits
at the head of `plot/axes.js`, which reads it, with one line per key,
in place of the description that today runs mid-sentence through the
module's header and leaves out `tickRotate`:

```js
/**
 * The options of one axis of a chart. Every key is optional.
 * @typedef {object} AxisOptions
 * @property {string|null} [label]  the axis's title; none when null or not given
 * @property {boolean} [log]  true for a log axis
 * @property {Array} [domain]  [low, high]; on a band axis, every band in order
 * @property {Array} [ticks]  the values ticked; on a category axis, the indices of the categories labelled
 * @property {function} [tickFormat]  how a tick is written, and a value in a tooltip unless tipFormat is given
 * @property {function} [tipFormat]  how a value is written in a tooltip, alone, without the axis's title
 * @property {number} [inset]  pixels between the plot's edges and the axis's first and last values
 * @property {number} [tickRotate]  degrees a band axis's tick labels are slanted, 0 (level) when not given
 * @property {Array} [categories]  the cells' category names, the cell from i to i + 1 named by the i-th
 */

/** The names of the axis options, for the test that checks every card's axes against them. */
export const AXIS_OPTION_NAMES = Object.freeze([
  "label", "log", "domain", "ticks", "tickFormat", "tipFormat", "inset", "tickRotate", "categories",
]);
```

The cells take their category names in the axis: the seasonality card of
`insights/workload.js` writes `x: { label, categories: HOURS, ticks:
LABELLED_HOURS }` and `y: { domain: [7, 0], categories: WEEKDAY_LABELS
}`, and the flat `xTicks` and `yTicks` go. `categoryAxis(axis)` reads
`axis.categories` and returns the axis ticked at the middle of each
labelled category, as now; it no longer adds a `names` key, and the
tooltip reads `axis.categories`. Within `plot/axes.js` and every kind,
`xTicks` and `yTicks` are then only local variables holding the
computed tick values, which is the one meaning left.

Not taken: renaming the cells' lists to `xCategories` and
`yCategories`, as one review offered. That keeps two flat keys beside
an axis object that describes the same axis; inside the axis, the
categories sit beside the `ticks` that index them.

### D2. The stacked bars take `x` and `y`

`drawStackedBars` reads `x` and `y` as `AxisOptions`, its columns
(`xColumn`, `seriesColumn`, `valueColumn`), `barInset` and
`segmentInset`, and the shared parameters of D6. Its marks are the
shared ones, in today's order: `gridMark(Plot, "y")`, `bandAxisMark(Plot,
x)`, `axisMark(Plot, "y", y)`, the bars, the rule at zero. Each makes
exactly the Plot call the kind makes by hand today (same options, same
`TICK_COUNT`), which is why the snapshots do not move. The x scale is
`{ type: "band", domain: x.domain ?? <the shown rows' x values>, inset:
x.inset ?? 0 }`. The frame's title is `y.label`.

The tooltip writes a bar's x by `axisValueText(parameters.x, value)`,
and `barXText`, which rebuilt the axis object from the flat keys, goes.
Its default was `String` where `axisText`'s is `formatCount`; both
callers give a `tickFormat`, and `formatCount` writes a string as it
is, so no tooltip changes.

The bar's side inset, today `inset`, becomes `barInset`: once the x axis
carries its own `inset` (the axis's ends), one word would mean two
things in one object. `segmentInsets({ barInset, segmentInset })`
returns the same four insets as now.

The callers then write:

```js
// insights/evolution.js, each of the two share cards
chart: {
  x: TRACE_MONTH_AXIS,
  y: { label: "Share of requests", tickFormat: formatPercent },
  valueLabel: "Share of requests",
  valueFormat: formatShare,
  segmentInset: 0, // a model's share under about 1% would vanish into a gap
},

// traffic/traffic_bars.js, drawDayBars
{
  xColumn: "day",
  seriesColumn: drawing.breakdown.column,
  valueColumn: "value",
  x: {
    domain: drawing.days,
    ticks: monthTicks(drawing.days, chartWidth(body)),
    tickFormat: dayMonth,
    tipFormat: String, // a bar's tooltip names its whole day, where its tick names only the month
    tickRotate: MONTH_LABEL_ANGLE,
  },
  y: { tickFormat: formatCountTick },
  valueLabel: drawing.words.valueLabel,
  valueFormat: formatCount,
  margins: DAILY_MARGINS,
  barInset: DAY_BAR_INSET,
  segmentInset: DAY_BAR_INSET,
  labels: drawing.breakdown.labels,
}
```

`evolution.js` then imports `TRACE_MONTH_AXIS` alone from
`plot/trace_axes.js`, the month ticks read through it. `tests/plot_trace_axes.test.js` reads
every month card's axis as `chartParameters(card).x`, its two branches
for the stacked bars' flat keys gone.

### D3. The colour Map passed itself

Every draw function takes the Map from series name to colour, in legend
order, as its third argument, `seriesColours`, not wrapped as `{ series:
map }`. The four callers pass the Map they hold: `drawFigure` of
`insights/figure_card.js` (twice), `drawDayBars` of
`traffic/traffic_bars.js`, `drawCurves` of
`traffic/traffic_distribution_charts.js` and `drawMix`
of `sections/mixes.js`. Inside a kind module the name `seriesColours`
holds the Map everywhere, the helpers' parameters included
(`drawnPoints`, `drawnBoxes`, `foldedRows`, `stackedBarsLegend`,
`donutLegend`, `namedSeries`), so one name has one shape in each file.
The phrase "a Map from series name to colour, in legend order",
written 13 times today, is written once, in the draw contract of D4, and
the kinds refer to it.

A missed call site fails at once: `seriesColours.get` of the wrapper is
not a function, and the snapshot run draws every kind.

### D4. One draw contract

Every kind's draw function has one signature and one ending:

```js
export async function draw<Kind>(rows, body, seriesColours, parameters, hidden) {
  // Plot is loaded here, not at the top, so node can test this module's pure functions.
  const { Plot } = await import("../shared/libraries.js");
  // … the rows drawn and the marks …
  body.replaceChildren(Plot.plot({ … }));
  nameChart(body, parameters.name);
}
```

- **Five parameters for every kind.** The four kinds without series
  (bands, cells, raster, scatter) declare `seriesColours` and `hidden`
  too, and their JSDoc says they do not read them, so two kinds
  compared side by side show one shape.
- **Async, returning nothing.** No caller used the chart that seven
  kinds returned. The donut, which draws SVG of its own and awaits
  nothing, is declared `async` as well, so every kind is called and
  awaited the same way.
- **The kind names its chart, last.** `nameChart(body, parameters.name)`
  (`shared/figure.js`) names every chart SVG in `body` for a screen
  reader: by `parameters.name` where given, else by its figure's title
  and insight, or its caption where it has none (`chartName`), as today. The three callers' `nameChart`
  calls go, and so does the donut's own `role` and `aria-label` code,
  since `nameChart`'s selector already finds its `<svg>`. The
  distribution charts pass each chart's `name`, the name they give
  `nameChart` today ("Input tokens distribution"). A multi-panel
  card's panels are each named by their card, the name they get today
  from one call over the whole body.
- **Written once.** The contract, these three points and the meaning
  of each of the five arguments, is one comment beside the
  `ChartParameters` typedef of D6 in `plot/frame.js`; each kind's
  JSDoc points to it.

Not taken: the caller naming every chart. That keeps the rule in four
callers and in every redraw closure a legend calls, where it can be
forgotten, and leaves the donut different from the rest.

### D5. The lines and the cells resolve their axes once

`drawLines` works out its parameters once, at the top, and passes the
result to every helper:

```js
const chart = { ...parameters, x: parameters.x ?? {}, y: lineYAxis(parameters) };
const drawn = drawnPoints(linePoints(rows, chart.cdf), seriesColours, chart, hidden);
```

`chart` is the word a card already uses for its parameters (`card.chart`),
here with both axes as drawn. `linePoints(rows, cdf)` returns a CDF
answer's rows with each row's `cdf` copied to `y`, any other answer's
rows as they are. After it, every helper reads `y`: `drawnPoints`,
`brokenAtGaps(points, gap)`, `framedPoints(points, xAxis, yAxis)`,
`seriesLine` and `lineTip` lose their y-column argument, and `yColumn`
goes. `seriesLine` and `lineTip` take `chart` and no longer call
`lineYAxis` again. Only two places still branch on `cdf`: the tooltip's
text (`lineTipText`, "45.0% at or below") and the choice of pointer
(`Plot.pointer` for a CDF, `Plot.pointerX` otherwise).

`drawCells` likewise builds `const chart = { ...parameters, x:
categoryAxis(parameters.x ?? {}), y: categoryAxis(parameters.y ?? {}) }`
once and passes it to `drawnCells` and `cellTipText`, where it builds
the same copy twice today.

Not taken: a `CdfLines` kind of its own. A CDF is a lines chart of a
share; one flag read in two places is plainer than a tenth module.

### D6. Each kind lists the parameters it reads

Each kind exports one frozen list of every parameter name it reads,
written out in full, and its draw function's JSDoc says what its own
names decide. The names most kinds share are defined once, in a
`@typedef` at the head of `plot/frame.js`, which reads `height` and
`margins`:

```js
/**
 * The parameters most chart kinds share. A kind reads those its list of parameters names; each is optional.
 * @typedef {object} ChartParameters
 * @property {AxisOptions} [x]  the x axis (plot/axes.js)
 * @property {AxisOptions} [y]  the y axis
 * @property {string} [valueLabel]  what a value is, in the tooltip and a colour legend's title: "Requests"
 * @property {function} [valueFormat]  how a value is written there
 * @property {Object<string, string>} [labels]  a series' label where it is written otherwise than its name
 * @property {string} [panel]  the panel drawn, of a multi-panel answer
 * @property {number} [height]  the chart's height in pixels, CHART_HEIGHT when not given
 * @property {object} [margins]  Plot margins in place of the frame's
 * @property {string} [name]  the chart's accessible name; its figure's title and insight, or its caption where it has
 *   none, when not given (`chartName` of `shared/figure.js`)
 */
```

The lists, each `export const <KIND>_PARAMETERS = Object.freeze([…])`
in its kind's module:

| Kind | Shared names it reads | Its own names |
|---|---|---|
| lines | x, y, valueLabel, valueFormat, labels, panel, height, margins, name | cdf, series, tipAllSeries, markers, dashed, gap |
| bands | x, y, valueLabel, valueFormat, height, margins, name | colour |
| cells | x, y, valueLabel, valueFormat, height, margins, name | scheme, schemeStart, colourDomain, colourLog, diagonal, yReference |
| raster | x, y, valueLabel, valueFormat, height, margins, name | scheme, schemeStart, colourDomain, colourLog |
| scatter | x, y, valueLabel, valueFormat, height, margins, name | scheme, colourDomain, yReference |
| boxes | x, y, valueLabel, valueFormat, labels, height, margins, name | (none) |
| bars | x, y, valueLabel, valueFormat, panel, height, margins, name | reference |
| stacked bars | x, y, valueLabel, valueFormat, labels, height, margins, name | xColumn, seriesColumn, valueColumn, barInset, segmentInset |
| donut | labels, name | nameColumn, countColumn, unit, totalFormat |

The raster lists `valueFormat` because `sequentialColour` writes a
linear colour legend's ticks by it. A list is a literal, not a spread
of a shared list: the reader sees in one line everything a kind takes,
and a card cannot set a shared name its kind ignores (`labels` on a
bands card) without the test failing.

`CHART_KINDS` of `insights/figure_card.js` gains each card kind's list,
`parameterNames`, the `cdf` kind taking the lines' list. Its key
`parameters`, the defaults every answer of a kind takes, is renamed
`defaults`, so that one entry does not hold `parameters` and
`parameterNames` side by side meaning two things:

```js
lines: Object.freeze({
  draw: drawLines, swatch: "line", defaults: Object.freeze({}), parameterNames: LINES_PARAMETERS,
}),
cdf: Object.freeze({
  draw: drawLines, swatch: "line", defaults: Object.freeze({ cdf: true }), parameterNames: LINES_PARAMETERS,
}),
```

The `colourScale` option, Plot's colour scale type, goes: no card sets
it. `sequentialColour` makes a log scale where `colourLog`, else a
linear one, and the test that set `colourScale: "sqrt"` goes with it.
The shared function `colourScale`, the ordinal scale of the series'
colours, stays, its name no longer shared with an option.

Each draw function's JSDoc then opens with one line, "Reads
`LINES_PARAMETERS`; the shared ones are `ChartParameters`'", and lists
only its own names; the `margins`, `height` and `valueLabel` bullets
written out in eight kinds go.

### D7. The test that walks every card

One test in `tests/insights_figure_card.test.js`, beside the test that
every card names one of the nine kinds:

```js
// The names among the keys of `object` that are not in `allowed`.
function unknownNames(object, allowed) {
  return Object.keys(object).filter((name) => !allowed.includes(name));
}

test("every card's and panel's chart names only parameters its kind reads, its axes only axis options", () => {
  for (const card of everyCard()) {
    const kind = CHART_KINDS[card.kind];
    const charts = [kind.defaults, card.chart];
    for (const entry of card.panels ?? []) {
      charts.push(entry.chart);
    }
    for (const chart of charts) {
      const unread = unknownNames(chart, kind.parameterNames);
      assert.deepEqual(unread, [], `${card.figure}: the kind ${card.kind} reads no parameter ${unread}`);
      for (const axis of [chart.x, chart.y]) {
        if (axis !== undefined) {
          const unknown = unknownNames(axis, AXIS_OPTION_NAMES);
          assert.deepEqual(unknown, [], `${card.figure}: no axis option is named ${unknown}`);
        }
      }
    }
  }
});
```

It reads each `chart` object as written, the card's and each panel's,
and the kind's defaults, so a key is reported where it is typed, not
in the merged parameters. A failure prints the card and the stray
names: a card with `yRefrence` fails with `["yRefrence"]`. Run on
today's 47 cards and 12 panels with the lists of D6, it finds no stray
key (measured with a probe that walks the topics).

Not taken: each draw function checking its parameters as it draws and
throwing. That would also catch the three callers that build their
parameters in code (the explorer's bars, its distribution charts and
the donuts), at the cost of a check on every draw and an error shown in
a visitor's card; the test catches the 59 `chart` objects written by
hand in the topics, which is where a misspelling is likely.

### D8. The legend's two objects and its one rule

`shared/legend.js` takes one legend object, and its last argument is
one options object, `legendState`, the name `one-vocabulary` gives it:

```js
/**
 * A legend: the entries it lists, their colours, and how their swatches are drawn.
 * @typedef {object} Legend
 * @property {Array<{name: string, label: string, names?: string[]}>} series  the entries, in order
 * @property {Map<string, string>} colours  each entry's colour, by its name
 * @property {string} [swatch]  "square" (the default) or "line"
 * @property {string[]} [dashed]  the series drawn dashed, whose line swatches are dashed; none when not given
 */

/**
 * The hidden series a legend starts from and the function told of each change. Both keys are optional.
 * @typedef {object} LegendState
 * @property {Set<string>} [hidden]  the series hidden at first; none when not given
 * @property {function} [onToggle]  called with the new hidden set after each press
 */

mountLegend(container, legend, legendState)
drawWithLegend(body, legend, drawChart, legendState)
```

- `swatch` moves into the legend object beside `dashed`, since both say
  how the swatches look. `insights/figure_card.js` builds `{
  ...figureLegend(card, rows, colours), swatch: CHART_KINDS[card.kind].swatch
  }`; the explorer's bars and the mixes keep the default.
- Both functions take the same `legendState`, with the same meaning.
  `mountLegend` holds the hidden set: a press computes the new set
  (`toggledSeries`), sets every button's state from it, and calls
  `onToggle(hidden)`. `drawWithLegend` passes `mountLegend` an
  `onToggle` that redraws the chart (`drawShownSeries`, an error shown
  in `body`) and then calls the caller's `onToggle`, so that the
  charts the legend stands for follow it. The explorer already passes
  `{ hidden, onToggle }`.
- **Every button's `aria-pressed` comes from the hidden set.** After
  each press, `mountLegend` sets each button's `aria-pressed` to
  `isEntryShown(entry, hidden)` (not every one of its series hidden),
  the same function that sets it when the legend is mounted.
  `flipAndCall`, which flipped the one button pressed, goes. What a
  visitor sees and hears does not change; the buttons' state and the
  hidden set can no longer disagree, since one is computed from the
  other.
- The fewer-than-two rule has one home, `hasLegend(series)` with
  `MIN_SERIES_IN_LEGEND`, read in two places of the one module:
  `mountLegend` places no buttons, and `drawShownSeries(body, legend,
  hidden, drawChart)` draws with nothing hidden. `drawWithLegend` then
  has no early return: it mounts the legend and calls
  `drawShownSeries`. `drawDistributionCurves` calls `drawShownSeries`
  alone; its `hiddenHere` line and its import of `hasLegend` go.

`drawWithLegend` of fewer than two entries now clears the legend's
place, where it left it alone; the place is always empty then (a card
renders it empty, and the explorer's bars render a new figure for each
choice), so nothing on the page changes.

Not taken: `mountLegend` calling back with the pressed entry's names
and `drawWithLegend` keeping the hidden set. Two callbacks of one
module would then take two different things, and the set would live
in one function while the buttons that show it live in another.

### D9. Small hops and restating tests

- `drawnBars` only forwards to `shownSeriesRows`; `drawBars` calls
  `shownSeriesRows(rows, seriesColours, parameters.panel, hidden)`
  itself, and the two `drawnBars` tests go, `shownSeriesRows` having its
  own in `tests/shared_series.test.js`.
- `sliceShares` sums the slices' counts with `columnTotal`, which the
  donut already imports.
- `bandsColour` stays (proposal, point 2).
- `chartFrame`, `CHART_HEIGHT` and `REFERENCE_HALO` stay exported
  (proposal, point 3).
- The tests that assert a kind's constant against its own literal go:
  the bands' `PERCENTILES` columns and the boxes' `STATISTICS` columns.
  Their order is checked by behaviour already, in the tooltip tests
  that list the percentiles from the 90th down and the statistics from
  the high whisker down.

### D10. Modules, tests and the check

Modules: the nine kinds of `js/charts/`; `plot/axes.js` (the axis
typedef and list); `plot/frame.js` (the parameters' typedef,
`sequentialColour`); `shared/legend.js`; `insights/figure_card.js`
(`CHART_KINDS`, the legend's swatch, no naming); `shared/figure.js`
(`nameChart`'s comment: the kinds call it); `insights/evolution.js` and
`insights/workload.js` (the cards' axes);
`traffic/traffic_bars.js` and `traffic/traffic_distribution_charts.js`
(the parameters, the Map, no naming, the legend's rule);
`sections/mixes.js` (the Map). `plot/trace_axes.js` is untouched. No
module or folder is added; no module nears 300 lines.

Tests: `charts_stacked_bars`, `charts_cells`, `charts_lines`,
`charts_bars`, `charts_bands`, `charts_boxes`, `charts_donut`,
`plot_frame` (`sequentialColour`), `shared_legend` and
`shared_legend_state`, `insights_figure_card` (the walk),
`insights_cards_charts` and `plot_trace_axes` follow the new
signatures; `traffic_distribution_charts` calls none of them and is
unchanged. Two tests are
added: the walk, and in `shared_legend.test.js` one that presses two
buttons of a legend and finds every button's `aria-pressed` equal to
its entry being shown in the hidden set `onToggle` received.

The check: every task runs `make test` where Chromium is installed
(`make setup-browser`), so that the snapshot comparison runs rather than
skips, and `tests/snapshots/` is not rewritten. A unit that moves is a
mistake in the task, not a change to record.
