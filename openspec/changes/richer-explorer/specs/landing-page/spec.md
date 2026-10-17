## MODIFIED Requirements

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
once a family is and by endpoint group once a model is; under the bars
two sliders, From and To, over the trace's days, each writing its day,
which set the day range (one slider pushed past the other moves the
other along), the bars and the tiles following as a slider moves; and
three distribution cards, the input tokens, the output tokens and the
time to first token of the chosen requests as CDFs on a log x axis, one
line per series of the bars in its colour, over the trace weeks that
hold a chosen day, each card's caption saying which days those weeks
span. The tiles: requests; average input tokens; average output tokens;
and average TTFT with the share of the chosen requests that record it;
an average SHALL divide by the requests that have the value; and under
each average, once the distributions have arrived, its p50 and p90 read
from the distributions' bins (a quarter-doubling wide, so about 9%
either way), written to two significant figures after "≈". The choice
SHALL live in the URL query string as `family`, `model`, `endpoint`,
`metric`, `from` and `to` (the first and last chosen day, `YYYY-MM-DD`),
the default (everything, requests, the whole trace) writing no key; a
`model` without a `family`, or not among that family's entries, SHALL be
ignored; a `from` or `to` outside the trace's days SHALL be clipped to
them, and a `from` after its `to` SHALL be ignored with it. A period
button SHALL set `from` and `to` to its quarter's first and last day
within the trace, and SHALL show pressed while the range equals its
quarter, All while the range is the whole trace. The keys SHALL be read
when the page opens and when Back or Forward returns to a history entry;
no other key SHALL be read or rewritten. The section SHALL draw the bars
and the tiles from the `explore/daily_by_family` answer while no family
is chosen and from the family's `explore/daily_by_model/<family>` answer
once one is, fetched when the family is first chosen, filtering and
summing in the browser; and the distribution cards and the percentiles
from `explore/histograms_by_family` and the family's
`explore/histograms_by_model/<family>`, which it SHALL fetch only after
the bars of the choice are drawn, each distribution card and percentile
showing its loading state until then, so the bars never wait for the
distributions. A bar SHALL take no click.

#### Scenario: Choosing a family
- **WHEN** the visitor chooses "DeepSeek"
- **THEN** the bars SHALL show DeepSeek's requests per day split by its eight models and "Other DeepSeek", the model drop-down SHALL offer those entries, the tiles SHALL sum the family, the three distribution cards SHALL draw one line per model, and the URL SHALL read `?family=deepseek`

#### Scenario: Choosing a model
- **WHEN** the visitor, with DeepSeek chosen, chooses "deepseek-ai/DeepSeek-V3-0324-TEE"
- **THEN** the bars SHALL show that model's requests per day split by endpoint group, the tiles its requests, averages and TTFT share, the distribution cards one line per endpoint group, and the URL SHALL read `?family=deepseek&model=<its id>`

#### Scenario: Choosing a period
- **WHEN** the visitor presses "Q3 '25"
- **THEN** the chart SHALL show the days of July to September 2025 only, the sliders SHALL stand on July 1 and September 30, the tiles SHALL sum those days, and the URL SHALL carry `from=2025-07-01&to=2025-09-30`

#### Scenario: Dragging the range
- **WHEN** the visitor drags the From slider to 2025-11-03 and the To slider to 2025-11-30
- **THEN** the bars SHALL show those days alone, the tiles SHALL sum them, no period button SHALL show pressed, the URL SHALL carry `from=2025-11-03&to=2025-11-30`, and the distribution cards SHALL cover the trace weeks that hold a day of November 3 to 30 and say so

#### Scenario: Choosing a metric
- **WHEN** the visitor chooses "Input tokens"
- **THEN** the bars SHALL stack the input tokens per day of the chosen requests, the chart's title and tooltip SHALL say so, the tiles SHALL be unchanged, and the URL SHALL carry `metric=input_tokens`

#### Scenario: An average with missing values
- **WHEN** the chosen requests number 1,000 and 490 of them record a TTFT
- **THEN** the TTFT tile SHALL average those 490 and say 49% record it

#### Scenario: Percentiles under the averages
- **WHEN** the distributions of the chosen requests have arrived and their input tokens' p50 falls in the bin from 1,024 to 1,189 tokens
- **THEN** the input-tokens tile SHALL say "≈1,100 p50" by the bin's geometric middle, to two significant figures, with the p90 beside it

#### Scenario: The distributions arrive after the bars
- **WHEN** the page opens on a slow connection
- **THEN** the bars and the tiles' averages SHALL be drawn from the daily answer before the histogram answer is requested, and the distribution cards and the percentiles SHALL show a loading state until it arrives

#### Scenario: Hiding a series
- **WHEN** the visitor presses "Qwen" in the legend
- **THEN** Qwen SHALL leave the bars and the three distribution cards alike, and pressing it again SHALL bring it back in all four

#### Scenario: Sharing a view
- **WHEN** a visitor opens `index.html?endpoint=chat_stream&from=2026-01-01&to=2026-03-31`
- **THEN** the chart SHALL show the streaming chat requests of January to March 2026 by family, the Q1 '26 button SHALL show pressed, and every figure SHALL be as without the keys

#### Scenario: A range outside the trace
- **WHEN** a visitor opens `index.html?from=2024-01-01&to=2025-05-01`
- **THEN** the range SHALL be the trace's first day to 2025-05-01 and the URL SHALL be rewritten so

#### Scenario: A model key without its family
- **WHEN** a visitor opens `index.html?model=<a DeepSeek id>`
- **THEN** the chart SHALL show every family and the URL SHALL be rewritten without the key

#### Scenario: Back after a choice
- **WHEN** the visitor shows the fourth topic, then chooses the family Qwen, then presses the browser's Back
- **THEN** the URL SHALL carry no key, and the controls, the sliders, the tiles, the charts and the header's brand SHALL show everything again; Forward SHALL show Qwen again

#### Scenario: A phone
- **WHEN** the page is opened 360 pixels wide
- **THEN** the controls SHALL wrap, the tiles SHALL stack, the sliders SHALL take the card's width, the distribution cards SHALL stack in one column, and the page SHALL not scroll sideways
