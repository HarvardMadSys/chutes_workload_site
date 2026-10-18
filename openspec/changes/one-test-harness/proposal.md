# Change: One test harness

## Why

A newcomer who writes a test for a new section first has to work out
which fake to copy. The node tests fake the page five ways: the shared
`FakeElement` of `tests/fake_page.js`, a second `FakeElement` of the
same name in the legend's tests that keeps one listener per event where
the shared one keeps a list, a third in the figure card's tests that
reads `innerHTML`, and three ad-hoc stand-ins (`FakeCardPart`,
`fakeElement()`, `FakeFigureBody`). `globalThis.document` is assigned
eleven times in eight files, `fetch` is faked five ways and
`shippedAnswer` is copied five times. A test can pass on one fake and
fail on another.

The Insights' card checks are split in two files by size, not by the
topic that declares the card. Several tests assert a constant against
its own literal or copy a list the code already holds, so they fail
only on an intended edit. Others guard features that were removed.
`make test` prints 2,518 lines of TAP with no file names, and its
warnings are buried.

In Python, every query test runs the trace builder first, so a fault in
the trace query fails every test of the site's queries and points away
from its cause. The trace table counted by hand sits in a test module.
The fixture's daily rollup is written as eleven parallel columns beside
a trace written row by row. Two test modules import other test modules
for a constant.

This change follows `one-home-per-rule`, the fourth of the series. It
uses the folders, modules and test file names of `one-vocabulary`, the
shared `FakeElement.querySelector` that `distributions-below` adds, and
the topics declared once of `one-home-per-rule`.

## What Changes

- **One fake page.** `tests/fake_page.js` holds one `FakeElement` for
  every element, one `useFakePage` that sets `document`, `window` with
  its history, `fetch`, `requestAnimationFrame` and `ResizeObserver` for
  one test and removes them after it, and one `shippedAnswer`. The
  legend's and the figure card's private fakes, `FakeCardPart`,
  `fakeElement()`, `FakeFigureBody`, `useFakeDocument` and every other
  hand-set browser global go.
- **Fixtures per section.** What two test files of one section share
  moves into `tests/traffic_fixtures.js`, `tests/insights_fixtures.js`
  or `tests/page_fixtures.js`, and the local copies go.
- **Tests where their module is.** The Insights' card checks move into
  the test file of the topic module that declares each card; the checks
  of every card against its answer leave the figure card's own test for
  `insights_cards_answers.test.js`; the index page's tests leave the
  layout's. Every name follows `one-vocabulary`'s rule.
- **Restating tests dropped.** Up to eight tests and four asserts that
  copy a constant or a list, or guard a removed feature, go; the Team's
  test checks its markup instead of copying its five authors.
- **The fixture's trace table by hand.** `tests/fixture_trace.py` holds
  the fixture trace and its trace table counted by hand. The tests'
  site database is opened over that table and no longer runs the
  builder; one test ties the trace query to the table. The daily rollup
  is written row by row.
- **Test modules import no test module.** The shared counts move into
  `tests/counted_requests.py`; the query test reads the site's tables
  from the database.
- **A readable run.** `make test` runs node with the spec reporter: one
  line per test, and the failing tests listed again at the end with
  their file and line.
- **The rules are tested.** The repository test fails on a browser
  global set outside `fake_page.js` and on a test module importing a
  test module.

## What it moves

- Nothing under `site/`, `site_data/`, `tables/` or `tests/snapshots/`
  changes. The snapshots must not change; that is the check that no
  site code moved.
- New in `tests/`: the three fixture modules,
  `insights_cards_answers.test.js`, `page_index.test.js`, the six topic
  modules' tests, `fixture_trace.py` and `counted_requests.py`;
  `insights_cards_caching_balancing.test.js` goes. README's layout block
  names the test files, and `test_readme.py` requires every name to
  exist, so its `tests/` entries follow in the same commit, as do
  CONTRIBUTING's mentions of a test file. `one-home-per-fact` rewrites
  both documents afterwards.
- The node suite loses up to eight tests and four asserts (design D7)
  and gains the fake page's own tests; pytest gains two repository
  tests.
- The pytest fixture `fixture_trace` becomes `trace_file`, since the new
  module `fixture_trace.py` takes the name.

## Pushback and open points

1. **No DOM library.** happy-dom or jsdom would end the private fakes
   in one step, for one dev dependency. It is not taken: the page's
   modules use about twenty members of an element, the fake that has
   them is one module a newcomer reads in one sitting, and a whole DOM
   would hide which parts of the browser the modules rely on. The fake
   throws on a selector it does not read rather than guess.
2. **`onRead` exists for one test.** The explorer's test that the
   histogram answer is read only once the bars are drawn needs to see
   the bars at the moment of the read. `useFakePage` takes an optional
   `onRead(file)` for it rather than letting that test fake `fetch`
   itself.
3. **Six topic test files where there were two.** The Insights' card
   checks sit in `insights_cards_charts.test.js` and
   `insights_cards_caching_balancing.test.js`, split by size. Together
   they pass 300 lines, so they cannot become one file; split by the
   topic module that declares each card, a reader finds a card's test
   where the card is declared.
4. **New requirements, not a modified "Tests".** `one-vocabulary`,
   `one-chart-interface` and `one-home-per-rule` each modify the `site`
   spec's "Tests" requirement. This change adds its own two requirements
   and restates none of its sentences, so it leaves "Tests" to them.
5. **The module header check is left as it is.** It lists 16 headers
   over ten lines and never fails. `one-home-per-fact` decides whether
   it becomes a rule or goes, once the headers are shorter.

## Not in this change

- The traffic tests reaching elements by selector, the selectors the
  fake reads, and `tests/fake_page.test.js`: `distributions-below`.
- The test file names and their repository test: `one-vocabulary`.
- The snapshot step saying loudly when it skips, the test that the
  shipped data fits every fixed domain, and the deploy workflow running
  the suite first: `one-home-per-rule`. This change keeps the snapshot
  step last in `make test`, so its skip message stays the run's last
  lines.
- A topic declared once, from which the tests' topics are read:
  `one-home-per-rule`.
- The test that checks every card's chart parameters against its
  kind's list: `one-chart-interface`.
- The "you changed X, this test fails" table, README and CONTRIBUTING
  rewritten, and the module header check: `one-home-per-fact`.
