# Design: Readable figures

The reviews are in the session's scratch folder; what they found that the
site acts on is below, by mechanism and then by card. Nothing here reads
a different answer: every change is a chart parameter, a kind's drawing
or a card's layout.

## D1. New chart parameters, one home each

| Parameter | Where | What it decides |
|---|---|---|
| `height` | `shared/charts.js` `titledFrame` (every kind) | the chart's height in pixels, `CHART_HEIGHT` (240) when not given; the two cards of a grid row take the same value so the row stays level |
| `x.tipFormat` / `y.tipFormat` | `axes/ticks.js` `axisValueText` | how an axis value is written in the tooltip when it differs from the ticks' format |
| `tipAllSeries` | `charts/lines.js` | the tooltip at the hovered x lists every shown series' value, highest first; for charts of few x values whose lines coincide |
| `series` on a panel entry | `insights/figure_card.js` `chartParameters` → `lines.js` | the panel draws only these series of the card's; the card's legend still lists them all |
| `segmentInset` | `charts/stacked_bars.js` | pixels taken off the top and bottom of each segment, `BAR_INSET` when not given; 0 for shares, whose thin segments would vanish |
| `yReference` | `charts/cells.js`, `charts/scatter.js` | a dashed horizontal rule at this y, in `DASH` and the axis colour |
| `reference` `{ value, label }` | `charts/bars.js` | a dashed horizontal rule with a short label at its right end |
| `bands` key | `charts/bands.js` `bandKey(colour)` | a non-interactive key, "10th–90th", "25th–75th", "Median", placed by `drawFigureChart` in the legend place of a bands card |

Kinds also change without a parameter: a CDF's curve is linear (its
answers are 101 percentile points, which the paper joins with lines) and
its tooltip uses `Plot.pointer`, the point nearest in both x and y; the
raster's y domain is `[-0.5, rows - 0.5]` so a tick sits on its row's
centre, and rows at least 6 px tall are separated by a 2 px rule in the
card's surface colour; the bands' opacities become 0.12 and 0.25 and
the median 2 px; the cells' tooltip writes a range whose two ends read
the same once ("100%", not "100%–100%"); the scatter's dots take a 0.5 px
axis-coloured outline and 0.7 opacity, so a near-white middle colour is
seen on both schemes.

Formats, in `shared/format.js`: `formatSignificant(value)` (two
significant figures, "0.00047"); `formatDurationTick(seconds)` ("1 ms",
"0.1 s", "10 s", "15 min", "1 h"); `formatHoursTick(minutes)` ("6 h");
`formatTraceDay(day)` ("Day 150 · Sep 8, 2025") from `TRACE_FIRST_DAY`,
a constant whose comment names `site_data/months.py` as its source and
which a node test checks against the shipped `trace_totals` answer's
`first_day`, so the two cannot drift.

## D2. The shared axes of the cards

In `insights/figure_card.js`: `TRACE_DAY_AXIS`, labelled "Day of the
trace (0 = Apr 11, 2025)" with `tipFormat: formatTraceDay`, moved from
`balancing.js` and used by the overview's four daily cards and the
balancing topic's three hourly cards; `TRACE_MONTH_AXIS` ticked at
months 1, 7 and 13 (five names run together on a phone) and labelled
"Apr '25", "Oct '25", "Apr '26", the
thirteenth with a star, "Apr '26*", since it holds the trace's last two
days (`PARTIAL_TRACE_MONTH = 13`), its title "Month"; the evolution
topic's cohort axis takes the same names, titled "Release cohort (month
first seen)". The star is explained in the definitions of the cards that
use the axis (the user's copy, placeholder).

## D3. The routing simulation as two rows

`balancing.js` gives the card eight panel entries: panels a–d drawing
DeepSeek V3.2's four series, titled "(a) Hit ratio vs cache size ·
DeepSeek V3.2" and so on, then the same four of MiniMax M2.5, each row
built by `routingRow` from the model's name, which names its series and
titles its panels; `dashed` goes. The y domains per row: (a) DeepSeek
`[0, 0.55]`, MiniMax `[0, 0.7]`; (b) and (c) DeepSeek `[0.9, 2.0]`,
MiniMax `[0.9, 2.7]`; (d) DeepSeek `[0, 2.5]`, MiniMax `[0, 4.5]`, so no
line lies on an axis. `card_series.js`: for the `policies` palette the
legend lists each policy once, labelled by the policy, and hiding a
policy hides its series in both rows (`figureLegend` returns, per entry,
the names it toggles; `explore/legend.js` entries gain an optional
`names` list, the entry's `name` by default). `policyColours` gives
Round-robin, the cache-blind baseline, the Other grey and the three
others well-separated slots (1, 8, 3), checked by the contrast test.

## D4. Each topic's cards

Overview: `WEEKDAY_LABELS` Sun..Sat (row 0 holds Sunday, the artifact
README's `dayofweek`); `valueLabel` "Average requests in the hour"; y
domains `[0, 36e6]`, `[0, 225e9]`, `[0, 450]` on the three single-line
cards; `TRACE_DAY_AXIS` on the four; `style.css` aligns a chart without
a legend to the bottom of its grid row (`align-self: end` on
`.figure-legend:empty + .figure-body` in the card grid) so the x axes of
a row line up.

Tokens: the ratio card `isWide` so the rows pair (input | output),
(ratio), (end-to-end | TTFT share), (duration grid | TTFT grid), (hit
grid); input axis `domain: [10, 1e6]`, ticks 100 … 100k; the ratio axis
ticked `[0.01, 0.1, 1, 10, 100]` (a tick at 0.001 met 0.01's label on a
phone), its tooltip `formatSignificant`; the hit-ratio grid's y ticks
`[0, .2, .4, .6, .8, 1.05]` written as percentages with 1.05 and above
as "100%", so the all-cached row is labelled at its centre;
`height: 320` on the three grids.

Users: `height` 340 on the two density cards and the two burstiness
cards, 400 on the two rasters of a model's users and the two
input/output cards; x ticks every decade on the users' input/output card
and on the two burstiness cards (`[10, 100, 1e3, 1e4, 1e5]`);
`yReference: 1` on the burstiness pair; axis titles "Median input
tokens" / "Median output tokens"; the model rasters' definitions lose
the sampling sentence.

Evolution: `segmentInset: 0` on the two share cards; y domains `[10,
30e3]` and `[7, 1500]` on the monthly interval cards; the cohort cards'
y titles "Per-user median input tokens" / "… output tokens"; the band
key on the four band cards; the month names and star.

Caching: the TTL card `isWide` so the two eviction cards share a row;
its x ticks `[0.001, 0.1, 10, 900]` in `formatDurationTick`; the
eviction cards on `HIT_RATIO_AXIS` (0–1) with `tipAllSeries`; the
per-model cells x `domain: [100, 2e8]`, ticks `[100, 1e4, 1e6, 1e8]`,
the per-user `[10, 2e8]`, `[10, 1e3, 1e5, 1e7]`; the box card's bottom
margin stays 72 (at 52 its slanted model names ran 15 px past the
chart's foot); the IAT band card's key and month names.

Balancing: D3; the occupancy heat map's x in `formatHoursTick`, titled
"Hours into the window"; active instances `domain: [0, 18]`; max/mean
`domain: [1, 2.1]`; `schemeStart: 0.1` on the two latency grids; the
user zooms' request-share panels with `reference: { value: 100 / N,
label: "even split" }`, N the panel's instances (12 and 11).

## D5. Copy corrected on the site, marked placeholder

"binned into hexagons" → "binned into cells of a log grid" (the cells
are squares: users 01–04 and 09, caching 03–04, balancing 05–06), and on
the two balancing grids "each hexagon coloured" → "each cell coloured";
the occupancy's definition names its window's start, "from 17:00 UTC on
day 317 of the trace", which its axis, now hours into the window, no
longer shows; the token-share caption's "in both panels" → "in both
charts"; the model rasters' "At most 800 of the model's users are shown,
picked by a seeded shuffle" dropped (all 230 and 540 are shown); the
seasonality's "in millions" dropped.

## D6. For the authors (not changed)

- Seasonality: the paper's rows are labelled one day late; with the true
  days the weekend is not lower (Fri lowest, spread ±4%), and the peak is
  12–16 UTC; two rows are divided by another weekday's day count.
- Insights that lean on a neighbouring card: active models ("API mix"),
  input tokens ("prompt-heavy"), end-to-end latency, monthly input
  intervals ("outputs shrink"), popularity ("persistently so").
- "MiniMax-M2.5" in captions against "MiniMax M2.5" in legends; "Fraction
  of TTFT" reads backwards; a caption's ambiguous "it"; the TTFT grid's
  caption repeats the duration card's insight.
- Populations the definitions omit (users with more than ten requests and
  two models; models with more than 100 requests; requests with logged
  cached tokens; "at least 8,000" input tokens), if wanted in plain words.
- Month 13 and cohort 13 hold two days; cohort 4's lower percentiles are
  2 tokens.
- The PDF's Figures 9–11 were drawn from other numbers than the artifact's
  plotdata.
- LRB equals LRU at every cache size in both simulations; the paper says
  ten cache sizes, MiniMax's answer has six.
- The occupancy window starts 17:00 UTC on the site, 21:00 in the PDF;
  "quiet" instances are inactive (blank) rows; "mostly on one instance"
  is a 27.6% share; the paper says the two zooms are one user, the
  artifact two; Fig 16's caption says V3.2, the data is V3-0324; the
  active-instances caption cites a token series not drawn; the routing
  definition should say Sticky is left out of (d).
- The paper's "minutely CV" against the artifact's hourly CV.

## D7. Tests

Each new parameter and format has a node test; the raster's row centring
and gaps, the cells' collapsed range, the CDF's linear curve and the
policy legend's grouping are tested over the shipped answers as the
existing figure-chart tests are; `TRACE_FIRST_DAY` is tested against the
shipped `trace_totals`; the spec's scenarios (a log axis from 10 to
1,000,000; the routing card's eight panels; the hit grid's "100%") are
tested; the snapshots are rewritten per topic.
