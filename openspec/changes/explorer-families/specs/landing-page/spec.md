# landing-page (delta)

## MODIFIED Requirements

### Requirement: Traffic Explorer
Directly after the Overview, a Traffic Explorer section (that heading,
no eyebrow, anchor `#traffic`, and under the heading one guide line of
the user's words) SHALL hold one row of plain form controls and one wide
card. The controls: a family drop-down ("All families", the families of
the artifact's family table in order of their requests, "Other"), a
model drop-down (disabled while no family is chosen; then "All <family>
models", the family's eight most requested named models and "Other
<family>"), an endpoint drop-down ("All endpoints" and one entry per
endpoint group) and period buttons All, Q2 '25, Q3 '25, Q4 '25 and
Q1 '26 (the calendar quarters the trace spans, by the trace months'
labels). The card: requests per day as stacked bars over the chosen
period, by family while no family is chosen, by model once a family is
and by endpoint group once a model is, with a legend that toggles, and
four tiles above the chart that follow the choice: requests, average
input tokens, average output tokens, and average TTFT with the share of
the chosen requests that record it; an average SHALL divide by the
requests that have the value. The choice SHALL live in the URL query
string as `family`, `model`, `endpoint` and `period`, the default
writing no key; a `model` without a `family`, or not among that family's
entries, SHALL be ignored. The keys SHALL be read when the page opens
and when Back or Forward returns to a history entry; no other key SHALL
be read or rewritten. The section SHALL draw from the
`explore/daily_by_family` answer while no family is chosen and from the
family's `explore/daily_by_model/<family>` answer once one is, fetched
when the family is first chosen, filtering and summing in the browser.
A bar SHALL take no click.

#### Scenario: Choosing a family
- **WHEN** the visitor chooses "DeepSeek"
- **THEN** the bars SHALL show DeepSeek's requests per day split by its eight models and "Other DeepSeek", the model drop-down SHALL offer those entries, the tiles SHALL sum the family, and the URL SHALL read `?family=deepseek`

#### Scenario: Choosing a model
- **WHEN** the visitor, with DeepSeek chosen, chooses "deepseek-ai/DeepSeek-V3-0324-TEE"
- **THEN** the bars SHALL show that model's requests per day split by endpoint group, the tiles its requests, averages and TTFT share, and the URL SHALL read `?family=deepseek&model=<its id>`

#### Scenario: Choosing a period
- **WHEN** the visitor presses "Q3 '25"
- **THEN** the chart SHALL show the days of July to September 2025 only, the tiles SHALL sum those days, and the URL SHALL carry `period=2025-q3`

#### Scenario: An average with missing values
- **WHEN** the chosen requests number 1,000 and 490 of them record a TTFT
- **THEN** the TTFT tile SHALL average those 490 and say 49% record it

#### Scenario: Sharing a view
- **WHEN** a visitor opens `index.html?endpoint=chat_stream&period=2026-q1`
- **THEN** the chart SHALL show the streaming chat requests of January to March 2026 by family, and every figure SHALL be as without the keys

#### Scenario: A model key without its family
- **WHEN** a visitor opens `index.html?model=<a DeepSeek id>`
- **THEN** the chart SHALL show every family and the URL SHALL be rewritten without the key

#### Scenario: Back after a choice
- **WHEN** the visitor shows the fourth topic, then chooses the family Qwen, then presses the browser's Back
- **THEN** the URL SHALL carry no key, and the controls, the tiles, the chart and the header's brand SHALL show everything again; Forward SHALL show Qwen again

#### Scenario: A phone
- **WHEN** the page is opened 360 pixels wide
- **THEN** the controls SHALL wrap, the tiles SHALL stack, and the page SHALL not scroll sideways
