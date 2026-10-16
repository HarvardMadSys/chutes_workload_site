# site (delta)

## MODIFIED Requirements

### Requirement: The caches as tables
The data step SHALL hold each cache it reads as a DuckDB table under the
cache file's name, `chute_models.csv` as `chute_models` and
`model_families.csv` as `model_families`. The caches read SHALL be
`trace_totals`, `daily_rollup`, `monthly_requests_tokens_by_model` and
`function_name_daily_requests`, and no other. It SHALL add three tables
derived from them, and no other: `trace_calendar`, each trace day's
calendar day, trace month and calendar month, computed from the trace's
start date (see Trace months); `top_models`, the named models ranked by
their requests over the year, the sum of their monthly requests, made by
the setup query `setup/top_models`; and `family_models`, the named
models of the daily rollup ranked within their family by the rollup's
requests, made by `setup/family_models`. The queries SHALL read from
these nine tables and from nothing else. The site SHALL NOT match a
model's name against a family pattern: a row's family is the cache's.

#### Scenario: A query over the trace
- **WHEN** a query names a table that is not one of the nine
- **THEN** the query test SHALL fail naming the table

#### Scenario: The most requested models
- **WHEN** an answer names the most requested models, the eight of the mixes and trends
- **THEN** it SHALL take them from `top_models`, so that every answer ranks the models alike

#### Scenario: A family's models
- **WHEN** an answer names a family's eight models
- **THEN** it SHALL take them from `family_models`, which ranks the rollup's named models within their family

### Requirement: Answers
`make data` SHALL run every query under `queries/explore/` over the cache
tables and write each answer as `site/data/all/explore/<query>.json`,
with the hash of each query's text in `all/queries.json`, and print the
answers' files and size. A query MAY take one parameter, bound by name
(`$family`) and never substituted into the text; the data step SHALL run
it once per value and write `<query>/<value slug>.json`, the query's
hash recorded once. The queries SHALL be `trace_totals` (one row: the
span's first and last day, requests, input tokens, output tokens, users,
models, instances), `model_mix` (requests per named model, the eight
most requested named and the rest as Other), `endpoint_mix` (requests
per endpoint group), `requests_by_month_model`, `tokens_by_month_model`
(per calendar month, the model mix's eight and Other),
`requests_by_month_endpoint` (per calendar month and endpoint group),
`daily_by_family` (one row per day, family and endpoint group, with the
request count, the input and output token sums and counts, and the TTFT
sum and count) and `daily_by_model` (for the family given: one row per
day, model and endpoint group, the model one of the family's eight with
its chute id and name, or "Other <family>" with a null id, with the same
measures). Every query SHALL be read by the page. The page SHALL draw
from the answers alone and run no query.

#### Scenario: An answer equals the live query
- **WHEN** a query is run in Python over the cache tables
- **THEN** its rows SHALL equal the rows of its answer file, column for column

#### Scenario: A query file without an answer
- **WHEN** the page asks for an answer file that does not exist
- **THEN** the page SHALL show that query's error in its own place

#### Scenario: The daily rollup answer
- **WHEN** `explore/daily_by_family` and every `explore/daily_by_model/<family>` are written
- **THEN** the family answer's requests SHALL sum to `trace_totals`' requests, and each family's model answer SHALL sum to that family's rows of the family answer

#### Scenario: One file per family
- **WHEN** `daily_by_family` names eleven families
- **THEN** `explore/daily_by_model/` SHALL hold eleven files, one per family's slug
