# Tasks: Readable figures

Every task ends with `make test` green and one commit; `make snapshots`
where a task changes what is drawn, the diff reviewed.

## 1. Lines, frames, axes and formats (shared)

- [x] 1.1 `shared/charts.js` `height`; `axes/ticks.js` `tipFormat`;
      `charts/lines.js`: CDFs linear with `Plot.pointer`, `tipAllSeries`,
      a panel's `series`; `shared/format.js`: `formatSignificant`,
      `formatDurationTick`, `formatHoursTick`, `formatTraceDay` and
      `TRACE_FIRST_DAY`; `insights/figure_card.js`: `TRACE_DAY_AXIS` (from
      `balancing.js`), `TRACE_MONTH_AXIS` with month names and the star,
      `PARTIAL_TRACE_MONTH`, `chartParameters` passing a panel's `series`;
      tests of design D7 for each; CONTRIBUTING's parameter lists.
      *Verify:* `node --test` green; the snapshots change only where a
      month or day axis is drawn (`make snapshots`, diff reviewed).

## 2. Cells, scatter, raster, bars, bands, stacked bars (shared)

- [ ] 2.1 `charts/cells.js`: `yReference`, the collapsed range text;
      `charts/scatter.js`: `yReference`, outline and opacity;
      `charts/raster.js`: centred rows, row rules; `charts/bars.js`:
      `reference`; `charts/bands.js`: `bandKey`, the opacities, the
      median width, placed by `drawFigureChart`; `charts/stacked_bars.js`:
      `segmentInset`; `style.css`: the row alignment of design D4; tests.
      *Verify:* `node --test` green; snapshots of the raster, band and
      share cards change as meant.

## 3. The routing simulation and the policy legend

- [ ] 3.1 Design D3: `balancing.js`'s eight panels and y domains,
      `card_series.js`'s policy legend, `explore/legend.js`'s `names`,
      `policyColours`; the Insights spec's routing wording; tests.
      *Verify:* the card shows eight panels in two rows, four legend
      buttons, a click hiding a policy in both rows; no line on an axis.

## 4. The overview and tokens topics

- [ ] 4.1 Design D4 and D5 for `overview.js` and `tokens.js`; snapshots.
      *Verify:* the seasonality's rows read Sun..Sat; the ratio card is
      wide; the hit grid's top row reads "100%".

## 5. The users and evolution topics

- [ ] 5.1 Design D4 and D5 for `users.js` and `evolution.js`; snapshots.
      *Verify:* the rasters' ticks sit on row centres; the band cards
      show the key; the share bars have no white stripes.

## 6. The caching and balancing topics

- [ ] 6.1 Design D4 and D5 for `caching.js` and `balancing.js` (the
      cards other than the routing one); snapshots.
      *Verify:* the eviction pair shares a row on a 0–1 axis; the TTL
      ticks read "1 ms … 15 min"; the zooms show the even-split line.

## 7. Docs and close

- [ ] 7.1 README and CONTRIBUTING for the new parameters and kinds'
      behaviour; the tasks ticked; the authors' list of D6 kept in the
      change for the user.
      *Verify:* `make test` green; `openspec validate readable-figures
      --strict` passes.
