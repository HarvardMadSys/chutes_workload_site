## ADDED Requirements

### Requirement: One test harness
The node tests SHALL reach the browser through one import,
`tests/fake_page.js`: one `FakeElement` for every element and the
window, held in `tests/fake_element.js` and re-exported, which only its
own test imports directly; one `useFakePage` that makes `document`, `window` with its
location and history, `fetch`, `requestAnimationFrame` and
`ResizeObserver` stand-ins for one test, answering the answer files it
is given and 404 for any other, and removes them when the test ends;
and one `shippedAnswer` that reads a shipped answer as the page names
it. The fake SHALL throw on a selector it does not read. No file of
`tests/` but `fake_page.js` SHALL assign or mock a property of
`globalThis`, and none but the two modules of the fake SHALL define an
element, document, window or fetch of its own; a plain object holding
the one field a pure function reads is an argument, not a fake. Values and helpers
that several test files of one section share SHALL live in
`tests/<section>_fixtures.js`. No test module SHALL import another
test module, in Python or JavaScript. A test SHALL NOT assert a
constant against its own literal, nor copy a list that the code or the
shipped data already holds. The node tests SHALL run with the spec
reporter, one line per test, the failing tests listed again at the end
of the node step with their file and line. The repository test SHALL
fail on a property of `globalThis` set outside `tests/fake_page.js`,
and the naming test on a test module importing a test module.

#### Scenario: A test that fakes the document itself
- **WHEN** a node test file assigns `globalThis.document`
- **THEN** the repository test SHALL fail naming the file and the line

#### Scenario: A test module that imports another
- **WHEN** `tests/test_built_data.py` imports `test_tables` for a constant
- **THEN** the naming test (`tests/test_naming.py`) SHALL fail naming the two modules

#### Scenario: A selector the fake does not read
- **WHEN** a page module asks a `FakeElement` for `div > p`
- **THEN** the fake SHALL throw an error naming the part it does not read, `>`

#### Scenario: A failing node test
- **WHEN** a node test fails during `make test`
- **THEN** the node step's output SHALL end by naming the test, its file and its line, with its error

### Requirement: The fixture's trace table is written by hand
The fixture's weekly histograms SHALL be written in
`tests/fixture_trace.py` beside the fixture trace, as rows counted by
hand from it. The tests' site database SHALL be opened over those rows,
written as the builder writes its table, and SHALL NOT run the trace
table's builder, so that the trace query and the queries over the
site's tables are tested apart. The fixture's daily rollup SHALL be
written row by row, each row naming the trace entry it counts.

#### Scenario: A fault in the trace query
- **WHEN** `site/queries/trace/weekly_histograms.sql` puts a value in the wrong bin
- **THEN** the trace query's tests SHALL fail, and the tests of the queries over the site's tables SHALL pass
