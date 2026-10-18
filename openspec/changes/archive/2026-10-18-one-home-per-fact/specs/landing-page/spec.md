## MODIFIED Requirements

### Requirement: Figure cards are drawn from their answers
A card's figure SHALL be drawn by the site with the chart kind the card
names, from the rows of the figure's answer alone, at the card's width,
with the paper's axes: the same quantities on x and y, a log scale where
the paper's axis is log, the paper's limits where the card gives them,
and tick labels in the site's formats; a y axis of a count SHALL start
at zero and an axis of a ratio at its floor, and an axis of the trace's
days or months SHALL say which dates they are. The one exception to the
paper's axes SHALL be the per-user inter-arrival band card, on a linear
axis to 400 s that clips its bands where the paper's axis is log, so
that the median's move over the year shows. The daily and hourly cards
SHALL count days from the trace's first, their tooltips writing each
day's date. A monthly card SHALL name a trace month by the calendar
month its first day falls in, "Apr '25" to "Apr '26", and SHALL star the
thirteenth, "Apr '26*", since it holds only the trace's last two days;
each card on that axis SHALL say what the star means in its definition.
A CDF SHALL be drawn as
straight lines between its points. A chart SHALL be as tall as its card
asks, 240 px by default, and the two cards of a grid row SHALL take the
same height. Every kind except `raster` SHALL
show a tooltip with the values under the pointer; the two
eviction-algorithm cards' tooltip SHALL list every algorithm's value at
the hovered cache size. A `raster` is drawn
on a canvas and takes no tooltip, and its row ticks sit on the rows'
centres. A bands card SHALL show a key naming its two bands and its
median. The routing card's legend SHALL hold one button per policy,
which hides that policy in both rows of panels. Series colours SHALL
come from the theme, the three highlighted models and the global series keeping one
colour each across every card. In the dark scheme a chart SHALL use the
dark tokens as the Overview's charts do. On a phone a chart SHALL be as
wide as its card and the page SHALL NOT scroll sideways. A card whose
answer fails to load SHALL say so in the chart's place. A chart's SVG
SHALL carry the card's title and insight as its accessible name.

#### Scenario: A value under the pointer
- **WHEN** the pointer rests on the requests-per-day line at day 120
- **THEN** a tooltip SHALL show that day with its date and its requests

#### Scenario: A log axis
- **WHEN** the input-tokens CDF card is drawn
- **THEN** its x axis SHALL be logarithmic from 10 to 1,000,000 tokens, ticked at every decade from 100 to 100,000 in the site's format

#### Scenario: A raster
- **WHEN** the Qwen3-Next-80B card is drawn
- **THEN** it SHALL shade each user row's hours by their requests, with the days of the window on the x axis, neighbouring hours and rows sharing a pixel, shaded by the most requests among them, where the window has more hours or rows than the plot has pixels

#### Scenario: A phone
- **WHEN** the page is opened 360 pixels wide
- **THEN** the cards SHALL stack in one column, each chart as wide as its card, and the page SHALL not scroll sideways

#### Scenario: The partial last month
- **WHEN** a card on the trace's month axis is drawn
- **THEN** its last tick SHALL read "Apr '26*" and its definition SHALL say that the thirteenth month holds only the trace's last two days

#### Scenario: Hiding a routing policy
- **WHEN** the visitor presses a policy in the routing card's legend
- **THEN** that policy's lines SHALL leave every panel of both rows

### Requirement: Traffic Explorer
Directly after the Overview, a Traffic Explorer section (that heading,
no eyebrow, anchor `#traffic`, and under the heading one guide line of
the user's words) SHALL hold one row of plain form controls and one wide
card; the section SHALL span the window less the page's gutters, while
every other section keeps the page's width. The controls: a family
drop-down ("All families", the families of the artifact's family table
in order of their requests, "Other"), a model drop-down (disabled while
no family is chosen, reading "Choose a family"; then "All <family>
models", the family's eight most requested named models and, where the
family has other models, "Other <family>", "Rest of Other" for the
family Other), an endpoint drop-down ("All endpoints" and one entry per
endpoint group), a metric drop-down (Requests, Input tokens, Output
tokens) and period buttons All, Q2 '25, Q3 '25, Q4 '25 and Q1 '26 (the
calendar quarters the trace spans, by the trace months' labels), each a
preset of the day range. The card, from the top: four tiles that follow
the choice; one legend that toggles a series in every chart of the
card; the chosen metric per day as stacked bars over the chosen days,
by family while no family is chosen, by model once a family is and by
endpoint group once a model is; under the bars one slider over the
trace's days with two handles, named From and To, the chosen first day
written under the track's left end and the chosen last day under its
right, which set the
day range (a handle moved past the other moves the other along; each
handle reached by Tab and moved by the arrow keys), the bars, the tiles
and the distributions following as a handle moves; and under the slider
a row of three charts, "Input tokens", "Output tokens" and "Time to
first token", three abreast at desktop width and one under the other on
a narrow screen. The tiles: requests; average input tokens; average
output tokens; and average TTFT with the share of the chosen requests
that record it; an average SHALL divide by the requests that have the
value; under each average, once the distributions have arrived, its
p50 and p90 read from the distributions' bins (a quarter-doubling wide,
so about 9% either way), written to two significant figures after "≈";
a tile SHALL hold nothing else. Each of the three charts: its one-line
title, the chosen requests' distribution of its value as a CDF, one
line in its colour per series of the bars that has a chosen request
recording the value, over the trace weeks that hold a chosen day, at a
figure's height, with an x axis, a y axis (the share of requests) and
a tooltip, and no caption, definition or rows line; the input tokens'
x axis SHALL run from 1 to 1,000,000, ticked at 1, 100, 10k and 1M, the
output tokens' from 1 to 100,000, ticked at 1, 1k and 100k, and the
TTFT's from 0.01 to 100 seconds, ticked at 10 ms, 1 s and 100 s, each
log, the same for every choice, a line clipped at the ends; a chart
none of whose chosen requests records its value SHALL say so in its
place. The choice SHALL live in the URL query string as `family`,
`model`, `endpoint`, `metric`, `from` and `to` (the first and last
chosen day, `YYYY-MM-DD`), the default (everything, requests, the whole
trace) writing no key, and a day at the trace's first or last day
writing no `from` or `to`; a `model` without a `family`, or not among
that family's entries, SHALL be ignored; a `from` or `to` outside the
trace's days SHALL be clamped to the trace's nearer end, and a `from`
after its `to`, once clamped, SHALL be ignored with it. A period button
SHALL set `from` and `to` to its quarter's first and last day within
the trace, and SHALL show pressed while the range equals its quarter,
All while the range is the whole trace. The keys SHALL be read when the
page opens and when Back or Forward returns to a history entry; no
other key SHALL be read or rewritten. The section SHALL draw the bars
and the tiles from the `explore/daily_by_family` answer while no family
is chosen and from the family's `explore/daily_by_model/<family>`
answer once one is, fetched when the family is first chosen, filtering
and summing in the browser; and the three charts and the percentiles
from `explore/histograms_by_family` and the family's
`explore/histograms_by_model/<family>`, which it SHALL fetch only after
the bars of the choice are drawn, each chart and percentile showing its
loading state until then, so the bars never wait for the distributions.
A family's answer that cannot be read, at the page's opening or on a
choice, SHALL show its error in the bars' place and the three charts'
places, the tiles keeping their numbers without percentiles. A bar
SHALL take no click.

#### Scenario: Choosing a family
- **WHEN** the visitor chooses "DeepSeek"
- **THEN** the bars SHALL show DeepSeek's requests per day split by its eight models and "Other DeepSeek", the model drop-down SHALL offer those entries, the tiles SHALL sum the family, the three charts under the slider SHALL draw one line per model, and the URL SHALL read `?family=deepseek`

#### Scenario: Choosing a model
- **WHEN** the visitor, with DeepSeek chosen, chooses "deepseek-ai/DeepSeek-V3-0324-TEE"
- **THEN** the bars SHALL show that model's requests per day split by endpoint group, the tiles its requests, averages and TTFT share, each of the three charts one line per endpoint group whose chosen requests record its value, and the URL SHALL read `?family=deepseek&model=<its id>`

#### Scenario: Choosing a period
- **WHEN** the visitor presses "Q3 '25"
- **THEN** the chart SHALL show the days of July to September 2025 only, the slider's handles SHALL stand on 2025-07-01 and 2025-09-30 and the days under the track's ends SHALL read so, the tiles SHALL sum those days, and the URL SHALL carry `from=2025-07-01&to=2025-09-30`

#### Scenario: Dragging the range
- **WHEN** the visitor drags the slider's first handle to 2025-11-03 and its second to 2025-11-30
- **THEN** the bars SHALL show those days alone, the tiles SHALL sum them, the days under the track's ends SHALL read 2025-11-03 and 2025-11-30, no period button SHALL show pressed, the URL SHALL carry `from=2025-11-03&to=2025-11-30` once the handle is released, and the three charts SHALL cover the trace weeks that hold a day of November 3 to 30

#### Scenario: A handle pushed past the other
- **WHEN** the visitor drags the first handle past the second
- **THEN** the second SHALL move along with it, so the first day is never after the last

#### Scenario: Choosing a metric
- **WHEN** the visitor chooses "Input tokens"
- **THEN** the bars SHALL stack the input tokens per day of the chosen requests, the chart's title and tooltip SHALL say so, the tiles and the three charts SHALL be unchanged, and the URL SHALL carry `metric=input_tokens`

#### Scenario: An average with missing values
- **WHEN** the chosen requests number 1,000 and 490 of them record a TTFT
- **THEN** the TTFT tile SHALL average those 490 and say 49% record it

#### Scenario: The explorer on a wide screen
- **WHEN** the window is 1,920 px wide
- **THEN** the explorer's card SHALL span the window less the gutters, and the Overview and the Insights SHALL keep the page's width, centred

#### Scenario: A family that cannot be read
- **WHEN** the visitor chooses a family whose answer fails to download
- **THEN** the bars' place and the three charts' places SHALL show the error, the tiles SHALL keep their numbers without percentiles, and the drop-down SHALL show the family drawn last

#### Scenario: Percentiles under the averages
- **WHEN** the distributions of the chosen requests have arrived and their input tokens' p50 falls in the bin from 1,024 to 1,218 tokens
- **THEN** the input-tokens tile SHALL say "≈1,100 p50" by the bin's geometric middle, to two significant figures, with the p90 beside it

#### Scenario: The distributions arrive after the bars
- **WHEN** the page opens on a slow connection
- **THEN** the bars and the tiles' averages SHALL be drawn from the daily answer before the histogram answer is requested, and the three charts and the percentiles SHALL show a loading state until it arrives

#### Scenario: A fixed axis
- **WHEN** the TTFT chart is drawn for a choice whose longest TTFT is 4,096 s
- **THEN** its x axis SHALL read "10 ms" at its left end and "100 s" at its right, and each line SHALL run to the chart's right edge, cut there below 100% rather than ended before it

#### Scenario: Hiding a series
- **WHEN** the visitor presses "Qwen" in the legend
- **THEN** Qwen SHALL leave the bars and the three charts alike, and pressing it again SHALL bring it back in all four

#### Scenario: Sharing a view
- **WHEN** a visitor opens `index.html?endpoint=chat_stream&from=2026-01-01&to=2026-03-31`
- **THEN** the chart SHALL show the streaming chat requests of January to March 2026 by family, the Q1 '26 button SHALL show pressed, and every figure SHALL be as without the keys

#### Scenario: A range outside the trace
- **WHEN** a visitor opens `index.html?from=2024-01-01&to=2025-05-01`
- **THEN** the range SHALL be the trace's first day to 2025-05-01 and the URL SHALL be rewritten to `?to=2025-05-01`

#### Scenario: A day beyond the trace
- **WHEN** a visitor opens `index.html?from=2027-01-01`
- **THEN** the range SHALL be the trace's last day alone, both handles SHALL stand on it, and the URL SHALL be rewritten to `?from=2026-04-12`

#### Scenario: A model key without its family
- **WHEN** a visitor opens `index.html?model=<a DeepSeek id>`
- **THEN** the chart SHALL show every family and the URL SHALL be rewritten without the key

#### Scenario: Back after a choice
- **WHEN** the visitor shows the fourth topic, then chooses the family Qwen, then presses the browser's Back
- **THEN** the URL SHALL carry no key, and the controls, the slider, the tiles, the charts and the header's brand SHALL show everything again; Forward SHALL show Qwen again

#### Scenario: A phone
- **WHEN** the page is opened 360 pixels wide
- **THEN** the controls SHALL wrap, the tiles SHALL stack, the slider's track SHALL take the card's width, the three charts SHALL stand one under the other as wide as the card, and the page SHALL not scroll sideways
