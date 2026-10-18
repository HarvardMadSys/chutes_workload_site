# Change: One interface for the chart kinds

## Why

A newcomer can fix a bug inside one chart kind, since each is a small
file with one draw function. Adding something across the kinds is
harder, because the nine kinds do not share one interface. Seven take
their axes as `x: {…}` and `y: {…}`; the stacked bars take nine flat
keys instead (`xLabel`, `xTicks`, `xTickFormat`, …), so the monthly
share cards take the month axis apart key by key and the kind puts it
back together for its tooltip. `xTicks` means three things: category
names in the cells, tick values in the stacked bars, a local variable
elsewhere. Every caller wraps the colour Map as `{ series: map }`, and
inside a kind the name `colours` holds both shapes. What a kind accepts
is written only as prose, so a card whose `chart` holds a misspelt key
draws without it and no test fails. Seven kinds return the chart and two
do not; nobody uses the value; the donut names itself for a screen
reader, and the other kinds are named by their callers, in three
places. The lines kind threads its CDF flag through seven functions and
works out its y axis three times. The legend takes seven positional
arguments, and its "fewer than two series hides nothing" rule is
written twice. This change follows `distributions-below` and
`one-vocabulary`; it changes no picture, no number and no snapshot.

## What Changes

- **One shape for an axis.** The axis options get one `@typedef`,
  `AxisOptions`, in the axes module, and a frozen list of their names.
  The stacked bars take `x` and `y` axis options like every other kind,
  so the share cards write `x: TRACE_MONTH_AXIS`. The cells take their
  category names in the axis, `x: { categories, ticks }`, and the flat
  `xTicks` and `yTicks` go.
- **The colour Map passed itself.** Every draw function takes the Map
  from series name to colour as `seriesColours`, not `{ series: map }`.
- **One draw contract.** Every kind is `async draw<Kind>(rows, body,
  seriesColours, parameters, hidden)`, returns nothing, and names its
  own chart for a screen reader as its last step; callers stop naming
  charts.
- **Each kind lists its parameters.** Each kind exports a frozen list of
  the parameter names it reads. A node test walks every card and every
  panel of every topic and fails on a name its kind does not list, or an
  axis option that is not one. The parameters most kinds share get one
  `@typedef`, `ChartParameters`. The unused `colourScale` option goes.
- **The lines kind resolves its axes once.** A CDF's `cdf` column is
  read as `y` once, at the top; the helpers take the resolved
  parameters, and `yColumn` goes. The cells build their resolved axes
  once, not twice.
- **The legend takes objects.** The legend object carries its `swatch`
  beside `dashed`, and the last argument of both legend functions is
  one options object, `legendState`, `{ hidden, onToggle }`. The legend
  holds the hidden set and, after each press, sets every button's
  `aria-pressed` from it rather than flipping the one pressed. The
  fewer-than-two rule lives in the legend module alone; the
  distribution charts call `drawShownSeries` only.
- **Small hops removed.** `drawnBars`, which only forwards, is inlined;
  `sliceShares` sums with `columnTotal`; the tests that restate a kind's
  constant (`PERCENTILES`, `STATISTICS`) go.

## What it moves

- No snapshot unit, answer, query, table or URL key changes; that the
  snapshots stay as they are is the check of every task.
- The parameter keys of the stacked bars go from 19 to 13, the cells'
  from 15 to 13. No card changes what it draws.
- About 18 modules and 14 test files change; no module or folder is
  added or removed. Two tests are added: the walk, and one that every
  legend button's state follows the hidden set.
- CONTRIBUTING's paragraph on the chart kinds and its lines on the
  legend say the new interface.
- The artifact repository is not touched.

## Pushback and open points

1. **Who names a chart.** The review offered two places: the caller, or
   the kind. This change takes the kind, since only the kind knows what
   it put into `body`, and a caller, a redraw closure among them, can
   then not forget. A kind that is given no `name` is named by its card,
   as now.
2. **`bandsColour` stays.** The review would inline it as a forwarder.
   It is the one home of the bands' default colour, read by the kind and
   by the card for its key, and one of the five bands cards relies on
   the default; inlining it would write the default twice.
3. **`chartFrame`, `CHART_HEIGHT` and `REFERENCE_HALO` stay exported.**
   Tests read each of them to check behaviour (the grid rows' equal
   heights read `CHART_HEIGHT`); un-exporting them would make those
   tests restate the numbers.
4. **The walk covers the cards, not the code.** The three callers that
   build their parameters in code (the explorer's bars, its
   distribution charts and the Overview's donuts) are not walked. A
   misspelt key there that changes a drawing fails the snapshots; one
   that changes nothing visible does not fail.
5. **`inset` becomes `barInset`.** Once the stacked bars take `x.inset`
   (the axis's ends), a top-level `inset` (a bar's sides) would be a
   second meaning of one word in one object.
6. **Module names are those `one-vocabulary` leaves.** This change
   names `plot/frame.js`, `plot/axes.js`, `plot/trace_axes.js`,
   `shared/figure.js`, `shared/legend.js`, `sections/mixes.js`,
   `insights/workload.js`, `drawTrafficBars` and `stackedBarTipText`,
   and that change's test file names, as its design D1, D6 and D9 give
   them.

## Not in this change

- The legend's move to `shared/`, the split of `shared/charts.js` into
  `plot/` and `shared/`, and the renames of the twice-exported names
  and the raster's `rows` and `height`: `one-vocabulary`.
- `MEDIAN_WIDTH` defined in both bands and boxes (one
  `MEDIAN_STROKE_WIDTH` there), and the other duplicated constants:
  `one-home-per-rule`.
- The tests that restate a shared constant (`CHART_HEIGHT === 240`,
  `DASH`, the margins): `one-test-harness`.
- Shortening the kinds' comments beyond the parameter bullets the
  typedef replaces, and the card's `@typedef`: `one-home-per-fact`.
