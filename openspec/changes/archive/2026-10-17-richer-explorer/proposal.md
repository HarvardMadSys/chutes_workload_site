# Change: A richer Traffic Explorer

## Why

The Traffic Explorer answers one question, how many requests a family,
model or endpoint got per day, over one of five periods. A visitor who
wants to see a week, or the ramp of a model's first month, cannot; the
four tiles follow the period buttons only; and the explorer says nothing
about the shape of the requests, which the paper's Insights show for
three models over the whole year. The explorer should let the visitor
pick any stretch of days, see the tokens as well as the requests, and see
the distributions of input tokens, output tokens and time to first token
of exactly the requests chosen, with their medians, and it should stay
as quick to open as it is.

## What Changes

- **A day range.** Two sliders under the bars, From and To, over the
  trace's days, set the days shown; the bars and the tiles follow as a
  slider moves. The period buttons stay as presets of the range. The URL
  carries `from` and `to` in place of `period`.
- **A metric.** A drop-down chooses what the bars stack: requests, input
  tokens or output tokens.
- **Distributions.** Under the bars, three cards draw the chosen
  requests' input tokens, output tokens and time to first token as CDFs,
  one line per series of the bars, over the weeks of the range; and each
  average tile gains its p50 and p90. They come from a new table the
  site builds from the released trace once, `tables/weekly_histograms.parquet`:
  the requests per trace week, family, model, endpoint group and
  quarter-doubling bin of each measure. The browser sums bins; no
  per-request row is ever served.
- **The bars never wait for the distributions.** The page opens as it
  does now; a distributions answer is fetched only after the bars of the
  choice have been drawn, and the distribution cards load in their own
  place.
- **The explorer's modules move to `js/traffic/`**, a folder of their
  own, as they grow from three to five.

## What it moves

- The site reads the trace once, in `make tables`, to build the
  histogram table; until now it read only the artifact's committed
  files. The artifact repository is not changed. The table is tracked
  (a few MB, measured in design.md) and rebuilt only when the family
  table, the daily rollup or its query changes.
- The explorer's answers grow by two queries, `histograms_by_family` and
  `histograms_by_model` (one file per family); their sizes are measured
  in design.md. The first answer the page fetches is unchanged.
- `period` leaves the URL; a link with `from` and `to` replaces it. No
  link with `period` has been published.
- The family rule, a model's name against the family table's patterns,
  is applied in the site's trace query as well as in the artifact's, and
  a test checks the two agree on every week, family and endpoint group.

## Pushback and open points

1. **Percentiles from bins are approximate.** A p50 read from
   quarter-doubling bins is within about 9% of the true one. The tiles
   say "≈" and write two significant figures; the CDF's points are exact
   at the bins' edges. The alternative, exact percentiles per week, could
   not be combined over a range of weeks.
2. **The distributions follow weeks, the bars days.** A range of days
   is served by the trace weeks that hold a chosen day; the cards say
   which days those are. Daily histograms would be seven times the
   size.
3. **Hit ratio and users per day** are left for a later change; they
   would ride the same trace pass.

## Not in this change

- The Insights' figures, the Overview and the hero.
- Prefetching the other families' answers.
- Any change to the artifact repository.
