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
colour. The From handle's day is written under the track's left end and
the To handle's day under its right end, as `YYYY-MM-DD`; the inputs
keep "From" and "To" as their accessible names (`aria-label`), not
shown. On a phone the track takes the card's width. No day ticks are
drawn on the track. The To input is drawn above the From, so that two
handles standing together part when dragged right; both on the last
day, only From can move away, so From is drawn on top there
(`from-on-top`). When both stand on one day in the middle, the To
handle is on top, and the From handle is moved by the keyboard or once
the To handle has been moved away.

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
share of requests ticked at 0%, 50% and 100% only (six labels touch on
a plot 60 px high), and a tooltip; no title, caption or definition. Its
side margins are narrower than a figure card's, `TILE_CHART_MARGINS`,
52 px on the left for "100%" and 20 px on the right for half the last
tick's label, so the plot keeps most of a tile's width. Its accessible
name (`nameChart`, which takes the name given) is its value's name and
"distribution": "Input tokens distribution", "Output tokens
distribution", "Time to first token distribution". The requests tile
has no chart. A tile is a flex column, its text growing, so that its
chart sits at its foot and the charts' x axes line up across a row
whose texts differ in lines (the TTFT tile's share line); the texts
align at the top.

The chart's place in a tile shows the loading state until the histogram
answer arrives, an error in each of the three if the read fails, and
"None of the chosen requests records this value." (the cards' line)
when no series has a request. The place keeps 140 px, a drawn chart's
height, while it loads or shows a note (`.traffic-tiles .tile-chart`,
beside `TILE_CHART_HEIGHT`; the two change together), so that the bars
and their legend do not move when the charts arrive or every series is
hidden. A handle's move redraws the three charts from the histogram
rows in hand, as it redraws the bars; the legend above the bars hides a
series in the bars and the three tile charts. `placeTiles` of
`traffic_tiles.js` makes the four tiles, each `li[data-tile]` holding a
`div.tile-text` and the three averages' a `div.tile-chart` place, which
it returns for the charts' module to fill; `renderTiles` writes each
text into the tile its `data-tile` names, so that the texts can be
redrawn without the charts and the charts without the texts.

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
at the bins' upper edges.) The ticks are listed beside each domain in
`TILE_CHARTS`, decades from the domain's start to its end, at most
four: input tokens 1, 100, 10k and 1M; output tokens 1, 1k and 100k;
TTFT 10 ms, 1 s and 100 s, the TTFT's in the duration format and
"100 s" past a minute (`formatTtftTick`). They are listed rather than
thinned by `logAxisTicks(domain, 4)`, which over the output tokens' six
decades kept 1, 100 and 10k and left the axis's end, 100k, unlabelled;
a list names both ends of every axis. A line is clipped
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
fixes, in `index.html`, `explore/start.js`, `explore/topic_tabs.js` and
`traffic/traffic.js`, as one rule the spec states:

1. On opening, the page requests the hero's and the Overview's answers
   (`trace_totals`, `family_mix`, `endpoint_mix`, a few hundred bytes
   each) and the explorer's `daily_by_family` answer. The last is also
   named in the page's head, `<link rel="preload"
   href="data/all/explore/daily_by_family.json" as="fetch" crossorigin>`,
   so the browser starts it with the stylesheet, before the module graph
   has loaded and reached `readAnswer`; `crossorigin` makes the preload
   match the `fetch` that `readAnswer` makes, so the answer is fetched
   once, with no warning. `traffic.js` exports the answer's name,
   `FAMILY_QUERY`, and `tests/answers.test.js` checks that the head
   preloads exactly the file `readAnswer` reads for it.
2. Once the bars of the first choice are drawn, the explorer requests
   the histogram answer (`histograms_by_family`, or the family's), as
   now.
3. Once the explorer's first choice has drawn, its distributions
   included, or failed, the page draws the Insights' shown topic from
   its figures. A tab pressed before then draws its topic at once, as a
   tab press always has. As built, `mountTopicTabs` shows the opening
   topic without calling `onShow`, the page's start being its one
   caller and always wanting to decide when to draw (no flag, no second
   path); `startPage` awaits `Promise.allSettled` of the sections and
   the months, so it waits for every section, the explorer among them,
   whatever each did, and then calls `drawShown()`, which draws a topic
   only the first time it is shown.
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
before the change, 1.62 to 1.83 s) and nothing plain, because the
charting library is imported when the first chart is drawn and its
module graph from the CDN (48 modules, 241 KB, in import chains six
deep) takes 0.6 s throttled: the Insights' first figure used to start
that import at 0.8 s, and now the bars start it once the daily answer
has arrived, so the library, not the answer, is the bars' last wait. The
shown topic's figures are requested once the explorer's tile charts are
drawn, which moves the topic from 1.9 s to 2.7 s gzipped and 6.7 s plain
on the slow line.

The page's module therefore starts the library's load itself, before
`startPage`, by `import("../shared/libraries.js")`, so the URL keeps its
one home; a failure is left to each chart, which shows it in its own
place. Measured after that, throttled, three runs each:

| | After, plain | After, gzipped | After, library started early, plain | After, library started early, gzipped |
|---|---|---|---|---|
| Bars drawn | 4.14 to 4.18 | 1.71 to 1.73 | 3.71 to 3.72 | 1.58 to 1.61 |
| Tiles drawn | 3.37 to 3.38 | 0.96 | 3.61 to 3.62 | 0.96 to 0.98 |
| Tile charts drawn | 6.30 to 6.33 | 2.43 to 2.46 | 5.84 to 5.85 | 2.31 to 2.36 |
| Shown topic drawn | 6.67 to 6.72 | 2.73 to 2.75 | 6.20 to 6.21 | 2.61 to 2.66 |

The library now loads from 0.7 to 1.45 s gzipped, beside the daily
answer (done at 0.7 s), and the bars are drawn 0.1 s later than the
library, 0.25 s earlier than before the change; plain, the library is
in hand long before the 3.4 MB answer arrives at 3.5 s, and the bars
follow it at 3.7 s, 0.4 s earlier than before (the tiles 0.25 s later
than without the early load, as the library shares the line). The
Insights' opening topic is drawn later than before the change, 2.6 s
gzipped and 6.2 s plain on the slow line against 1.9 s, as the
proposal's pushback expected; plain it also waits for the 2.3 MB
histogram answer, so the delay is more than the pushback's second or
two. The server is Python's, HTTP/1.x, compressing with gzip on the
fly; Cloudflare serves HTTP/2 and may choose Brotli, so the gzipped
columns approximate the published page rather than reproduce it.

What is not done, and why: prefetching the other families' answers (20
MB uncompressed for a choice most visitors never make; a family's
answers arrive in under a second compressed); a columnar or split form
of the daily answer (its 3.4 MB are 466 KB gzipped, and a split would
make the tiles wait for a second file); a `modulepreload` of the
charting library (its URL has one home, `shared/libraries.js`; the
measurement showed the library on the bars' critical path, and the
page's module starts its import instead, as recorded above).

### D5. Marks on the links off the site

`shared/link_marks.js` holds three inline SVG marks as strings,
`LINK_MARKS`, each one path on a 24-unit grid, `fill="currentColor"`,
1 em square, with `aria-hidden="true"` and `focusable="false"`: the
GitHub mark (GitHub's own, which it allows for linking to GitHub; its
path as Simple Icons publishes it), the Hugging Face mark in one colour
(Simple Icons' drawing, CC0) and a document mark (a page with a folded
corner, drawn here). The module's docstring says where each comes from.
`linkMark(name)` returns a mark by its name and throws a `RangeError`
naming it for a name that is no mark's, rather than writing
"undefined" into the page. The hero's Dataset, Paper and
Code buttons and the footer's Dataset, Paper, Code and MadSys on GitHub
links are written with their mark before the text; the arrow after the
text stays, as the spec requires of every link off the site. A mark is
an `<svg>` inside the `<a>`, styled `.link-mark { width: 1em; height:
1em; vertical-align: -0.125em; margin-right: 0.3em }` so it takes the
link's colour, in both schemes, parted from the text by the arrow's
margin. The hero's button row's gap is 0.5rem, so that the five buttons
with their marks stay on one row at desktop width. The hero's and the
footer's link lists gain a `mark` key naming the mark; one function
writes a link from its entry in each module, as now, by `linkMark`, and
an entry with no `mark` (the Cite sentence's link to the paper) is
written without one.

Not taken: the Hugging Face emoji as text (its drawing differs by
platform) and the marks as image files (one request each, no
`currentColor`).

### D6. Modules

`js/traffic/` keeps eight modules: `traffic.js` (the flow, the places
of the tiles' charts, and `FAMILY_QUERY` exported for the preload's
test), `traffic_filter.js` (unchanged), `traffic_controls.js`
(unchanged but for its comments), `traffic_range.js` (the one track),
`traffic_tiles.js` (`placeTiles`, the texts and the chart places),
`traffic_tile_charts.js` (the three charts, from
`traffic_distribution_cards.js`), `traffic_bars.js` (a word of the
bars' definition) and `traffic_distributions.js` (`coveredDays`, which
only the cards' caption used, gone). `explore/start.js` draws the shown
topic once the sections have settled, and `explore/topic_tabs.js` shows
the opening topic without calling `onShow`; `pages/explore.js` starts
the charting library's import; `index.html`'s head preloads the daily
answer. `shared/charts.js`'s `nameChart` takes a name.
`shared/link_marks.js` is new; `landing/hero.js` and `shared/layout.js`
write the marks.

### D7. Tests

Node: `traffic_range.test.js`, the track holding the bar and the two
inputs over a row of the days at its ends, each handle's name, bounds
and day, the bar between the handles, From on top only with both on
the last day, the push and one frame however often a handle moves (the
keyboard and dragging are the browser's, checked in Chromium);
`traffic_tile_charts.test.js`, the domains and names, each chart's
listed ticks from its domain's start to its end, a row beyond the end
kept, the loading, error and no-value states in the places, every series
hidden, a series the legend does not list left out, `formatTtftTick`;
`traffic_tiles.test.js`, the three places in the input, output and TTFT
tiles and each text written into the tile its `data-tile` names;
`traffic.test.js`, the handles drawing the tiles as they move and
writing the URL once released, the histogram read after the bars, the
tile charts' loading, error and stale-choice states;
`explore_start.test.js`, the real `startPage` and `runTraffic` on a
fake page reading the totals, the two mixes and the daily answer, then
the histograms and no
figure, then the opening topic's figures once the page settles, and a
tab pressed while the daily answer loads reading its topic's figures at
once; `explore_topic_tabs.test.js`, the mount showing the opening topic
without `onShow`; `answers.test.js`, the head's preload naming exactly
the file `readAnswer` reads for `FAMILY_QUERY`; `link_marks.test.js`,
each mark one path in `currentColor`, `linkMark` and its throw, the
hero's three buttons and the footer's four links with their marks
before their text, no link on the site with a mark, the stylesheet's
arrow and `.link-mark` rules; `charts.test.js`, `nameChart` with a name
given. The legend hiding a series in the four charts has no node test
through `runTraffic`, since the bars need Plot from its CDN: it is
covered by `drawTileCurves` with every series hidden and was checked in
Chromium. Snapshots: the explorer's units in `tests/snapshot_traffic.py`
lose the cards' texts and charts and gain the three tile charts'
(`traffic.input_tokens_distribution.chart` and its two siblings: the
name, the listed x ticks, the y axis's three); the day range's unit
names its handles From and To from their `aria-label`; `make
snapshots`, the diff reviewed. Python: the repository test is
unchanged, as `js/traffic/` keeps its eight modules.

## Alternatives not taken

- A hand-made two-handle slider (D1).
- Keeping the three cards and only shrinking them: the user asked for
  the distributions beside their numbers, with no card, caption or
  definition.
- Axes fitted to the data, as now (D3).
- Prefetching, a split daily answer, a `modulepreload` (D4), each
  without a measurement that asks for it.
