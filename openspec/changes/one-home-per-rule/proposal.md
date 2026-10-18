# Change: One home per rule

## Why

A newcomer who changes one rule of the site has to find every place
that restates it, and nothing tells them where those places are. The
trace week is written in five places: two query joins, the trace query,
a Python test and the browser. The families' order is written in three:
a query, the data step and the browser, which ignores the order the
page already reads. "Other <family>" is composed in the queries and
again in the browser. The metric list lives in two modules, kept in
step by a test that exists only for that. A topic of the Insights is
declared in seven places, and its title is read back out of the page's
markup. The card grid's `span 6` must equal the number of parts a
figure has, and nothing checks it. Three queries filter `rank <= 8`,
which filters nothing. And `make data` deletes the figure answers
every time it writes the query answers; only a comment about the order
of two calls keeps the build correct.

Two safety nets are missing too. About 58 axes of the Insights' cards
have a fixed domain; after a data rebuild that outgrows one, the chart
clips silently, and the text snapshots do not move. And the deploy
workflow publishes every push to `main` without running a test, while
a clone without Chromium passes `make test` with no chart compared,
saying so in one line among many.

This change follows `distributions-below`, `one-vocabulary` and
`one-chart-interface`, and gives each of these rules one home.

## What Changes

- **Each writer clears what it owns.** Writing the query answers
  removes the query answers and their hashes, and nothing else; the
  figure answers survive whatever order the two writers run in.
- **One module for where answers go and how they are written.**
  `site_data/answer_files.py` holds the folder names, one path
  function per kind of answer and the JSON form; `paths.py` goes. The
  answered folder is one constant, `ANSWERED_FOLDER = "explore"`.
- **One way to stop.** Every missing file stops the step through
  `loading.required_file`; the trace's copy of it and the separate
  check of the artifact folder go.
- **Arrow tables, not pandas.** The data step holds the caches as
  `pyarrow` tables, which DuckDB reads with their integer types and
  nulls intact; `with_nullable_integers` goes, and pandas becomes a
  test dependency.
- **The families' order and slug live in `family_mix`.** The family
  mix answer gains `family_slug`. The data step and the explorer take
  the families, in order, from that answer. `daily_by_family` keeps its
  columns.
- **The browser composes no model name.** It shows the answer's
  "Other <family>" as the answer writes it. The one relabel, "Rest of
  Other" for the family Other, has one function as its home.
- **The trace week is defined once.** `site_data/months.py` holds the
  epoch and the seven days, and builds a ninth table, `trace_weeks`,
  with each week's first and last calendar day. The trace query keeps
  its arithmetic, with the epoch and the week's length bound by name
  from `months.py`. The histogram queries join `trace_weeks`, so the
  histogram answers gain `last_day`, and the browser stops computing a
  date.
- **`rank <= 8` goes** from the three queries that filter by it.
- **The explorer's choice gets its own module.** `traffic_choice.js`
  holds the URL keys, the drop-downs' entries and the one metric list,
  each metric with its bars' words. `traffic_filter.js` keeps the
  arithmetic over rows. `METRIC_WORDS` and its test go.
- **A topic is declared once,** in its module, with its id and title.
  The page writes its section, heading and number. `index.html`, the
  tests and the snapshot read the topic list.
- **The card grid's span is tested** against the parts of a figure.
- **Two duplicated constants get one home each:**
  `SHARE_OF_REQUESTS_AXIS` and `MEDIAN_STROKE_WIDTH`.
- **The shipped data fits every fixed domain,** or the clip is listed
  with its reason, checked by a node test.
- **The snapshot test says loudly when it skips.**
- **The deploy workflow runs the suite first,** and deploys only if it
  passes.

## What it moves

- Answer bytes, once each, with `make data` rerun and the bytes
  checked:
  - `family_mix` gains `family_slug`;
  - the histogram answers gain `last_day`, about 120 KB on the 2.4 MB
    `histograms_by_family` and 410 KB over the eleven
    `histograms_by_model` files;
  - `queries.json`'s hashes.

  No other answer changes a byte. `daily_by_family`, the answer the
  page's head preloads, keeps its shape.
- The trace table is rebuilt once by `make tables`. That one rebuild
  carries the bound epoch and week length, the `rank <= 8` removal and
  the trace query's comment. The rebuilt table must equal the tracked
  table row for row; only its sidecar's query hash moves.
- The site's database holds nine tables, not eight.
- `js/traffic/` goes from eight modules to nine; `site_data/` keeps
  nine.
- `index.html` loses the six topic sections, which the page now writes.
- No snapshot text changes: every task checks this with
  `make snapshots` and an empty diff.
- The artifact repository is not touched.

## Pushback and open points

1. **The trace query keeps its arithmetic.** A trace week is born
   there, from a request's timestamp. A join over 6.1 billion rows to
   look the week up would cost a measured run for no gain in clarity.
   The query takes the epoch as `$trace_epoch` and the week's length
   as `$days_per_trace_week`, both bound by `site_data/tables.py` from
   `months.py`. So the query is still a literal and restates neither
   number. Binding the seven as well as the epoch keeps `months.py`
   the one home of both.
2. **Rebuilding the trace table needs the released trace.** Task 3.4
   cannot run on a machine without it. That task waits, and the
   trace query's edits stay undone until it can run; every other task
   stands alone.
3. **The explorer now waits for the family mix.** Its family drop-down
   reads that answer, as its endpoint colours already read the
   endpoint mix. If the family mix fails to load, the explorer shows
   that error. The answer is 445 bytes and is already read on opening.
4. **`daily_by_family`'s `family_slug` is read by nothing** once the
   explorer reads the families from the mix. The column stays, and a
   query test checks that its slugs are the mix's. A later data change
   may drop it.
5. **The deploy workflow runs without the artifact's checkout.** The
   four tests that need it skip, saying so. The maintainer runs them
   at every commit with `make test ARTIFACT=…`, as CLAUDE.md asks.
   Checking out a second, private repository in CI needs a token and
   would pin nothing.
6. **The first snapshot run on the CI runner may differ** from the
   maintainer's machine. If it does, that is a finding to fix in the
   snapshot's normalisation, not a reason to drop the job.

## Not in this change

- Renaming `site/data/all/` to `site/data/`. The rename changes the
  deployed addresses, `answers.js`, the head's preload, the deploy
  workflow, its test and both documents. It is left for the owner to
  decide. The constant `ANSWERED_FOLDER` is in this change.
- Dropping `daily_by_family`'s `family_slug` (pushback 4).
- The repeated `dashed: ["Global"]` and `scheme: "YlOrRd"` literals and
  the twin cards' identical chart blocks. Each is one card's choice
  that agrees with another today. One constant would tie cards that
  may part.
- The traffic distribution charts' fixed domains. They clip by design
  (`compact-explorer`, pushback 1) and are not cards.
- The shared fake page, the Python fixture's trace table, test modules
  importing test modules and the spec reporter
  (`one-test-harness`).
- The documents' rewrite to one home per fact, the comments outside
  the data step and `style.css`'s order and dead rules
  (`one-home-per-fact`). This change edits only the passages whose
  facts it moves.
