# Design: One home per fact

## The engineering rules

Binding, as `openspec/config.yaml` and the `site` spec state them:
simple, readable and maintainable first; no optimisation without a
recorded measurement; plain HTML, CSS and ES modules; names that are
words; a function at most 50 lines, a module at most 300, a folder at
most nine modules; every module tested and `make test` green at every
commit. This change moves text. It changes no query, answer, table, URL
key or anything the page shows, and does not touch the artifact
repository. Where a review offered a clever check, such as a parsed
word list or a test that reads README's tables, this change takes the
plain one: a list of moves that a reviewer reads.

Every path below is a name as one-vocabulary decided it (its design
D1); design D12 lists the ones this change relies on.

## Decisions

### D1. Every fact has one home, and the homes have an order

A fact is stated once, in the first of these homes that fits it, and
every other place that needs it points there:

1. **The specs**: what the visitor sees and what the data must satisfy.
2. **README**: what the site is, where its numbers come from, how to
   run, build and deploy it, and the one map of the repository.
3. **CONTRIBUTING**: the site's words, the rules, how the parts fit,
   the patterns to copy, and how to verify a change.
4. **A module's header and its `@typedef`s**: the shape of what crosses
   its boundary, one line per field.
5. **A constant's comment**: why it has its value.
6. **CLAUDE.md**: a pointer to README and CONTRIBUTING, and the git
   rules.

A requirement in a spec and the constant that meets it are not two
homes of one fact: the spec says what the visitor sees ("a linear axis
shows at most seven ticks"), the constant how the code gets there
(`TICK_COUNT = 4`, with Plot's rounding in its comment). Documents name
a constant only where a pattern to copy needs its name.

Text is moved, not deleted. A passage leaves a document only for its
home, or where its home already says it. Each task that moves text
checks its rows of the table below and adds a row for any passage the
table misses, so that the reviewer can check every removed passage
against its new home. A sentence that is in no home and that a
first-time reader needs is moved, not cut.

| Passage now | Its home after this change |
|---|---|
| README "What the site shows", 84 lines | a tour of one line per part in README; the details in the landing-page spec, which gains the card exceptions it lacks (D6) |
| README "Where the numbers come from": the trace table's rows and bins, the histogram answers | the site spec's "The trace table" and "Answers", which already state them |
| README: the explorer's CDF point and percentile rule | the header of `traffic/traffic_distributions.js`, which states it (moved there where it does not) |
| README and CONTRIBUTING: the order of the reads | the landing-page spec's "The page appears before the data"; CONTRIBUTING keeps one sentence naming its test |
| README Layout: what each test checks | CONTRIBUTING's test table (D5) |
| README, CONTRIBUTING, Makefile: "half a minute, 16 GB" | README "Building the data" |
| CONTRIBUTING rules: the list of the nine tables | the site spec's "The cache tables"; the tests read the tables from the database, and `test_site_database.py` states the nine |
| CONTRIBUTING, README: the URL keys | `TrafficChoice` in `traffic/traffic_choice.js` (D7); the landing-page spec keeps the requirement |
| CONTRIBUTING "A figure card": the field list | `FigureCard` (D7); CONTRIBUTING keeps the example card |
| CONTRIBUTING "A topic and its groups": the fields | `Topic` and `TopicGroup` (D7); the word limits stay in the landing-page spec |
| CONTRIBUTING "Charts", 116 lines | the site spec's "Chart colours", "Chart marks" and "Axis ticks and number formats" (D6); constant names in their modules |
| CONTRIBUTING "The chart kinds": the shared parameters | `ChartParameters` in `plot/frame.js`, written by one-chart-interface |
| CLAUDE.md's summary of the rules | CONTRIBUTING "The rules" (D11) |
| The site spec's layout block | README's Layout |
| The site spec's column list | README's column contract (`figure_answers.py`'s copy is gone with one-home-per-rule) |
| The headers of `figure_card.js` and `page/topics.js`: the card's and the topic's fields | `FigureCard`, `Topic`, `TopicGroup` |
| The six topic modules' repeated header paragraph | written once, in `insights/figure_card.js` beside the typedefs (D9) |
| `plot/axes.js`'s header: the axis options | `AxisOptions`, written by one-chart-interface |
| `traffic_controls.js`: the contract in the header and again in `mountTrafficControls` | `ControlsCallbacks` and `MountedControls` |
| The distribution charts' data figures (99.9% at most 131,072, …) | dropped: the archived compact-explorer change records them (its design D3) |

The spec may point at README for the two maps, the layout and the
column contract, because each then has one home and
`tests/test_readme.py` keeps README's layout true.

### D2. README's sections

The target, for the owner to judge before any text moves. A length is
a target, not a limit: a sentence a reader needs is not cut to reach
it.

| Section | Lines now → target | The fact it owns |
|---|---|---|
| Opening | 16 → 12 | what the site is and what it is made of: one page, ES modules, JSON answers, Plot; a pointer to CONTRIBUTING's Words |
| What the site shows | 84 → 15 | the tour: one line per part of the page in order, with its anchor; the landing-page spec holds what each part does |
| Where the numbers come from | 147 → 65 | the provenance: which artifact file feeds which answer and which part of the page (the cache table); what the trace table is and why the site builds it; the family rule's home; the trace's start date and its JavaScript copy; why the strip says "User ids"; the figure answers; the column contract table |
| Running it | 20 → 20 | the make targets and what each needs |
| Building the data | 44 → 35 | when each step is rerun, what it costs (the one home of "half a minute, 16 GB"), what is committed |
| Deploying | 31 → 30 | the Worker, its secrets and variable, the hostnames, the 25 MiB limit |
| Layout | 184 → 130 | the one map: every folder and module of the repository, the tests named by file and by their naming rule |
| Links | 5 → 5 | the dataset, the paper, the code |
| **Total** | **531 → about 300** | |

The Layout shrinks because the tests are named by file and by rule (a
node test file starts with the folder of the module it tests, as
one-vocabulary's design D9 states it) without a sentence on what each
checks; that sentence moves to CONTRIBUTING's test table, where a
contributor looks for it. `tests/test_readme.py` keeps the block true:
every path it names exists and every module of `site/js/` and
`site_data/` is named.

### D3. CONTRIBUTING's sections

| Section | Lines now → target | The fact it owns |
|---|---|---|
| Opening | 6 → 5 | who reads it; the rules are binding and tested where countable |
| Words | 0 → 40 | written by one-vocabulary; the one home of every word the site uses in its own sense, and of the six verbs (`run`, `render`, `mount`, `place`, `draw`, `show`); a definition found elsewhere in README or CONTRIBUTING moves here or points here |
| The rules | 76 → 55 | the binding rules, "a fact has one home" (D1) among them; the SQL rule names `test_site_database.py`, which states the nine tables, and points to the site spec for them |
| How the site is put together | 106 → 70 | the arrow block, one step per line; the two worked traces (D4); the page's parts: the shell, `page/main.js` and its sections, the header, reading an answer, the topic tabs and the history, the order of the reads (one sentence and its test), the URL keys (a pointer to `TrafficChoice`), adding a section |
| Patterns to copy | 317 → 145 | a query; a query that takes the family; one answer per query; a list-valued answer; the trace query; adding a query; a JavaScript and a Python module; a link off the site; a topic (a pointer to `Topic`); a figure card (a pointer to `FigureCard`, and the example card); the column contract (a pointer to README); adding a figure; the patterns a card copies; the chart kinds (the draw contract and a pointer to `ChartParameters`, as one-chart-interface wrote them) |
| JavaScript style | 26 → 25 | imports, loading the charting library, markup, `mount`, the loading and error states, the formats' module |
| Charts | 116 → 0 | moved (D6) |
| Verifying a change | 54 → 60 | the commands; the test table (D5); the snapshot test and how its diff is read; the check by hand at 360 px and desktop, light and dark; one task per commit |
| **Total** | **701 → about 400** | |

Each section follows the prose rule of D8: one fact per sentence, a list
as a list, "except" for an exception.

### D4. Two worked traces

Right after the arrow block, one number is followed from its source to
the page, with the test at each step. The draft:

**The family mix.**

1. `site/queries/explore/family_mix.sql`: requests per family over the
   trace, most first, Other last. `tests/test_queries.py` runs it on
   the fixture and checks its columns and numbers.
2. `make data` (`site_data/answers.py`) writes its rows to
   `site/data/all/explore/family_mix.json` and its hash to
   `queries.json`. `tests/test_answers.py` checks the answer against
   the query run live; `tests/test_built_data.py` checks that the
   shipped answer is current.
3. `page/start.js` reads it once, `readAnswer("explore/family_mix")`,
   and hands it on as `context.mixes.families`.
   `tests/shared_answers.test.js` checks the file read;
   `tests/page_start.test.js` checks it is read once.
4. `sections/mixes.js` (`runMixes`) draws it with `drawDonut` of
   `charts/donut.js` and a legend. `tests/sections_mixes.test.js` and
   `tests/charts_donut.test.js` check their pure parts.
5. The donut in `#overview`: the snapshot unit
   `model_families.chart`.

**The daily request rate.**

1. The artifact's `data/paper/plotdata/fig_request_rate_day.parquet`,
   listed in its `config/figures.json`. With `ARTIFACT`,
   `tests/test_figures_registry.py` checks a card draws it.
2. `make data` (`site_data/figure_answers.py`) copies it to
   `site/data/all/figures/fig_request_rate_day.json`.
   `tests/test_figure_answers.py` and `tests/test_built_data.py`.
3. Its card in `insights/workload.js`: its words, `kind: "lines"` and
   its `chart`, its x axis `TRACE_DAY_AXIS` of `plot/trace_axes.js`.
   `tests/insights_cards_words.test.js` counts its words;
   `tests/insights_cards_answers.test.js` checks its answer has its
   kind's columns; `tests/insights_figure_card.test.js` checks its
   parameters against the kind's list;
   `tests/insights_cards_domains.test.js` checks its answer fits its y
   domain; `tests/insights_workload.test.js` holds its own checks.
4. `insights/figure_card.js` reads the answer and draws it by
   `CHART_KINDS.lines`, which is `drawLines` of `charts/lines.js`.
   `tests/charts_lines.test.js` checks the kind's pure parts; the draw
   itself runs only in the snapshot test.
5. The card in `#insights-overview`: the snapshot unit
   `daily_request_rate.chart`.

Two traces, not one: the first is the query path, the second the figure
path, and between them they pass every folder a newcomer opens.

### D5. "You changed this, this test fails"

A table in "Verifying a change", one row per kind of change. The draft,
in the test names of one-vocabulary's design D9, which
one-test-harness follows; task 4.2 checks each name against `tests/`:

| You changed | The test that fails | To update it |
|---|---|---|
| A query's text | `test_built_data.py`: the answer is stale | `make data`, then `make snapshots` if the page moves |
| A query's columns or numbers | `test_queries.py` (`EXPECTED_COLUMNS`, the hand-counted values) | the expected values, if the change is meant |
| The answer writer | `test_answers.py` | |
| The trace query | `test_tables.py`: the sidecar's hash | `make tables TRACE=…`, then `make data` |
| A figure in the artifact | `test_figures_registry.py`, with `ARTIFACT` | a card for it |
| A card's words | `insights_cards_words.test.js`; the snapshot's texts unit | `make snapshots` |
| A card's kind, or its answer's columns | `insights_cards_answers.test.js` | the card, or the artifact's table |
| A card's `chart` | `insights_figure_card.test.js` (the parameter lists); its topic's `insights_<topic>.test.js`; the snapshot's chart unit | `make snapshots` |
| A card's fixed domain | `insights_cards_domains.test.js`; the snapshot | the domain, or `INTENDED_CLIPS` |
| Inside a kind's draw function | the snapshot alone, since node cannot load Plot; without Chromium it skips with a framed message | `make setup-browser` once, then `make snapshots` |
| A kind's pure helper | `charts_<kind>.test.js` | |
| The explorer's choice or URL keys | `traffic_choice.test.js`, `traffic.test.js`; the snapshot's controls unit | |
| The order of the reads | `page_start.test.js`; `shared_answers.test.js` (the head's preload) | |
| A topic | `page_topics.test.js`; the snapshot states | |
| A colour token | `palette_contrast.test.js` | name the token's role there |
| A module's length, a folder's size, an import | `test_repository.py` | split the module |
| A module or folder added, moved or renamed | `test_readme.py` | README's Layout |
| `style.css`, beyond its colours and the card grid's span | nothing: the snapshot reads text, not pixels | look at 360 px and at desktop width, light and dark |
| The deploy workflow's paths | `test_deployment.py` | |

The row for a draw function is the one a newcomer most needs: no node
test runs a `Plot.plot` call, so the snapshot is its only check.

### D6. The specs hold the visual requirements

CONTRIBUTING's "Charts" section is a visual specification. Its rules
become three requirements of the site spec, written as what the visitor
sees:

- "Chart colours": the slots and their order, the families' ten, the
  shading schemes, no series told by colour alone, and the palette's
  checks beyond "The look follows Open Data". The endpoint groups'
  first slot is already the Overview's requirement and stays there.
- "Chart marks": bar insets and gaps, the inks, reference rules, the
  scatter's dots, the raster's rules (README's sentence on them lands
  here too), a chart with no legend at the foot of its row, two scales
  in two charts, a legend naming only what is drawn.
- "Axis ticks and number formats": the ticks of a linear, a log and the
  explorer's day axis, and one format per quantity with its examples.

The constant names and their values stay in their modules' comments.
The section's paragraph on the explorer's distribution charts is
already the landing-page spec's, as distributions-below left it, and is
dropped once each of its sentences is found there. Its paragraph on
the kinds' interface is already the site spec's "The chart kinds share
one interface", as one-chart-interface added it.

README's "What the site shows" is mostly the landing-page spec in other
words. The sentences the spec lacks join its requirement "Figure cards
are drawn from their answers": the per-user inter-arrival band card's
linear axis, the eviction cards' tooltip, the routing card's policy
legend, the dated tooltips of the daily and hourly cards, and the names
of the trace months with the star of the partial thirteenth.

The site spec's layout block becomes a pointer to README's Layout, and
its column list a pointer to README's column contract (D1 says why).
A spec copy of each has already drifted ("duckdb (pinned)", "at most
about nine").

### D7. Shapes as `@typedef`s

A shape that crosses a module's boundary is one JSDoc `@typedef` with
one `@property` line per field, in the module that makes or reads it.
No type checker is added; the typedef is for the reader.

| Typedef | Module | Replaces | Written by |
|---|---|---|---|
| `FigureCard`, `TopicGroup`, `Topic` | `insights/figure_card.js` | the card module's 20-line header, `page/topics.js`' header, the topic modules' repeated paragraph, CONTRIBUTING's field lists | this change |
| `AxisOptions` | `plot/axes.js` | the header's sentence of options | one-chart-interface |
| `ChartParameters` | `plot/frame.js` | the shared bullets of eight kinds | one-chart-interface |
| `Breakdown` | `shared/series.js` | the breakdowns' prose | one-vocabulary |
| `TrafficChoice` | `traffic/traffic_choice.js` | the header's sentence of the choice; CONTRIBUTING's and README's URL keys | this change |
| `ControlsCallbacks`, `MountedControls` | `traffic/traffic_controls.js` | the header's contract and `mountTrafficControls`' second copy of it | this change |

The topic's typedefs sit with the card's, in `insights/figure_card.js`,
rather than in `page/topics.js`: the topic modules make topics and
already import from the card module, while `page/topics.js` imports
the topic modules, so a typedef or a helper there would make the topic
modules import the module that imports them. `page/topics.js`' header
points to the typedefs. A topic is `{ id, title, takeaway, groups }`
as one-home-per-rule declares it.

A rule that belongs to one field stays on that field's line ("only the
card's `chart.labels` relabel the legend" on `panels`). The answer rows
the explorer reads keep their one-line shape in the header, which is
already a listing. Where one-chart-interface wrote a typedef, this
change only points the documents to it and shortens the JSDoc around it
(D8).

Not taken: a TypeScript declaration file or `// @ts-check`, a tool and
a build step for a reader's aid; a commented example object in place of
a typedef, which shows one card's values and not which fields are
optional.

### D8. Comments state definitions, shortly

The rules, applied to README, CONTRIBUTING, the module headers and the
JSDocs:

- One fact per sentence; a sentence over 40 words is split unless it is
  a list. A list of fields or cases is a bulleted list or a typedef.
- "except" for an exception, never "but" ("every chart except a
  raster"). Each " but " is read, not replaced blindly.
- A rule with cases is written as examples:
  `clippedFrom("2024-01-01", days)` is `""`, the trace's first day;
  `clippedFrom("2027-01-01", days)` is the trace's last day.
- No data value that a rebuild can change. The distribution charts'
  domains say what they decide ("wide enough for nearly every request;
  a line past the end is cut at the chart's edge") without the
  figures. The cards' domains are one-home-per-rule's, with its domain
  test.
- The run-on JSDocs the charts review names (`sequentialColour` of
  `plot/frame.js`, the lines kind's `drawnPoints`, `drawnScatterPoints`,
  the lines kind's CDF helper, the frame function's) become a short
  sentence and a list.
- `plot/axes.js`' header says what the module holds in a few lines and
  points to `AxisOptions`.
- The repository test's "about eight modules" says nine, as its value
  does.
- Each header the header check lists (16 today) is read again; a
  sentence a first reader needs stays, however long the header. The
  check stays a list for review, as CONTRIBUTING's rule keeps a needed
  sentence; one-test-harness left its form to this change, and the
  count before and after is recorded.

The data step's docstrings and the trace query's measurement are
one-home-per-rule's (its design D5): it carries the query's comment in
its trace rebuild, so this change rebuilds nothing.

### D9. The topic modules' boilerplate, and the placeholder marks

**Freezing, once per topic.** A topic module today wraps its topic,
each group and each `cards` list in `Object.freeze` (about 72 calls)
and each card in `frozenCard` (47 calls), and `frozenCard` only
forwards to `deepFrozen`. After this change `insights/figure_card.js`
exports `frozenTopic(topic)`, which freezes the topic and every object
and list it holds, functions left as they are; each topic module
writes its topic as a plain object literal inside one
`frozenTopic({ … })`. `frozenCard` goes. A constant a module shares
between cards (an axis, a list of hours) keeps its own
`Object.freeze`, since it is frozen before any topic holds it. The
test that every object a card holds is frozen (`page_topics.test.js`)
stays and is the check; the test of `frozenCard` becomes a test of
`frozenTopic`.

**The repeated header, written once.** Each topic module's header
repeats two sentences: the words are the paper's and the definitions
the artifact's, a line marked "placeholder" not being the paper's own;
and a card's kind and chart say how its figure is drawn. They are
written once, in `insights/figure_card.js` above `FigureCard`. Each
topic module's header is then one sentence of what its topic shows and
"Its cards are `FigureCard`s (`insights/figure_card.js`)."

**The placeholder marks: the owner's decision.** The marks are the
owner's convention for the authors' copy: `grep -rn placeholder site`
is the authors' review list. Three options:

| Option | What it does | The review list |
|---|---|---|
| (a) Keep | the marks as they are: 83 in `site/js` and one in `index.html`; 17 are one sentence on a group's heading and takeaway; three per explorer distribution chart entry | complete |
| (b) Shorten | one mark per object that holds copy not the paper's own: `// placeholder: heading and takeaway` on a group, one mark naming the three strings of a distribution chart entry | complete, about 60 lines |
| (c) Header | the 17 group marks go; the paragraph in `insights/figure_card.js` says that group headings and takeaways are the site's wording | loses the 17 groups |

Recommended: (b). The review list stays complete, which (c) gives up,
and the repeated text goes. Task 6.1 does the option the owner rules;
without a ruling it is skipped and the marks stay as they are.

### D10. `style.css` in cascade order

The file's sections, in this order, each media rule directly after the
rule it changes:

1. **Header comment**: what the file holds and this order.
2. **Tokens**: the light scheme on `:root`, then the dark.
3. **Base**: the element defaults, including `button`, `select` and
   `input` (now at the file's end, after the components that undo
   them), the type size, links, the focus ring, `[hidden]`, headings,
   reduced motion.
4. **Layout**: `.page`, the section band, the scroll margin under the
   sticky header, `.card`, `.card-grid` with its subgrid and its
   one-column rule (now 500 lines away), a wide card, the small-screen
   padding.
5. **Components**: the button link, the eyebrow and its mark, the link
   arrow and mark, the figure (title, insight, caption, definition,
   body, colour legend, panels), the legend buttons and the bands' key,
   the topic tabs, the controls, the loading, error and note states,
   the row that scrolls sideways.
6. **Sections**, in the page's order: header, hero and stats strip,
   Overview, Traffic Explorer, Insights, Cite, Team, footer.

The reorder is one commit that moves rules and nothing else. The dead
rules go in a second: `.nav-link.is-active` (a one-page site has no
current page link), `.mono`, `.control-label`, and the two
`min-height: 0` resets of a height nothing sets. The same commit fixes
the stale comments that remain (the two stacked comments on the BibTeX
block, which wraps; "then the About", which is gone; `.eyebrow-mark`
under Hero, which only Team uses; the card grid's "five rows", where
one-home-per-rule has not already named the six parts) and styles the
topic tabs by `.topic-tab[aria-selected="true"]`, as the legend is
styled by `aria-pressed`, so `page/topic_tabs.js` stops setting
`is-active` and `page_topic_tabs.test.js` checks `aria-selected`. The
card grid's `grid-row: span 6` keeps the comment and the test
one-home-per-rule gave it.

Moving rules of equal specificity can change which one wins. The check
is the computed style, not the eye alone: a one-off Playwright script,
not committed, writes every element's computed style with the page at
360 px and 1280 px, light and dark; the files before and after each of
the two commits must be equal. Hover states are not computed that way,
so the legend buttons, the cite copy button and the tabs are hovered
by hand in both schemes.

Not taken: several stylesheets, which are a request each or an
`@import` chain with no build step to join them; fewer breakpoints,
which change what a visitor sees at some width.

### D11. CLAUDE.md

CLAUDE.md becomes about fifteen lines: what the site is in two lines;
"start with README.md and CONTRIBUTING.md; the rules in CONTRIBUTING are
binding"; where the specs are; "Verifying a change" as CONTRIBUTING
says it; and the git rules as they are. Its summary of the rules, the
SQL rule, the trace table and the figures' route, each a copy of
CONTRIBUTING or README, goes. It is the owner's file, so task 7.1 shows
the owner the new text before committing it.

### D12. The names this change relies on

As one-vocabulary's design D1 and D9 decide them, with the modules
one-home-per-rule and distributions-below add. Where the code differs
when a task starts, the task uses the code's name and corrects this
table.

| Before the series | After | Changed by |
|---|---|---|
| `js/pages/explore.js` | `js/page/main.js` | one-vocabulary |
| `js/explore/start.js`, `topic_tabs.js`, `figure_sections.js` (`FIGURE_SECTIONS`) | `js/page/start.js`, `topic_tabs.js`, `topics.js` (`TOPICS`) | one-vocabulary |
| `js/explore/legend.js` | `js/shared/legend.js` | one-vocabulary |
| `js/landing/donuts.js`, the other landing modules | `js/sections/mixes.js`, `js/sections/` | one-vocabulary |
| `js/axes/ticks.js` | `js/plot/axes.js` | one-vocabulary |
| `js/shared/charts.js` | `js/plot/frame.js`, `js/shared/figure.js`, `js/shared/rows.js` | one-vocabulary |
| the trace axes in `insights/figure_card.js` | `js/plot/trace_axes.js` | one-vocabulary |
| `insights/overview.js`, `OVERVIEW_TOPIC` | `insights/workload.js`, `WORKLOAD_TOPIC`; the anchor `#insights-overview` kept | one-vocabulary |
| `context.orders` | `context.mixes` | one-vocabulary |
| `tests/snapshots/explore-<topic>/` | `tests/snapshots/insights-<topic>/` | one-vocabulary |
| the node test files' names | as one-vocabulary's design D9 gives them and one-test-harness follows (`shared_answers`, `page_start`, `page_topics`, `page_topic_tabs`, `page_index`, `insights_cards_words`, `insights_cards_answers`, `insights_cards_charts`, `insights_<topic>`, `sections_<module>`; `palette_contrast` kept) | one-vocabulary, one-test-harness |
| `traffic/traffic_tile_charts.js` | `traffic/traffic_distribution_charts.js` | distributions-below |
| the choice in `traffic/traffic_filter.js` | `traffic/traffic_choice.js` | one-home-per-rule |
| a topic's `selector` | `{ id, title, takeaway, groups }` | one-home-per-rule |
| no test that the data fits a fixed domain | `tests/insights_cards_domains.test.js` | one-home-per-rule |
| no typedef of an axis or of the shared parameters | `AxisOptions`, `ChartParameters`, each kind's `<KIND>_PARAMETERS` | one-chart-interface |

### D13. Order of the tasks

The typedefs, the topic modules and the comments come first, since
they are the homes the documents then point to. README follows, then
CONTRIBUTING, which points to README, the typedefs and the specs.
CLAUDE.md, the stylesheet and the placeholder marks are independent of
the rest. The check of the spec deltas against the earlier changes'
comes last. No task changes the snapshots, so `make test` passing with
`tests/snapshots/` unchanged is every task's check that nothing a
visitor sees moved.

## Alternatives not taken

- A glossary file of its own: one-vocabulary's Words section sits where
  a contributor starts reading, and a third document is a third place to
  look.
- A test that README's column contract equals `KIND_COLUMNS`: a parser
  of a Markdown table to guard a list that changes when a kind is added,
  which already sends the contributor to README.
- A word-list diff to prove nothing was lost: the table of moves in D1,
  read by the reviewer, is plainer.
- Generated API documentation from the JSDoc: a tool and a build step
  for what the typedefs give in place.
- `frozenTopic` in `page/topics.js`: the topic modules would import the
  module that imports them (D7).
