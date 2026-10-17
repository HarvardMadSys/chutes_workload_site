## MODIFIED Requirements

### Requirement: Hero and stats strip
The page SHALL open with a hero: the title "Chutes Production Trace" with
"Production Trace" in the accent colour and no eyebrow above it; a lede
of the user's words whose month count is read from the `trace_totals`
answer and written in digits; five buttons: "Traffic Explorer" to the
Traffic Explorer section, "Insights" to the Insights section, "Dataset"
(the Hugging Face dataset) with the Hugging Face mark before its text,
"Paper" with a document mark and "Code" with the GitHub mark, each mark
inline in the button's colour; and under them the lab's name "Harvard
SEAS · MadSys Lab" linking to the lab. Beside it a stats strip SHALL
show, computed from the `trace_totals` answer and never typed, the
trace as the paper's summary table counts it: the span in months,
requests, input tokens, output tokens, users, models and serving
instances, and a line naming the span's first and last day.

#### Scenario: Opening the page
- **WHEN** a visitor opens the page
- **THEN** the hero and the stats strip SHALL be visible before any figure, and the strip's request count SHALL equal the Traffic Explorer's requests tile with nothing chosen

#### Scenario: A stat is counted, not typed
- **WHEN** the artifact's `trace_totals` cache changes and `make data` reruns
- **THEN** the stats strip SHALL show the new numbers without an edit to the page

#### Scenario: The site buttons
- **WHEN** the visitor presses "Traffic Explorer" or "Insights"
- **THEN** the page SHALL scroll to that section

#### Scenario: The buttons off the site
- **WHEN** the visitor looks at the Dataset, Paper and Code buttons
- **THEN** each SHALL show its mark before its text and the arrow after, the mark in the button's text colour in the light and the dark scheme

### Requirement: Traffic Explorer
Directly after the Overview, a Traffic Explorer section (that heading,
no eyebrow, anchor `#traffic`, and under the heading one guide line of
the user's words) SHALL hold one row of plain form controls and one wide
card. The controls: a family drop-down ("All families", the families of
the artifact's family table in order of their requests, "Other"), a
model drop-down (disabled while no family is chosen, reading "Choose a
family"; then "All <family> models", the family's eight most requested
named models and, where the family has other models, "Other <family>",
"Rest of Other" for the family Other), an endpoint drop-down ("All
endpoints" and one entry per endpoint group), a metric drop-down
(Requests, Input tokens, Output tokens) and period buttons All, Q2 '25,
Q3 '25, Q4 '25 and Q1 '26 (the calendar quarters the trace spans, by the
trace months' labels), each a preset of the day range. The card, from
the top: four tiles that follow the choice; one legend that toggles a
series in every chart of the card; the chosen metric per day as stacked
bars over the chosen days, by family while no family is chosen, by model
once a family is and by endpoint group once a model is; and under the
bars one slider over the trace's days with two handles, the first day
written under the track's left end and the last under its right, which
set the day range (a handle moved past the other moves the other along;
each handle reached by Tab and moved by the arrow keys), the bars and
the tiles following as a handle moves. The tiles: requests; average
input tokens; average output tokens; and average TTFT with the share of
the chosen requests that record it; an average SHALL divide by the
requests that have the value; under each average, once the
distributions have arrived, its p50 and p90 read from the
distributions' bins (a quarter-doubling wide, so about 9% either way),
written to two significant figures after "≈"; and under that, in each
of the three averages' tiles, the chosen requests' distribution of the
tile's value as a CDF, one line in its colour per series of the bars
that has a chosen request recording the value, over the trace weeks
that hold a chosen day, with an x axis and a y axis and no title,
caption or definition; the input tokens' x axis SHALL run from 1 to
1,000,000, the output tokens' from 1 to 100,000 and the TTFT's from
0.01 to 100 seconds, each log, ticked at decades, a line clipped at the
ends; a tile none of whose chosen requests records its value SHALL say
so in its chart's place. The choice
SHALL live in the URL query string as `family`, `model`, `endpoint`,
`metric`, `from` and `to` (the first and last chosen day, `YYYY-MM-DD`),
the default (everything, requests, the whole trace) writing no key, and
a day at the trace's first or last day writing no `from` or `to`; a
`model` without a `family`, or not among that family's entries, SHALL be
ignored; a `from` or `to` outside the trace's days SHALL be clamped to
the trace's nearer end, and a `from` after its `to`, once clamped, SHALL
be ignored with it. A period button SHALL set `from` and `to` to its
quarter's first and last day within the trace, and SHALL show pressed
while the range equals its quarter, All while the range is the whole
trace. The keys SHALL be read
when the page opens and when Back or Forward returns to a history entry;
no other key SHALL be read or rewritten. The section SHALL draw the bars
and the tiles from the `explore/daily_by_family` answer while no family
is chosen and from the family's `explore/daily_by_model/<family>` answer
once one is, fetched when the family is first chosen, filtering and
summing in the browser; and the tiles' distributions and percentiles
from `explore/histograms_by_family` and the family's
`explore/histograms_by_model/<family>`, which it SHALL fetch only after
the bars of the choice are drawn, each distribution and percentile
showing its loading state until then, so the bars never wait for the
distributions. A bar SHALL take no click.

#### Scenario: Choosing a family
- **WHEN** the visitor chooses "DeepSeek"
- **THEN** the bars SHALL show DeepSeek's requests per day split by its eight models and "Other DeepSeek", the model drop-down SHALL offer those entries, the tiles SHALL sum the family, the three tile charts SHALL draw one line per model, and the URL SHALL read `?family=deepseek`

#### Scenario: Choosing a model
- **WHEN** the visitor, with DeepSeek chosen, chooses "deepseek-ai/DeepSeek-V3-0324-TEE"
- **THEN** the bars SHALL show that model's requests per day split by endpoint group, the tiles its requests, averages and TTFT share, each tile chart one line per endpoint group whose chosen requests record its value, and the URL SHALL read `?family=deepseek&model=<its id>`

#### Scenario: Choosing a period
- **WHEN** the visitor presses "Q3 '25"
- **THEN** the chart SHALL show the days of July to September 2025 only, the slider's handles SHALL stand on July 1 and September 30, the tiles SHALL sum those days, and the URL SHALL carry `from=2025-07-01&to=2025-09-30`

#### Scenario: Dragging the range
- **WHEN** the visitor drags the slider's first handle to 2025-11-03 and its second to 2025-11-30
- **THEN** the bars SHALL show those days alone, the tiles SHALL sum them, the days under the track's ends SHALL read November 3 and November 30, 2025, no period button SHALL show pressed, the URL SHALL carry `from=2025-11-03&to=2025-11-30` once the handle is released, and the tile charts SHALL cover the trace weeks that hold a day of November 3 to 30

#### Scenario: A handle pushed past the other
- **WHEN** the visitor drags the first handle past the second
- **THEN** the second SHALL move along with it, so the first day is never after the last

#### Scenario: Choosing a metric
- **WHEN** the visitor chooses "Input tokens"
- **THEN** the bars SHALL stack the input tokens per day of the chosen requests, the chart's title and tooltip SHALL say so, the tiles SHALL be unchanged, and the URL SHALL carry `metric=input_tokens`

#### Scenario: An average with missing values
- **WHEN** the chosen requests number 1,000 and 490 of them record a TTFT
- **THEN** the TTFT tile SHALL average those 490 and say 49% record it

#### Scenario: Percentiles under the averages
- **WHEN** the distributions of the chosen requests have arrived and their input tokens' p50 falls in the bin from 1,024 to 1,218 tokens
- **THEN** the input-tokens tile SHALL say "≈1,100 p50" by the bin's geometric middle, to two significant figures, with the p90 beside it

#### Scenario: The distributions arrive after the bars
- **WHEN** the page opens on a slow connection
- **THEN** the bars and the tiles' averages SHALL be drawn from the daily answer before the histogram answer is requested, and the tile charts and the percentiles SHALL show a loading state until it arrives

#### Scenario: A fixed axis
- **WHEN** the TTFT tile's chart is drawn for a choice whose longest TTFT is 4,096 s
- **THEN** its x axis SHALL run from 0.01 s to 100 s, and each line SHALL leave the chart at its right edge below 100%

#### Scenario: Hiding a series
- **WHEN** the visitor presses "Qwen" in the legend
- **THEN** Qwen SHALL leave the bars and the three tile charts alike, and pressing it again SHALL bring it back in all four

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
- **THEN** the controls SHALL wrap, the tiles SHALL stack with their charts as wide as a tile, the slider's track SHALL take the card's width, and the page SHALL not scroll sideways

### Requirement: The page appears before the data
The page SHALL draw its layout first, then every number, card, the
Traffic Explorer and the shown topic's cards from the answers and the
images' index, each part showing a loading state until its answer
arrives and its error in its own place if the answer fails, without
stopping the others. The answers SHALL be requested in this order: on
opening, the hero's and the Overview's answers and the Traffic
Explorer's daily answer by family, the last also named in the page's
head so that the browser starts it before the page's modules have
loaded; once the explorer's bars are drawn, its histogram answer; once
the explorer has drawn or failed, the shown topic's figures, which a
tab pressed before then SHALL request at once; a family's answers when
the family is first chosen; and nothing for a topic not shown or a
family not chosen. The page SHALL run no query and load no database.

#### Scenario: A slow connection
- **WHEN** an answer file takes several seconds to download
- **THEN** the page SHALL already show its layout, with a loading state in that answer's place and the other parts drawn

#### Scenario: The explorer before the Insights
- **WHEN** the page opens on a slow connection
- **THEN** the daily answer SHALL be requested before any figure answer, and the shown topic's figures SHALL be requested only once the Traffic Explorer has drawn its tiles, bars and distributions, or shown its error

#### Scenario: A tab before the explorer has drawn
- **WHEN** the visitor presses "02 Request shape and latency" while the explorer's daily answer is still downloading
- **THEN** that topic's figures SHALL be requested at once

### Requirement: Cite, Team and footer
The page SHALL end with a Cite section holding the paper's BibTeX in a
block with a copy button, its lines wrapping rather than scrolling; a
Team section naming Harvard MadSys and collaborators and the paper's
authors with their affiliations as names, not links; and a footer with
the brand line "Chutes Production Trace", one line of the user's words
whose month count is read from `trace_totals` in digits, the lab's name
"Harvard SEAS · MadSys Lab" linking to the lab, and the on-site and
elsewhere links, and nothing else: no copyright line and no policy
links. Every link that leaves the site SHALL show an arrow after its
text; the footer's Dataset, Paper, Code and MadSys on GitHub links SHALL
show before their text the Hugging Face mark, a document mark, the
GitHub mark and the GitHub mark, inline in the link's colour.

#### Scenario: Copying the citation
- **WHEN** the visitor presses the copy button
- **THEN** the BibTeX SHALL be on the clipboard unchanged

#### Scenario: A link off the site
- **WHEN** the visitor looks at the hero's Paper button or the footer's Dataset link
- **THEN** each SHALL show its mark before its text and end in an arrow, and the Traffic Explorer link SHALL show neither
