# Design: A simpler Overview, a plain Definition, and a see-also link

## D1. The family mix is one query over the daily rollup

`queries/explore/family_mix.sql` replaces `model_mix.sql`: one row per
family of `daily_rollup`, its `family` and the sum of its requests, most
requested first and Other last. Its requests sum to `trace_totals`' requests, as
the rollup's do. The page reads it once, as `context.orders.families`,
and the donut's rows are its colour order, as the model mix's were.

The Traffic Explorer keeps ordering the families from `daily_by_family`
(`familyOrder`): the two orders are the same ranking by requests, and
the explorer's answer holds every family already, so it reads nothing
more. A tie in requests would order the two differently: the query
breaks it by name, while `familyOrder` keeps the families' first
appearance in `daily_by_family`'s rows. That is harmless while no tie
exists, and none exists in the trace; the shipped-answer test of
`tests/landing_donuts.test.js` fails if one appears.

## D2. What the trends' removal takes with it

`explore/trends.js`, its test and its snapshot units; the queries and
answers `requests_by_month_model`, `tokens_by_month_model`,
`requests_by_month_endpoint`; the `#trends` grid of `index.html` and
`.trend-grid`; `setup/top_models.sql` and the table `top_models`, which
only the model mix and the trends read; the cache
`monthly_requests_tokens_by_model` from `loading.py`, the database and
the fixture. `MODEL_SERIES` and `modelColours` stay: the Traffic
Explorer colours a family's models by them. `trace_calendar` stays:
the daily answers and `trace_totals` read it. `chute_models` stays:
`family_models` reads it. The months module keeps the trace month, which
`trace_totals` counts.

## D3. A card's Definition and the snapshot's figure name

`renderFigureCard` fills the Definition control with the definition
alone; `plotdataPath`, `plotdataAddress`, the link constants and the
cards' `source` fields go, as do the `SECTION_README` constants of the
six topic modules. The card's article carries `data-figure="<figure>"`,
set by `newCardElement`, which the snapshot test reads in place of the
plot-ready link's path to name a card's units; `snapshot_units.py` drops
the `rows` line of a figure card's texts.

## D4. The see-also line

`landing/cite.js` writes, under the citation sentence, one sentence
naming the blog post with a link that opens in a new tab and ends in the
off-site arrow, as every link off the site does; its address joins
`URLS` in `shared/layout.js`, the one place the site's addresses live.
The sentence is a placeholder for the authors.

## D5. Tests

- `test_queries`: `family_mix` returns `family` and `requests`, Other
  last, and sums to `trace_totals`.
- `landing_donuts.test.js`: the family mix's legend is the families in
  the family colours, Other in its grey.
- `insights_figure_cards.test.js`: the Definition control holds the
  definition text and no link; the card's article carries its figure.
- `landing_cite.test.js`: the see-also link.
- `test_repository` / `test_built_data`: the three answers gone, the
  family mix answer tracked.
- Snapshots rewritten (`make snapshots`): the Overview's units and every
  card's texts unit.
