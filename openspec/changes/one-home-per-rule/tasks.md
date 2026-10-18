# Tasks: One home per rule

Every task ends with `make test ARTIFACT=../2027_chutes_repo_artifact`
green and one commit. The artifact repository is not touched. Copy the
user writes is marked `// placeholder:` where this change adds or moves
any. A task that renames or moves a file also edits the README and
CONTRIBUTING lines that name it, so that `tests/test_readme.py` stays
green; task 6.1 rewrites the passages whose facts moved. Every task
runs `make snapshots` and expects no change to `tests/snapshots/`; a
diff there is a bug of the task. Every task that does not list an
answer runs `make data` and expects `git diff --stat site/data` to be
empty. This change follows `distributions-below`, `one-vocabulary` and
`one-chart-interface`, and uses their names.

## 1. The data step

- [ ] 1.1 `write_answers` removes `all/explore/` and `all/queries.json`
      only; the comment on the call order in `__main__.py` goes; a
      test writes the figure answers first and the query answers
      second and finds both (design D1).
      *Verify:* the new test fails before the change and passes after;
      `make data` leaves `site/data` unchanged.
- [ ] 1.2 `site_data/paths.py` becomes `site_data/answer_files.py`,
      with `answer_path`, `figure_answer_path`, `ANSWERED_FOLDER` and
      the JSON form moved from `answers.py`; `query_text_hash` moves
      to `site_database.py`; the trace table's file names move to
      `loading.py`; the tests' imports follow (design D2).
      *Verify:* `git diff --stat site/data` empty after `make data`;
      `paths.py` is gone and no module or test names it.
- [ ] 1.3 One way to stop: `tables.required_trace` and `__main__.py`'s
      folder check go; `loading.required_file` with `TRACE_HINT` and
      `ARTIFACT_FILE_HINT` stops every missing file; the missing-folder
      test matches the new message (design D3).
      *Verify:* `python -m site_data --artifact <a folder that does not
      exist> --out <a new folder>` prints one line naming the first
      cache and the hint, exits 1 and writes nothing.
- [ ] 1.4 The caches, the model names, the family table, the trace
      table and the calendar as `pyarrow` tables;
      `with_nullable_integers` and its test go; pandas moves to the
      `test` extra of `pyproject.toml` (design D4).
      *Verify:* `make data` writes every answer byte for byte as
      before; `make tables` is not needed, as the trace query is
      unchanged; `test_the_answers_are_the_ones_the_artifact_gives`
      passes.
- [ ] 1.5 The data step's docstrings and comments of design D5, except
      the trace query's, which waits for 3.4.
      *Verify:* `make test` green; no `.sql` file changed, so
      `queries.json` is unchanged.

## 2. The explorer's choice

- [ ] 2.1 `traffic/traffic_choice.js` holds the choice, the drop-downs'
      entries, `modelOrder` and the one `METRICS` list with each
      metric's bars' words; `traffic_filter.js` keeps the arithmetic;
      `METRIC_WORDS` and its key-sync test go; `traffic_choice.test.js`
      takes the choice's tests; imports and tests follow (design D10).
      Pure refactor: snapshots must NOT change.
      *Verify:* `js/traffic/` holds nine modules, `traffic_filter.js`
      imports `traffic_choice.js` and not the reverse; the explorer
      draws as before at desktop width and 360 px, console clean.

## 3. One home in the queries and answers

- [ ] 3.1 `family_mix.sql` gains `family_slug`; `answers.families`
      reads the family mix in its order and `OTHER_FAMILY` goes; the
      explorer's families are `context.mixes.families` and
      `familyOrder` and `otherLastByRequests` go; a query test checks
      that `daily_by_family`'s slugs are the mix's; the tests follow
      (design D6). `make data`.
      *Verify:* `git diff --stat site/data` lists `family_mix.json` and
      `queries.json` and nothing else, `daily_by_family.json` byte for
      byte unchanged; the family drop-down and the donut list the
      families in one order; snapshots unchanged.
- [ ] 3.2 `otherModelsText(rows, familyName)` in `traffic_choice.js`
      returns the answer's `model` of the family's other models, and
      "Rest of Other" for the family Other, marked `// placeholder:`;
      `modelChoices` and `choiceBreakdown` take it; `otherModelsName`
      goes (design D7). No query changes.
      *Verify:* `make data` leaves `site/data` unchanged; choosing
      DeepSeek shows "Other DeepSeek" and choosing the family Other
      shows "Rest of Other" in the drop-down and the legend; snapshots
      unchanged.
- [ ] 3.3 `months.py` gains `DAYS_PER_TRACE_WEEK` and the `trace_weeks`
      table, registered as the ninth; the histogram queries join it
      and return `last_day`; `daily_by_model.sql` and
      `histograms_by_model.sql` lose `rank <= 8`; `weeksInRange` reads
      `last_day` and the browser's week arithmetic goes;
      `test_tables.py` imports `months.TRACE_EPOCH` and
      `months.DAYS_PER_TRACE_WEEK`; `SITE_TABLES` lists nine (design
      D8, D9). `make data`.
      *Verify:* `git diff --stat site/data` lists the histogram
      answers and `queries.json` only, each histogram row gaining
      `last_day` and nothing else (`daily_by_model` byte for byte
      unchanged); week 0's `last_day` is 2025-04-17 and the last
      week's 2026-04-12; snapshots unchanged.
- [ ] 3.4 The one trace rebuild: the trace query takes `$trace_epoch`
      and `$days_per_trace_week`, which `site_data/tables.py` binds
      from `months.py` (`TRACE_QUERY_PARAMETERS`), and the tests bind
      alike; it loses `rank <= 8`; its comment keeps "reads the trace
      once" and its measurement moves to design D8 (design D5, D8,
      D9). Run `make tables TRACE=<the released trace's Parquet
      file>`. Needs the released trace (proposal, pushback 2).
      *Verify:* the rebuilt `tables/weekly_histograms.parquet` equals
      the tracked one row for row and column type for column type;
      the sidecar's hash alone moves; `make data` changes nothing;
      `test_the_tracked_table_agrees_with_the_artifact_s_rollup`
      passes.

## 4. The Insights

- [ ] 4.1 A topic is `{ id, title, takeaway, groups }`; `topics.js`
      exports `topicNumber`; `placeTopic` writes each section and its
      heading into `#insights`; `index.html` loses the six sections;
      `topic_tabs.js` reads the topic list, not the markup; the
      modules' header ordinals go; the tests' lists derive from
      `TOPICS`; the snapshot reads its states from the tab row and
      `PAGE_STATES` goes (design D11). Snapshots must NOT change.
      *Verify:* `git diff tests/snapshots` is empty; opening
      `index.html#insights-caching` shows that topic, Back and Forward
      follow the tabs, the tab row keeps the ARIA pattern;
      adding a seventh topic to a scratch copy of `TOPICS` shows its
      tab and section with no other edit.
- [ ] 4.2 The test of design D12 in `shared_figure.test.js`, reading
      `grid-row: span N` from `site/style.css` and counting
      `renderFigure`'s parts; the rule's comment names the six parts.
      *Verify:* changing the span to 5 in a scratch edit fails the test
      naming 5 and 6.
- [ ] 4.3 `SHARE_OF_REQUESTS_AXIS` in `plot/axes.js` and
      `MEDIAN_STROKE_WIDTH` in `plot/frame.js`, each imported where
      its copies were (design D13). Pure refactor: snapshots must NOT
      change.
      *Verify:* `grep -rn "SHARE_OF_REQUESTS\b\|MEDIAN_WIDTH" site/js`
      finds no second definition.
- [ ] 4.4 `tests/insights_cards_domains.test.js` with `AXIS_COLUMNS` and
      the five `INTENDED_CLIPS` of design D14, each with its reason;
      the comments beside a domain that quote today's data say why the
      domain was chosen instead.
      *Verify:* the test passes on the shipped data; narrowing one
      domain in a scratch edit fails it naming the figure, the axis,
      the domain and the value; snapshots unchanged.

## 5. Safety nets

- [ ] 5.1 The snapshot test's loud skip of design D15, to standard
      error, exit 0; `tests/test_snapshot.py` checks it with a launch
      that fails.
      *Verify:* `make test` with Chromium moved aside ends with the
      framed lines and exits 0; with Chromium, nothing changes.
- [ ] 5.2 The `test` job of design D16, and `deploy` needs it;
      `tests/test_deployment.py` checks both.
      *Verify:* `tests/test_deployment.py` fails with `needs: test`
      removed in a scratch edit and passes with it; the workflow runs
      on the owner's next push to `main`, nothing being pushed without
      the owner's word, and its page shows `test` finishing before
      `deploy` starts, with the three artifact tests skipped and the
      snapshot test run.

## 6. Documents and the spec's values

- [ ] 6.1 README and CONTRIBUTING as built, the passages whose facts
      moved only: the nine tables and `trace_weeks`, the week's one
      home and the trace query's two bound parameters, the family mix
      as the families' home, the other models' name as the answers
      write it and its one relabel,
      `answer_files.py`, Arrow in place of pandas, `traffic_choice.js`
      and the metric list, a topic's one declaration, the domain test,
      the loud skip, the suite before the deploy; the spec deltas'
      values as built; `-rs` in `pyproject.toml`'s pytest options, so
      that a skipped test says why (design D16).
      *Verify:* `make test` green; `tests/test_readme.py` finds every
      path; `openspec validate one-home-per-rule --strict` passes.
