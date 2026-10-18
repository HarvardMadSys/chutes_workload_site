# Tasks: One test harness

Every task ends with `make test ARTIFACT=../2027_chutes_repo_artifact`
green and one commit. The artifact repository is not touched. Copy the
user writes is marked `// placeholder:` where this change adds any; it
adds none. Every task changes tests, the Makefile or the documents'
mentions of test files only: the snapshots must NOT change, `make
snapshots` is never run, and the snapshot step passing unchanged is the
check that no site code moved. The test files carry `one-vocabulary`'s
names; a test file this change adds or removes is entered in README's
layout block (`test_readme.py` requires it) and in CONTRIBUTING's
mentions in the same commit.

## 1. A readable run

- [ ] 1.1 The Makefile's node step with `--test-reporter=spec` (design
      D10), the steps kept in their order; CONTRIBUTING's "Verifying a
      change" says in one sentence what the node step prints.
      *Verify:* `make test | wc -l` drops by about 2,000 lines; a test
      made to fail in the working tree, not committed, is named with
      its file and line in the node step's last lines; snapshots
      unchanged.

## 2. The fixture's trace table by hand

- [ ] 2.1 `tests/fixture_trace.py` of design D8: the trace moved from
      `fixture_artifact.py`, `WEEKLY_HISTOGRAMS` moved from
      `test_tables.py` as `HistogramRow`s, `TRACE_TABLE_SCHEMA` and
      `write_trace_table`; `conftest.py`'s `fixture_tables` writes the
      table by hand, and the pytest fixture `fixture_trace` becomes
      `trace_file`; `test_tables.py`, `test_queries.py`,
      `test_loading.py` and `test_main.py` follow; README's layout names
      `fixture_trace.py`.
      *Verify:* pytest's count is unchanged; with one bin of
      `weekly_histograms.sql` changed in the working tree, not
      committed, only the trace query's tests and the query's hash
      check fail, and every other test of `test_queries.py`,
      `test_answers.py` and `test_site_database.py` passes; snapshots
      unchanged.
- [ ] 2.2 `fixture_artifact.py`'s daily rollup row by row,
      `DAILY_ROLLUP_ROWS` and `ROLLUP_SCHEMA` of design D8, each row
      naming its trace entry.
      *Verify:* before the column-wise table goes, a scratch run shows
      the two tables equal, schema and rows (`Table.equals`); no test
      changes; snapshots unchanged.
- [ ] 2.3 `tests/counted_requests.py` of design D9;
      `test_built_data.py`, `test_answers.py` and `test_tables.py` use
      it; `test_queries.py` reads the site's tables from the database;
      `test_site_database.py` states its nine; the naming test
      (`test_naming.py`) that no test module imports a test module, with
      its planted case.
      *Verify:* `grep -nE "^(import|from) test_" tests/*.py` finds
      nothing; the new naming test fails on a planted
      `import test_tables`; snapshots unchanged.

## 3. One fake page

- [ ] 3.1 `tests/fake_page.js` with the exports of design D1: the one
      `FakeElement` of design D2, held in `tests/fake_element.js` and
      re-exported, `useFakePage` of design D3, `shippedAnswer` of design
      D4. `tests/fake_element.test.js` tests a selector of another form
      throwing, `closest`, `parentElement` set by `append` and
      `replaceChildren` and the `innerHTML` reading;
      `tests/fake_page.test.js` tests `useFakePage`'s answers, 404,
      rejected promise, `reads`, `onRead`, `frames` and the globals
      removed after the test. `useFakeDocument` and `FakeFigureBody`
      stay until their last users move, and `EVERYTHING`, `controlsOf`,
      `TOPIC_ANCHORS` and `TOPIC_TITLES` move to the section fixtures,
      so that every file still runs and the fake stays under 300 lines.
      *Verify:* the new tests pass and every other test runs unchanged;
      `fake_page.js` and `fake_element.js` import nothing from `site/`;
      snapshots unchanged.
- [ ] 3.2 The legend's tests on the shared fake:
      `shared_legend.test.js` and `shared_legend_state.test.js`, the
      private `FakeElement` and `useFakeDocument` gone, `click()`
      written `dispatch("click")`, a chart's body made by `renderFigure`
      and its legend place found as `legendPlace` finds it.
      *Verify:* every test of the two files is kept; a named element is
      reached by selector, the legend's buttons by their order;
      snapshots unchanged.
- [ ] 3.3 The figure's and the figure card's tests on the shared fake:
      `insights_figure_card.test.js`'s private `FakeElement`,
      `useFakeDocument`, `readJson` and `shippedAnswer` gone, its checks
      of every card against its shipped answer moved to
      `insights_cards_answers.test.js` (design D6);
      `shared_figure.test.js` builds its body with `renderFigure`,
      `bodyOfFigure` gone, and `nameChart`'s one test keeps its one-line
      `querySelectorAll` with its comment.
      *Verify:* every test is kept, in the file D6 names; the Definition
      control's paragraph is found through the fake's `innerHTML`;
      snapshots unchanged.
- [ ] 3.4 The page's tests on the shared fake: `tests/page_fixtures.js`
      of design D5; `page_start.test.js` and `page_topic_tabs.test.js`
      on `useFakePage`, `FakeCardPart` and their own documents, windows
      and `fetch` gone.
      *Verify:* the page's start reads the totals, the two mixes and the
      daily answer, then the histograms, then the opening topic's
      figures, as before; snapshots unchanged.
- [ ] 3.5 The explorer's tests on `useFakePage`: `traffic.test.js`'s
      `runExplorer` (its `fakeElement()` and its globals gone, `onRead`
      recording the bars at the histogram's read), and the range's,
      tiles' and distribution charts' tests.
      *Verify:* the histogram answer is still shown read after the bars
      are drawn; no traffic test assigns a global; snapshots unchanged.
- [ ] 3.6 The explorer's fixtures: `tests/traffic_fixtures.js` of
      design D5, `controlsOf` moved there from `fake_page.js`;
      `traffic_controls.test.js` and
      `traffic_controls_period_buttons.test.js` on it and on
      `useFakePage`, `useFakeWindow` gone from both;
      `traffic_filter.test.js`'s `EVERYTHING` and `shippedAnswer` copies
      gone.
      *Verify:* the trace's days, the families and the controls' field
      order are each written once, in `traffic_fixtures.js`; snapshots
      unchanged.
- [ ] 3.7 The rest on the shared fake: `shared_answers.test.js`'s
      `fakeFetch`, `sections_cite.test.js`'s page,
      `charts_bands.test.js`'s document, `shared_format.test.js`'s and
      `sections_mixes.test.js`'s reads of shipped files;
      `tests/insights_fixtures.js` of design D5; `useFakeDocument`,
      `FakeFigureBody`, `EVERYTHING`, `controlsOf`, `TOPIC_ANCHORS` and
      `TOPIC_TITLES` out of `fake_page.js`; the repository test that no
      file of `tests/` but `fake_page.js` sets or mocks a property of
      `globalThis`, with its planted case.
      *Verify:* `grep -nE "globalThis\.\w+ =|mock\.method\(globalThis"
      tests/*.js` finds only `fake_page.js`; `class FakeElement` is
      defined once; the new test fails on a planted
      `globalThis.document =`; snapshots unchanged.

## 4. Where the tests sit and what they restate

- [ ] 4.1 The Insights' card checks split by topic module (design D6):
      `insights_workload.test.js` to `insights_balancing.test.js`, the
      test of cards of two topics left in `insights_cards_charts.test.js`,
      `insights_cards_caching_balancing.test.js` gone; the index page's
      tests moved from `shared_layout.test.js` to `page_index.test.js`.
      *Verify:* the node test count is unchanged; every moved test keeps
      its name; `test_node_test_files_start_with_a_folder` passes;
      snapshots unchanged.
- [ ] 4.2 The tests and asserts of design D7 dropped; the share legend's
      test, the Team's test and the layout's URL keys rewritten as D7
      says.
      *Verify:* the node count falls by the whole tests dropped and no
      more; each dropped row of D7 is named in the commit message;
      snapshots unchanged.
- [ ] 4.3 The documents as built: README's `tests/` entries and
      CONTRIBUTING's mentions of the fake, the fixtures and the
      fixture's trace table say what each holds now; the `site` spec's
      added requirements' wording as built.
      *Verify:* `tests/test_readme.py` finds every path; `openspec
      validate one-test-harness --strict` passes; snapshots unchanged.
