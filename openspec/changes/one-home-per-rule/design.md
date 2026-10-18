# Design: One home per rule

## The engineering rules

Binding, as `openspec/config.yaml` and the `site` spec state them: simple,
readable and maintainable first; no optimisation without a recorded
measurement; plain HTML, CSS and ES modules; names that are words; a
function at most 50 lines, a module at most 300, a folder at most nine
modules; every module tested and `make test` green at every commit.
The owner's instruction for this series is that the refactor is for
simplicity and readability, not clever tricks; where a review offered
a clever form, the plain one is taken below and the reason given.
Each rule gets one home. Where the browser must hold a copy, a test
ties the copy to its home. Nothing here touches the artifact
repository.

## Names

Files and functions are named as the three changes before this one
leave them. From `distributions-below`: `traffic_distribution_charts.js`.
From `one-vocabulary`:
- `js/page/` holds `main.js`, `start.js`, `topic_tabs.js` and
  `topics.js`, whose list is `TOPICS`;
- `insights/workload.js` is the first topic's module;
- `plot/frame.js` holds the Plot frame, `plot/axes.js` the axis
  options and `plot/trace_axes.js` the trace's axes;
- `shared/figure.js` holds `renderFigure`;
- `context.mixes` holds the two mixes' rows, and `choiceBreakdown`
  gives the bars' split;
- the snapshot states are `PAGE_STATES`, named by their anchors;
- the test files follow its naming rule.

From `one-chart-interface`: every kind takes its axes as `x` and `y`
objects.

## Decisions

### D1. Each writer clears only what it owns

`answers.write_answers` today runs `shutil.rmtree` on the whole
`site/data/all/`, the figure answers included. `make data` stays
correct only because `__main__.py` calls it first, as a comment there
says. After this change, `write_answers` removes `all/explore/` and
`all/queries.json`, and nothing else. `write_figure_answers` removes
`all/figures/` and writes `all/figures.json`, as it already does. The
comment in `__main__.py` goes, because the order no longer matters. A
new test writes the figure answers first and the query answers
second, and checks that both are there.

Not taken: one writer that clears `all/` once and then calls both.
That keeps the trap and moves it.

### D2. One module for where answers go and how they are written

`site_data/paths.py` becomes `site_data/answer_files.py`. It holds:

- the folder and file names (`ANSWERS_FOLDER`, `ANSWERED_FOLDER`,
  `QUERY_HASHES_FILE`, `FIGURE_ANSWERS_FOLDER`, `FIGURE_INDEX_FILE`);
- `answer_path(query_name, family_slug=None)`, the path of a query's
  answer relative to the data folder: `all/explore/<query>.json`, or
  `all/explore/<query>/<family_slug>.json` for a family;
- `figure_answer_path(figure)`, `all/figures/<figure>.json`;
- the JSON form: `JSON_SEPARATORS`, `json_value`, `answer_text` and
  `write_answer`, moved from `answers.py`.

`answers.py` and `figure_answers.py` import it. `figure_answers.py`
and `test_built_data.py` stop building the figure path inline.

The four path helpers go. Two of them were used only by tests.
`query_text_hash` moves from `answers.py` to `site_database.py`,
beside `statement_text`, which reads the same file. `tables.py` then
no longer imports `answers.py` for it. The trace table's two file
names move from `paths.py` to `loading.py`, beside `TABLES_FOLDER`,
since `loading.py` reads them and `tables.py` already imports
`loading.py`. `answers.ANSWERED_FOLDERS = ["explore"]` becomes
`answer_files.ANSWERED_FOLDER = "explore"`. `answered_query_names`
then reads one folder without a loop.

`answers.py` is then "run the queries and write their answers", and
`figure_answers.py` is "copy the plot-ready tables". The module count
of `site_data/` stays nine.

Not taken: renaming `site/data/all/` to `site/data/` (proposal, "Not
in this change").

### D3. One way to stop

Every missing file stops the step with `raise SystemExit(message)`,
through `loading.required_file(path, hint)`:

- `tables.required_trace`, a copy of `required_file` with another
  hint, goes. `tables.py` calls
  `loading.required_file(options.trace, loading.TRACE_HINT)`, where
  `TRACE_HINT` is "pass the released trace's Parquet file as --trace".
- `__main__.py`'s separate `is_dir` check of the artifact folder, with
  its `print` and `SystemExit(1)`, goes. `required_file` already
  names the first file missing under `--artifact` and says "pass a
  checkout of the paper's artifact repository as --artifact".

`figure_answers.listed_figures` keeps its own `SystemExit(message)`
for a list whose count is wrong, since that is not a missing file.
`test_a_missing_artifact_folder_stops_before_writing` then matches
the new message: the first cache's path and the hint.

### D4. Arrow tables, not pandas

`loading.read_cache` returns `pyarrow.parquet.read_table(path)` as it
is. DuckDB registers an Arrow table with its integer types and nulls
intact. So `with_nullable_integers`, its docstring paragraph and its
test go. `ArtifactFrames` becomes `ArtifactTables`, each field a
`pyarrow.Table`. The model names are `pyarrow.csv.read_csv(...)
.select(MODEL_NAME_COLUMNS)`, and the family table is
`pyarrow.csv.read_csv(...)`. `months.trace_calendar` returns
`pyarrow.Table.from_pylist(rows, schema=TRACE_CALENDAR_SCHEMA)`. The
explicit schema keeps each column's type: dates as `date32`, and
`month` as `int64`, as pandas gave it. D8's `trace_weeks` is built the
same way.
`site_database.register_tables` reads the last trace day with
`pyarrow.compute.max(tables.daily_rollup["day"])`. It registers
`family_models` from the setup query's `.to_arrow_table()` result, not
`.df()`. DuckDB's `.arrow()` gives a stream that can be read once: a
second query over the registered table read no rows, and a
registration hung. `family_models.requests` is then `DECIMAL(38,0)`,
the exact sum, where pandas gave a double; no query reads it.
`pyproject.toml` moves pandas to the `test` extra; the tests' groupbys
keep it.

The answers must not move a byte. `make data` is run and `git diff
--stat site/data` must be empty. With the artifact,
`test_the_answers_are_the_ones_the_artifact_gives` checks the same.
If a type differs (a timestamp unit, a NaN against a NULL), the fix is
in the schema, never in an answer.

Not taken: keeping pandas and documenting the round trip. Its only
job is to be undone.

### D5. What the data step's comments hold

Each data-step docstring states a definition. A comment says why.
After this change:

- `figure_answers.py`'s header no longer lists every kind's columns;
  it points to README's column contract.
- `site_database.py`'s header no longer describes what `tables.py`
  does.
- `months.py` no longer cites a paper table: "the trace's first day,
  2025-04-11, as the artifact's `trace_totals` gives it".
- A docstring that ends in the house idiom "…; the path." says
  "Returns the path." instead.
- In `tests/fixture_artifact.py`, the `chute-05` comment says what the
  fixture holds: "chute-05 is DeepSeek's rest: named into DeepSeek,
  not among the rollup's kept chutes".
- The trace query's measurement (lines 13 to 15) is recorded in D8.
  The comment keeps "reads the trace once" and the why: one
  projection and an UNPIVOT, so the trace's rows are never held
  whole. That edit changes the query's hash, so it ships in D8's one
  rebuild.

### D6. The families' order and slug live in `family_mix`

The order "most requested first, Other last" is written three times
today: in `explore/family_mix.sql`'s `ORDER BY`, in `answers.families`
(with `OTHER_FAMILY` and a request sum), and in the browser's
`familyOrder` and `otherLastByRequests`, which sum `daily_by_family`'s
13,824 rows to rebuild the order. The page meanwhile already reads the
family mix for the Overview's donut.

After this change, `family_mix.sql` returns `family`, `family_slug`
and `requests`, in its order. It makes the slug with the expression
`daily_by_family.sql` uses. The family mix is then the one home of the
families: their names, their slugs and their order.

- **Data step.** `answers.FAMILIES_QUERY` becomes
  `"explore/family_mix"`. `families(rows)` returns a `Family` per row,
  in the rows' order, and `OTHER_FAMILY` goes. `write_answers` runs
  `answer_rows(connection, FAMILIES_QUERY)` for the families, and the
  dict that kept every single answer's rows goes.
- **Browser.** The explorer's family list is
  `await context.mixes.families`, the family mix's rows.
  `familyChoices` takes those rows as they come. `familyOrder` and
  `otherLastByRequests` go, with their tests. `sections_mixes.test.js`
  checked that the donut and the explorer colour the families alike.
  That now holds by construction, so the check becomes one that both
  read the family mix.
- **`daily_by_family`.** It keeps its columns. No answer loses a
  column here, and the answer the head preloads keeps its shape. Its
  `family_slug` is read by nothing after this change. A query test
  checks that its slugs are the family mix's, so the two cannot part.
  A later data change may drop it.

`make data`: `family_mix.json` gains the column, and nothing else
moves. The families' order is unchanged, since the two orders agree on
the shipped data with no tie. So the colours and the snapshots do not
move, and the printed order of `make data` does not either.

Not taken: dropping `daily_by_family`'s slug in this change (ruled
out above). Also not taken: looking the slug up from
`daily_by_family`'s rows. That is two answers to join for one list.

### D7. The browser composes no model name

`daily_by_model.sql` and `histograms_by_model.sql` write a family's
other models as `'Other ' || $family`, so "Other Other" for the
family Other. That is the data's name, and the queries keep it. The
browser today composes the same name again (`otherModelsName`), and
it replaces the family Other's with "Rest of Other"
(`REST_OF_OTHER_TEXT`).

After this change, the browser composes nothing. It shows the
answer's `model` as it is, through one function in
`traffic_choice.js` (D10): `otherModelsText(rows, familyName)`. The
function returns the `model` of the family's rows whose `chute_id` is
null. For the family Other, it returns "Rest of Other" instead, the
constant `REST_OF_OTHER_TEXT` beside it, marked `// placeholder:` as
the site's copy. That function and its constant are the one home of
the wording. `modelChoices` and `choiceBreakdown`'s label take it, so
`choiceBreakdown(choice, family)` takes the chosen family's answer,
`{ name, rows }`, or null for every family, in place of its name.
`otherModelsName` goes.

No answer changes, and the drop-down and the legend read as before.
The snapshots do not move.

Not taken: writing "Rest of Other" in the two queries. That puts the
site's wording in SQL, in two files.

### D8. The trace week is defined once, in `months.py`

The week is written in five places today:
- the trace query: `date_diff('day', TIMESTAMP '1970-01-01',
  started_at) // 7`;
- the two histogram queries' joins: `DATE '1970-01-01' + week * 7`;
- `tests/test_tables.py`: `TRACE_EPOCH` and `DAYS_PER_WEEK`;
- the browser: `DAYS_PER_WEEK`, `weekLastDay` and `addDays`.

CONTRIBUTING says `trace_calendar` is the one place a date is
computed.

After this change:

- **Python.** `months.py` keeps `TRACE_EPOCH` and gains
  `DAYS_PER_TRACE_WEEK = 7  # a trace week is seven trace days, week 0
  the trace's first seven`. It also gains `trace_weeks(last_trace_day)`,
  a ninth table that `register_tables` registers. The table holds one
  row per week: `week`, `first_day` and `last_day`. The two days are
  the calendar days of the week's first and last trace day within the
  trace, so the last week, of three days, ends on 2026-04-12. Its
  schema gives `week` as `int32`, the trace table's type.
- **Histogram queries.** `histograms_by_family.sql` and
  `histograms_by_model.sql` join `trace_weeks ON trace_weeks.week =
  bin_requests.week` and return `first_day` and `last_day`. The join
  names its columns rather than `USING (week)`: the table check runs
  `duckdb.get_table_names`, which cannot bind a `USING` join over
  tables it does not hold.
- **Trace query.** `weekly_histograms.sql` keeps its arithmetic, since
  a week is born there from a request's timestamp. The arithmetic
  becomes `(date_diff('day', $trace_epoch, trace.started_at::DATE) //
  $days_per_trace_week)::INTEGER`. `site_data/tables.py` binds the two
  parameters by name from `months.TRACE_EPOCH` and
  `months.DAYS_PER_TRACE_WEEK` (`TRACE_QUERY_PARAMETERS`), as
  `run_query` binds `$family`. The query is still a literal, and
  restates neither number. The tests run the trace query with the same
  parameters.
- **Browser.** `weeksInRange` compares `row.last_day >= from`.
  `weekLastDay`, `addDays`, `DAYS_PER_WEEK` and `DAY_LENGTH` go from
  `traffic_distributions.js`, with their tests.
- **Tests.** `test_tables.py` imports `months.TRACE_EPOCH` and
  `months.DAYS_PER_TRACE_WEEK`. `SITE_TABLES` gains `trace_weeks`.

Behaviour does not change. A choice's `from` is never after the
trace's last day. So the last week, which today "ends" on 2026-04-16,
is kept for the same choices when it ends on 2026-04-12.

The trace query's edits ship in one `make tables` (task 3.4): the two
parameters, D9's `rank <= 8` line and D5's comment. The rebuilt table
must equal the tracked one (`pyarrow.parquet.read_table(...)
.equals(...)`), and only the sidecar's hash moves. The query's
comment keeps "reads the trace once", with the why: one projection and
an UNPIVOT, so the trace's rows are never held whole. The measurement
it carried is recorded here. Over the released trace, the query took
30 s and 16 GB on 344 threads, where an earlier form of three UNION
ALL branches over a shared step took 130 s and 751 GB.

`make data`: the histogram answers gain `last_day`. That is about
120 KB on the 2.4 MB `histograms_by_family.json` (5,024 rows) and
410 KB over the eleven `histograms_by_model` files (17,098 rows). No
other answer moves.

Not taken:
- A join of the trace to `trace_calendar` for its week. It is a join
  over 6.1 billion rows to look up what one subtraction gives.
- A `trace_weeks` CTE in each histogram query. That writes the
  grouping twice.
- The epoch bound and the seven left as a literal. That would leave
  the week's length in two homes.

### D9. `rank <= 8` goes

`family_models.sql` says the rollup keeps the chute ids of a family's
eight most requested named models alone, so its rows are already a
family's eight. On the artifact, the most a family has is eight. The
filter `AND family_models.rank <= 8` in `daily_by_model.sql`,
`histograms_by_model.sql` and `weekly_histograms.sql` filters nothing.
It reads as a decision of the site, though. The three lines go, and
the "eight" stays in `family_models.sql`'s comment as the artifact's
rule. The two explore answers must not move a byte. The trace query's
line ships in D8's one rebuild.

### D10. The explorer's choice in its own module, one metric list

`traffic_filter.js` is at 300 lines and holds two things. After this
change, `traffic/traffic_choice.js` holds the choice:

- the URL keys, `OTHER_MODEL` and `NO_FAMILY_MODEL_CHOICES`;
- `METRICS`;
- `readTrafficChoice`, `writeTrafficChoice` and `isSameChoice`;
- the drop-downs' entries: `familyChoices`, `modelOrder`,
  `modelChoices`, `endpointChoices` and `metricChoices`;
- `otherModelsText` (D7).

`traffic_filter.js` keeps the arithmetic over rows: `rowsInChoice`,
`isOfModelAndEndpoint`, `periodDays`, `trafficSummary`,
`choiceBreakdown` and `dailyValues`. Imports run one way: the filter
imports the choice, never the reverse. `modelOrder` goes with the
drop-down whose order it is. `traffic.js` imports it from there for
the models' colours.

`METRICS` is the one metric list. Each entry is `{ value, text,
column, title, valueLabel, note }`: its URL value, its drop-down
text, the daily answers' column it sums, and the bars' title, tooltip
label and caption note. `metricOf(value)` returns an entry.
`METRIC_WORDS` goes from `traffic_bars.js`, and so does the test that
kept its keys in step. The placeholder marks move with the words.
The folder goes from eight modules to nine.

### D11. A topic is declared once

A topic is declared in seven places today:
- `index.html`: its section, its `aria-labelledby`, an unused heading
  id, a hand-typed number and the title;
- its module's `selector` and header ordinal;
- the topic list;
- the test's `SELECTORS`;
- `fake_page.js`'s `TOPIC_ANCHORS` and `TOPIC_TITLES`;
- the snapshot's `PAGE_STATES`.

`topic_tabs.js` reads the number and the title back out of the
heading's markup.

After this change:

- **The topic module.** A topic is `{ id, title, takeaway, groups }`,
  for example `id: "insights-overview"` and `title: "The workload at a
  glance"`. `selector` goes. The headers lose their ordinal ("The
  Insights' fourth topic").
- **The page.** `js/page/topics.js` exports `TOPICS` and
  `topicNumber(index)`, "01" for the first. `placeTopic(topic, index)`
  in `js/page/start.js` appends to `#insights`, after the tab row,
  `<section id="<id>" class="topic" role="tabpanel"
  aria-labelledby="tab-<id>">` and its `<h2><span class="topic-number"
  aria-hidden="true">01</span> <title></h2>`. That is the markup
  one-vocabulary leaves, without the heading ids, which nothing
  references. So the snapshot text does not move. `index.html`'s
  `#insights` keeps its heading and the tab row only.
- **The tabs.** `topic_tabs.js` takes `{ anchor, number, title }` from
  `TOPICS` and `topicNumber`. `pageTopics` and its markup reading go.
- **Tests.** `SELECTORS` goes. `TOPIC_ANCHORS` and `TOPIC_TITLES` are
  derived from `TOPICS`. `page_topics.test.js`'s `TOPIC_FIELDS`
  becomes `id`, `title`, `takeaway` and `groups`.
- **Snapshot.** The test opens `index.html` once and reads the tab
  row's `aria-controls` ids. The states are those anchors, and their
  folders keep the names one-vocabulary gave them. `PAGE_STATES` goes.

A deep link such as `#insights-tokens` finds its section after the
page has written it. `scrollToAnchor` already runs once the sections
have settled, and the tabs read the hash from the topic list.

Not taken: keeping the sections in `index.html` and checking them
against the list in a test. That is a declaration in two places with
a guard, where one place needs none.

### D12. The card grid's span is tested

`.card-grid > .card { grid-row: span 6 }` must equal the number of
parts `renderFigure` appends to a figure with an insight: title,
insight, legend, chart, caption and Definition. A test in
`shared_figure.test.js` reads the span from `site/style.css`'s
`.card-grid > .card` rule. It counts the parts a card with an insight
gets on the fake page, and fails naming both numbers. The comment on
the rule names the six parts; the stale "five rows" comment is
`one-home-per-fact`'s.

Not taken: setting the span from JavaScript. The span is layout, and
the stylesheet is its home. The count is a fact of `renderFigure`.
Neither can hold both, so a test ties them.

### D13. Two duplicated constants

- `SHARE_OF_REQUESTS` is defined in `insights/tokens.js` and
  `insights/caching.js`, and a third copy of the same axis in
  `traffic/traffic_distribution_charts.js`. It becomes
  `SHARE_OF_REQUESTS_AXIS` in `plot/axes.js`, with the axis options, as
  one-vocabulary put the trace's axes in `plot/`. All three import it.
- `MEDIAN_WIDTH = 2` is defined in `charts/bands.js` and
  `charts/boxes.js`. It becomes `MEDIAN_STROKE_WIDTH = 2  // pixels:
  a median's line or tick, drawn heavier than the rest of its mark` in
  `plot/frame.js`. Both kinds import it.

Snapshots do not move.

### D14. The shipped data fits every fixed domain

A new node test, `tests/insights_cards_domains.test.js`, checks every
card and every panel with a numeric `domain` on its `x` or `y` axis.
It reads the axes from `chartParameters(card, entry)` after
one-chart-interface. The check is that the shipped answer's values on
that axis fall inside the domain:

- **The values.** Rows are the card's, or the panel's (`panel`), of
  the series the chart draws (`series`). `AXIS_COLUMNS`, a table in
  the test, names the columns each kind draws on each axis: for
  `bands`, `p10` to `p90` on y; for `cells`, `x_low` and `x_high` on
  x. For `stacked_bars`, a y value is the sum of a day's stack.
- **Skipped.** On a log axis, a value at or below zero is skipped, as
  the kinds skip it. A domain of categories is skipped.
- **Order.** A domain in either order is read as its least and
  greatest values.
- **Intended clips.** `INTENDED_CLIPS` lists, by figure and axis,
  each clip with its reason. Run on today's data, 53 of the 58
  domains hold their data. The five that clip are all intended: the
  four CDF cards whose x axis stops at the paper's limit (input
  tokens, output tokens, the output-to-input ratio, the end-to-end
  latency) and the per-user IAT band cut at `IAT_CAP_SECONDS`.
- **The failure.** A failure names the figure, the panel, the axis,
  the domain and the value outside it.

Each comment beside a domain that quotes today's data ("the busiest
day, 34.9M, sits under the top") is cut to why the domain was chosen.
The test now holds the fact. A rebuild that outgrows a domain then
fails `make test`. The fix is a wider domain, with `make snapshots`
and the diff reviewed, or a listed clip with its reason.

Not taken: a domain fitted to the data at draw time. The fixed
domains are the paper's axes, and the cards keep them.

### D15. The snapshot test says loudly when it skips

When Chromium cannot start, `tests/snapshot.py` prints, to standard
error and as the last thing `make test` prints:

```
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
SNAPSHOTS SKIPPED: Chromium could not start (<reason>).
No chart, legend or text of the page was compared.
Run `make setup-browser`, then `make test` again.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
```

It still exits 0, so a clone without a browser can run the rest of
the suite. `SKIP_MESSAGE` becomes these lines. `tests/test_snapshot.py`
checks that `main` prints them when the launch fails.

Not taken: failing without Chromium. The owner asked for a loud skip,
and the Python and node tests are still worth running on a machine
without a browser. Also not taken: a `--require-browser` flag for CI.
The workflow installs Chromium in the step before the suite, and a
failed install fails that step.

### D16. The suite runs before the deploy

`.github/workflows/deploy.yml` gains a job `test`, and `deploy` gains
`needs: test`. The `test` job runs on `ubuntu-latest`:

1. `actions/checkout`;
2. `actions/setup-python` with Python 3.12;
3. `actions/setup-node` from `.nvmrc`;
4. `make setup`;
5. `.venv/bin/python -m playwright install --with-deps chromium`;
6. `make test ARTIFACT=`.

The empty `ARTIFACT` makes the three tests that need the artifact's
checkout skip, saying so (proposal, pushback 5). pytest prints no
reason for a skip by default, so `pyproject.toml`'s pytest options
gain `-rs`, and the summary names each skipped test and why. Every
other test runs:

- the Python tests;
- the staleness of every answer against its query's text;
- the trace table against its sidecar;
- the node tests;
- the snapshot test in Chromium, which opens the page.

The job adds about three minutes before a deploy. `concurrency`
stays at the workflow's level.

`tests/test_deployment.py` checks that the `deploy` job needs `test`
and that `test` installs Chromium and then runs `make test
ARTIFACT=`. It reads the workflow's text, as it reads the checked
paths today.

Not taken: running only the node tests and the repository tests in
CI. The snapshot test is the one that opens the page, and a page that
does not draw is what the gate must stop.

### D17. What moves, and how each task checks it

| Task | Answer bytes | Trace table | Snapshots |
|---|---|---|---|
| D1 to D5, D7, D9's explore lines, D10 to D13, D15, D16 | none | none | none |
| D6 | `family_mix` gains `family_slug` | none | none |
| D8 | the histogram answers gain `last_day` | rebuilt, equal | none |
| D14 | none | none | none, unless a domain is widened |

For each task, "none" is checked:

- **Answer bytes:** `make data`, then `git diff --stat site/data`.
- **Trace table:** the table equality of D8.
- **Snapshots:** `make snapshots`, then `git diff tests/snapshots`.

`queries.json` changes with every edited query.

## Alternatives not taken

- One writer that clears `all/` for both (D1).
- Keeping pandas (D4).
- Dropping `daily_by_family`'s slug now, or looking it up there (D6).
- The site's wording in the queries (D7).
- A join of the trace to the calendar for its week (D8).
- Topic sections kept in `index.html` with a guard test (D11).
- The span set from JavaScript (D12).
- Domains fitted to the data (D14).
- A hard failure without Chromium, or a CI-only flag (D15).
- CI without the snapshot test (D16).
