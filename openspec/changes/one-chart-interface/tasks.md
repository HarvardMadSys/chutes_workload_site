# Tasks: One interface for the chart kinds

Every task ends with `make test ARTIFACT=../2027_chutes_repo_artifact`
green and one commit. The artifact repository is not touched. Copy the
user writes is marked `// placeholder:` where this change adds any; it
adds none. The change is a pure refactor: no task runs `make
snapshots`, and every task runs `make test` where Chromium is installed
(`make setup-browser`), so that the snapshot comparison runs and finds
no unit moved. That is the check of every task.

## 1. One shape for an axis

- [ ] 1.1 `plot/axes.js` opens with the `AxisOptions` typedef of design
      D1, its header no longer describing the options mid-sentence.
      The cells take their category names in the axis: `categoryAxis`
      reads `axis.categories` and adds no `names`; `cellTipText` reads
      `axis.categories`; the flat `xTicks` and `yTicks` go; the
      seasonality card of `insights/workload.js` writes `x: { label,
      categories: HOURS, ticks: LABELLED_HOURS }` and `y: { domain: [7,
      0], categories: WEEKDAY_LABELS }`. `tests/charts_cells.test.js`
      passes the categories in the axis.
      *Verify:* the snapshots do not change; the seasonality card's
      hours and weekdays, its ticks and a cell's tooltip ("Mon") read
      as before in Chromium.

- [ ] 1.2 The stacked bars take `x` and `y` axis options (design D2):
      the scale from `x.domain` and `x.inset`, the marks by `gridMark`,
      `bandAxisMark` and `axisMark` in today's order, the frame titled
      by `y.label`, the tooltip's x by `axisValueText(parameters.x, …)`,
      `barXText` gone, `inset` renamed `barInset`. The two share cards
      of `insights/evolution.js` write `x: TRACE_MONTH_AXIS` and `y: {
      label, tickFormat: formatPercent }`; `drawDayBars` of
      `traffic/traffic_bars.js` writes the `x` and `y` of design D2.
      `tests/charts_stacked_bars.test.js` passes axis options;
      `tests/plot_trace_axes.test.js` reads every month card's
      `x`, its stacked-bars branches gone.
      *Verify:* the snapshots do not change: the share cards' month
      ticks and inset, the explorer's slanted month ticks over a whole
      year and a quarter, and a segment's tooltip ("Month: Apr '25";
      a whole day in the explorer) read as before.

## 2. The colour Map and the draw contract

- [ ] 2.1 Every draw function takes the colour Map itself as its third
      argument, `seriesColours`, and every kind declares all five
      parameters (design D3, D4): the nine kinds, their helpers'
      parameters renamed to `seriesColours` where they hold the Map,
      and the four callers (`insights/figure_card.js`,
      `traffic/traffic_bars.js`,
      `traffic/traffic_distribution_charts.js`, `sections/mixes.js`)
      passing the Map. The repeated "a Map from series name to colour"
      phrases point to one definition. The kinds' tests follow.
      *Verify:* the snapshots do not change; `grep -rn "{ series:"
      site/js` finds no colour wrapper.

- [ ] 2.2 One draw contract (design D4): every draw function is `async`,
      returns nothing and ends with `nameChart(body, parameters.name)`;
      the donut drops its own `role` and `aria-label` code and its
      `chartName` import; `drawFigure`, `drawDayBars` and the
      distribution charts' draw drop their `nameChart` calls, the
      distribution charts passing each chart's `name` instead.
      *Verify:* the snapshots do not change, the accessible names of
      the two donuts, the explorer's bars, the three distribution
      charts and a multi-panel card among them; in Chromium every
      chart SVG has `role="img"` and its name after a legend press.

## 3. The lines and the cells resolve their axes once

- [ ] 3.1 `drawLines` builds `chart` once (design D5) and reads a CDF's
      `cdf` as `y` by `linePoints`; `drawnPoints`, `brokenAtGaps`,
      `framedPoints`, `seriesLine` and `lineTip` take the resolved
      parameters and lose their y-column argument; `yColumn` goes.
      `drawCells` builds its `chart` once and passes it to
      `drawnCells` and `cellTipText`. `tests/charts_lines.test.js`:
      the `yColumn` test goes, the CDF tests pass their rows through
      `linePoints`, a test of `linePoints` is added.
      *Verify:* the snapshots do not change; a CDF card's tooltip
      ("45.0% at or below"), a distribution chart's lines clipped at
      the right edge, and the hourly line broken at its gaps read and
      look as before.

## 4. The parameter lists

- [ ] 4.1 The `colourScale` option goes from `sequentialColour` and its
      test in `tests/plot_frame.test.js` (design D6). `plot/frame.js` opens with the
      `ChartParameters` typedef; each kind exports its frozen
      `<KIND>_PARAMETERS` of design D6's table, and its draw function's
      JSDoc names the list and describes only its own names, the
      shared bullets gone.
      *Verify:* the snapshots do not change; each list names every
      parameter its kind's draw function and helpers read, checked by
      reading each kind against its list.

- [ ] 4.2 `plot/axes.js` exports `AXIS_OPTION_NAMES`; `CHART_KINDS`
      gains `parameterNames` and renames `parameters` to `defaults`,
      `chartParameters` reading it; the walk of design D7 is added to
      `tests/insights_figure_card.test.js`.
      *Verify:* the snapshots do not change; the walk passes on every
      card and panel; with `yRefrence: 1` typed into a card's `chart`,
      or `tickformat` into an axis, it fails naming the card and the
      key (tried by hand, not committed).

## 5. The legend

- [ ] 5.1 `shared/legend.js` takes the legend object with its `swatch`
      and one `legendState`, `{ hidden, onToggle }`, as the last
      argument of `mountLegend(container, legend, legendState)` and
      `drawWithLegend(body, legend, drawChart, legendState)` (design
      D8). `mountLegend` holds the hidden set and, after each press,
      sets every button's `aria-pressed` from it (`isEntryShown`),
      `flipAndCall` gone. The fewer-than-two rule is read by
      `mountLegend` and `drawShownSeries` alone, and `drawWithLegend`
      has no early return. `insights/figure_card.js` puts the kind's
      swatch in the legend; `traffic/traffic_bars.js` and
      `sections/mixes.js` pass `legendState` or none;
      `drawDistributionCurves` calls `drawShownSeries` alone.
      `tests/shared_legend.test.js`, `tests/shared_legend_state.test.js`
      and `tests/insights_cards_charts.test.js` follow, and one test is
      added: two presses leave every button's `aria-pressed` equal to
      its entry being shown in the hidden set `onToggle` received.
      *Verify:* the snapshots do not change; in Chromium a press hides
      a series in a figure card, in the explorer's bars and their three
      distribution charts, and in a donut, a screen reader hears the
      pressed state change, and a choice of one endpoint group shows no
      legend button and draws it, whatever was hidden.

## 6. Small hops

- [ ] 6.1 `drawnBars` is inlined into `drawBars` as a call of
      `shownSeriesRows`, and its two tests go; `sliceShares` sums with
      `columnTotal`; the tests that restate `PERCENTILES` and
      `STATISTICS` go (design D9).
      *Verify:* the snapshots do not change; the bands' and boxes'
      tooltip tests still list the percentiles and the statistics in
      order.

## 7. The documents

- [ ] 7.1 CONTRIBUTING's paragraph on the chart kinds says the one
      signature, the colour Map, the kind naming its chart, the lists
      of parameters with their test, and the two typedefs, in place of
      the flat keys it names (`xTickRotate`, `xInset`, `xTipFormat`);
      its lines on the legend say the legend object and the options
      object; the `site` and `landing-page` spec deltas are checked
      against the code as built.
      *Verify:* `make test` green; `tests/test_readme.py` finds every
      path; `openspec validate one-chart-interface --strict` passes.
