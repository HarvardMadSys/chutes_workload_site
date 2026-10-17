# Design: A compact Traffic Explorer that opens on what matters

## The engineering rules

Binding, as `openspec/config.yaml` and the `site` spec state them: simple,
readable and maintainable first; no optimisation without a recorded
measurement; plain HTML, CSS and ES modules; names that are words; a
function at most 50 lines, a module at most 300, a folder at most nine
modules; every module tested and `make test` green at every commit.
Nothing here changes a query, an answer, a table or the artifact
repository.

## Decisions

### D1. One track, two handles, from two native sliders

The two `<input type="range">` of `traffic_range.js` stay, with their
indices over the trace's days, their push rule (a handle moved past the
other moves the other along), their `input` events coalesced into one
`requestAnimationFrame` and their `change` event writing the URL. What
changes is where they are: both inputs are laid over one track in one
positioned box, the browser's track of each made transparent and only
the thumbs taking the pointer (`pointer-events: none` on the inputs,
`auto` on `::-webkit-slider-thumb` and `::-moz-range-thumb`), so that
either thumb can be dragged, both are reached by Tab and moved by the
arrow keys, and touch works as it does for any slider. The track is one
drawn bar under the thumbs, the span between the handles in the accent
colour. The first day is written under the track's left end and the
last day under its right end; the inputs keep "From" and "To" as their
accessible names, not shown. On a phone the track takes the card's
width. No day ticks are drawn on the track.

Not taken: a slider of our own on a `<div>` with pointer events. It
would need its own keyboard handling, focus ring and touch handling,
some sixty lines for what the browser gives.

### D2. The distributions live in the tiles

The three cards under the bars go, with `traffic_distribution_cards.js`
and the `distribution-grid` rules. In their place the input tokens, the
output tokens and the TTFT tiles each hold, under their number, their
label and their percentile line, a chart of the chosen requests' CDF:
the `lines` kind with `cdf: true`, one line per series of the bars in
the legend's colour, drawn by `traffic_tile_charts.js` (the former
cards' module, cut to the chart). The chart is as wide as the tile and
a fixed `TILE_CHART_HEIGHT` of 140 px; it has both axes, the y axis the
share of requests, and a tooltip; no title, caption or definition. Its
accessible name (`nameChart`) is the tile's label and "distribution",
"Input tokens distribution". The requests tile has no chart and keeps
its height to its text; the row's tiles align at the top.

The chart's place in a tile shows the loading state until the histogram
answer arrives, an error in each of the three if the read fails, and
"No chosen request records it" (the cards' existing line) when no
series has a request. A slider's move redraws the three charts from the
histogram rows in hand, as it redraws the bars; the legend above the
bars hides a series in the bars and the three tile charts. The tiles'
`renderTiles` keeps drawing the texts; it leaves each tile's chart
place (`div.tile-chart`) for the charts' module to fill, so that the
texts can be redrawn without the charts and the charts without the
texts.

On a narrower screen the tiles go two a row, on a phone one under the
other, as now; a chart takes its tile's width in every case.

### D3. Fixed axes

Each tile chart has a fixed x domain, named once in
`traffic_tile_charts.js` with the coverage below as its comment:

| Chart | Domain | Requests within it |
|---|---|---|
| Input tokens | 1 to 1,000,000 | 99.9% at or below 131,072; 100% at or below 112,863,206 |
| Output tokens | 1 to 100,000 | 99.9% at or below 11,585; 100% at or below 8,388,608 |
| TTFT | 0.01 to 100 s | 0.1% at or below 0.088 s; 99.9% at or below 64 s; 100% at or below 4,096 s |

(Measured over `histograms_by_family`, all families, the whole trace,
at the bins' upper edges.) The ticks are the decades within the
domain, thinned by the existing `logAxisTicks(domain, MAX_TILE_TICKS)`
to at most four, the TTFT's in the duration format. A line is clipped
at the domain's ends (`clip: true` on the line mark; the rows beyond
the ends are kept, so the line leaves the chart at the right edge
rather than ending early), and the y axis runs from 0 to 1. A point at
or below the left end, which only a TTFT under 10 ms gives, is clipped
at the left.

### D4. The explorer first, the rest after

Measured before the last change and after it (its design, D8), the
page requested the daily answer by family and the shown topic's five
figures at once, and on a 10 Mbit/s line the topic was drawn at 1.9 s
and the bars at 4.1 s: the figures below the fold shared the line with
the 3.4 MB answer the bars wait for. That is the order this change
fixes, in `explore/start.js` and `traffic/traffic.js`, as one rule the
spec states:

1. On opening, the page requests the hero's and the Overview's answers
   (`trace_totals`, `family_mix`, `endpoint_mix`, a few hundred bytes
   each) and the explorer's `daily_by_family` answer. The last is also
   named in the page's head, `<link rel="preload" as="fetch">`, so the
   browser starts it with the stylesheet, before the module graph has
   loaded and reached `readAnswer`.
2. Once the bars of the first choice are drawn, the explorer requests
   the histogram answer (`histograms_by_family`, or the family's), as
   now.
3. Once the explorer's first choice has drawn, its distributions
   included, or failed, the page draws the Insights' shown topic from
   its figures. A tab pressed before then draws its topic at once, as a
   tab press always has.
4. A family's daily and histogram answers are requested when the family
   is first chosen and kept for the visit; nothing is requested for a
   topic not shown or a family not chosen. Unchanged.

The measurement is run before and after, by the scripts of the last
change's measurement (`scratchpad/perf/measure.py` and
`measure_after.py` beside this repository's scratchpad; they serve
`site/` on a free port, open the page in headless Chromium at 1280 px,
local and throttled to 10 Mbit/s with 50 ms latency, and time the
stats, the tiles, the bars, the distributions and the shown topic from
the navigation's start) extended to serve the files gzipped as well,
since Cloudflare serves the published page compressed and the
uncompressed figures overstate it. Run on the page before the change
(`50630b2`) and after it, three times each; a range is the three runs',
in seconds from the navigation's start. "Gzipped" sends every `.json`,
`.js`, `.css` and `.html` file gzip-compressed; the charting library
comes from its CDN in every case. A request's time is when the network
request started (Resource Timing), and the bytes are those on the wire,
the CDN's included:

| | Before, plain | Before, gzipped | After, plain | After, gzipped |
|---|---|---|---|---|
| Bars drawn, local | 1.00 to 1.28 | 1.08 to 1.23 | 0.90 to 1.02 | 0.80 to 0.95 |
| Bars drawn, throttled | 4.14 to 4.15 | 1.82 to 1.87 | 4.14 to 4.18 | 1.71 to 1.73 |
| Tiles drawn, local / throttled | 0.53 to 0.58 / 4.05 to 4.07 | 0.55 to 0.58 / 1.54 to 1.59 | 0.53 to 0.54 / 3.37 to 3.38 | 0.41 to 0.55 / 0.96 |
| Tile charts drawn, local / throttled | 1.29 to 1.38 / 6.27 to 6.28 | 1.26 to 1.32 / 2.53 to 2.62 | 1.01 to 1.14 / 6.30 to 6.33 | 0.92 to 1.06 / 2.43 to 2.46 |
| Shown topic drawn, local / throttled | 1.20 to 1.28 / 1.95 to 1.96 | 1.17 to 1.23 / 1.81 to 1.92 | 1.21 to 1.33 / 6.67 to 6.72 | 1.12 to 1.25 / 2.73 to 2.75 |
| Daily answer requested at, local / throttled | 0.34 to 0.35 / 0.82 to 0.83 | 0.35 to 0.36 / 0.74 to 0.76 | 0.01 / 0.06 | 0.01 / 0.06 |
| Shown topic's first figure requested at, throttled | 0.81 to 0.82 | 0.73 to 0.75 | 6.29 to 6.33 | 2.43 to 2.45 |
| Fetched before the bars | 106 requests, 4,154 KB | 106 requests, 868 KB | 100 requests, 4,019 KB | 100 requests, 843 KB |

The preload is used: the daily answer is fetched once, from the head,
0.7 s earlier on the slow line, with no warning in the console, and the
tiles are drawn 0.6 to 0.7 s earlier. The bars are drawn no later but
gain little, 0.1 s gzipped (within the spread of an earlier set of runs
before the change, 1.62 to 1.83 s) and nothing plain, because the charting library is imported when the first
chart is drawn and its module graph from the CDN (48 modules, 241 KB,
in import chains six deep) takes 0.6 s throttled: the Insights' first figure
used to start that import at 0.8 s, and now the bars start it once the
daily answer has arrived, so the library, not the answer, is the bars'
last wait, the case the `modulepreload` below is to be reconsidered
for. The shown topic's figures are requested once the explorer's tile
charts are drawn, which moves the topic from 1.9 s to 2.7 s gzipped and
6.7 s plain on the slow line.

What is not done, and why: prefetching the other families' answers (20
MB uncompressed for a choice most visitors never make; a family's
answers arrive in under a second compressed); a columnar or split form
of the daily answer (its 3.4 MB are 466 KB gzipped, and a split would
make the tiles wait for a second file); a `modulepreload` of the
charting library (its URL has one home, `shared/libraries.js`; to be
reconsidered if the measurement shows the modules, not the answer, on
the critical path).

### D5. Marks on the links off the site

`shared/link_marks.js` holds three inline SVG marks as strings, each
`fill="currentColor"`, 1 em square, with `aria-hidden="true"`: the
GitHub mark (GitHub's own, which it allows for linking to GitHub), the
Hugging Face mark in one colour (Simple Icons' drawing, CC0) and a
document mark (a page with a folded corner, drawn here). The module's
docstring says where each comes from. The hero's Dataset, Paper and
Code buttons and the footer's Dataset, Paper, Code and MadSys on GitHub
links are written with their mark before the text; the arrow after the
text stays, as the spec requires of every link off the site. A mark is
an `<svg>` inside the `<a>`, styled `.link-mark { width: 1em; height:
1em; vertical-align: -0.125em; margin-right: 0.4em }` so it takes the
link's colour, in both schemes. The hero's and the footer's link lists
gain a `mark` key naming the mark; one function writes a link from its
entry in each module, as now.

Not taken: the Hugging Face emoji as text (its drawing differs by
platform) and the marks as image files (one request each, no
`currentColor`).

### D6. Modules

`js/traffic/` keeps eight modules: `traffic.js` (the flow),
`traffic_filter.js` (unchanged), `traffic_controls.js` (unchanged),
`traffic_range.js` (the one track), `traffic_tiles.js` (the texts and
the chart places), `traffic_tile_charts.js` (the three charts, from
`traffic_distribution_cards.js`), `traffic_bars.js` and
`traffic_distributions.js` (unchanged). `explore/start.js` draws the
shown topic after the sections. `shared/link_marks.js` is new;
`landing/hero.js` and `shared/layout.js` write the marks.

### D7. Tests

Node: `traffic_range.test.js`, the two inputs in one track, the days at
the ends, the push, the keyboard; `traffic_tile_charts.test.js`, the
domains, the ticks, the rows kept beyond the ends, the loading, error
and no-request states in the tiles; `traffic.test.js`, the order of the
reads in the fake page (daily, then histograms, nothing else) and the
legend hiding a series in the four charts; `start.test.js` or the
explore tests, the shown topic drawn after the sections settle and at
once on a tab press; `link_marks.test.js`, each link off the site in
the hero and the footer carries its mark and the arrow. Snapshots: the
explorer's units in `tests/snapshot_traffic.py` lose the cards' texts
and gain the tile charts' axes; `make snapshots`, the diff reviewed.
Python: the repository test's folder line for `js/traffic/`.

## Alternatives not taken

- A hand-made two-handle slider (D1).
- Keeping the three cards and only shrinking them: the user asked for
  the distributions beside their numbers, with no card, caption or
  definition.
- Axes fitted to the data, as now (D3).
- Prefetching, a split daily answer, a `modulepreload` (D4), each
  without a measurement that asks for it.
