# Design: Families in the Traffic Explorer

## The engineering rules

Binding, as `openspec/config.yaml` and the `site` spec state them: simple,
readable and maintainable first; no optimisation without a recorded
measurement; plain HTML, CSS and ES modules; names that are words; a
function at most 50 lines, a module at most 300, a folder at most nine
modules; SQL as one literal per `.sql` file with values substituted at
the edge; every module tested and `make test` green at every commit. The
rule that places a model in a family has one home, the artifact.

## Decisions

### D1. The family rule is a table in the artifact

`data/paper/model_families.csv` has two columns, `family` and `pattern`,
one row per pattern, in order. A named model (one in
`data/paper/chute_models.csv`) belongs to the family of the first pattern
its name contains, case-insensitively; a named model that matches no
pattern, and every unnamed model, is `Other`. The first table:

| family | pattern |
|---|---|
| DeepSeek | deepseek |
| Qwen | qwen |
| Gemma | gemma |
| Hermes | hermes |
| Mistral | mistral |
| Mistral | devstral |
| Mistral | magistral |
| GLM | glm |
| gpt-oss | gpt-oss |
| Kimi | kimi |
| Llama | llama |
| MiniMax | minimax |

Hermes precedes Mistral and Llama because the Hermes fine-tunes carry
their base's name; DeepSeek precedes Qwen and Llama for its distills.
The rule is applied in one place, the artifact's rollup query, by a join
on `LIKE` over the patterns in table order; the site reads the family
from the cache and never matches a name. Task 0 records each family's
share of requests, which is how the table is checked by eye.

*Alternative rejected:* the organisation prefix of the model name. No
table, but Gemma sits under `unsloth`, the TNG Chimeras leave DeepSeek,
and the `chutesai` Mistrals leave Mistral.

### D2. The rollup keeps the family and the top eight per family

`daily_rollup.parquet` becomes one row per day, `family`, `chute_id` and
endpoint group, with the same measures as today. `chute_id` is kept for
the eight most requested named models of each family (by requests over
the whole trace, ties on `chute_id`) and is null for the family's other
models, so that a family's rows still add up to the family and a day's
rows to the day. About 100 slots (eleven families, eight models and a
rest each) over 367 days and five groups; the file is expected to be a
few MB.

### D3. Two answers: by family, and by model per family

`explore/daily_by_family`: one row per day, family and endpoint group,
the measures summed, about 20,000 rows, fetched when the page opens, the
chart's and the tiles' source while no family is chosen.

`explore/daily_by_model`: one row per day, model and endpoint group for
one family, the model being the chute id and name of one of the family's
eight or "Other <family>" with a null id. The query takes the family as
its one parameter, bound by DuckDB (`$family`), and the data step runs
it once per family of `daily_by_family`'s answer, writing
`site/data/all/explore/daily_by_model/<family slug>.json`; the hash in
`queries.json` is the query text's, once. The page fetches a family's
file when the family is chosen and keeps it for the session.

*Alternative rejected:* one answer of every family's models. Eleven
families times nine slots times five groups times 367 days is up to
180,000 rows, at today's 290 bytes a row about 25 MB; a visitor who
wants DeepSeek would download Kimi.

The derived table `top_models` (ranks over the whole trace, the
Overview's eight) stays; a second setup query, `setup/family_models`,
ranks the named models within their family from the rollup's own
requests, so the answers' "eight of the family" are the cache's eight.

### D4. The controls and the chart

The controls row: a family drop-down ("All families", the families in
order of requests, "Other"), a model drop-down ("All <family> models",
the family's eight by requests, "Other <family>"; disabled with "Choose a
family" while no family is chosen), the endpoint drop-down and the
period buttons as today. The chart stacks by family, then by model, then
by endpoint group as the choice narrows; the legend toggles; the tiles
follow the choice. The URL carries `family` (the slug), `model` (the
chute id, or `other` for the family's rest), `endpoint` and `period`; a
`model` without a `family`, or not in the family, is ignored. Colours:
`theme/colours.js` gains `familyColours`, eleven swatches with Other
last, checked by the contrast test; a family's models take the model
palette as today.

`traffic_filter.js` keeps the choice and the row filters;
`traffic_controls.js` the controls; `traffic.js` the card, now also the
fetch of a family's answer on choice. Each stays under 300 lines, or the
answer fetching moves into `shared/answers.js` as a cached read.

### D5. Tests

Python: the fixture rollup gains families; `daily_by_family` sums to
`trace_totals`; each family's `daily_by_model` answer sums to the
family's rows of `daily_by_family`; the parameterised query is hashed
once and written once per family. Node: the choice's URL round trip with
`family`; the series column per choice; a `model` key outside its family
is dropped; the family colours' contrast. Snapshot: the explorer's unit
with the default choice shows families.

## Measurements to record when the data is first built

The rollup's rows and bytes in the artifact; each family's share of
requests (the check of the pattern table); the by-family answer's size
and the largest family's answer.
