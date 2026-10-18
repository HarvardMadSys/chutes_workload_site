# Change: One home per fact

## Why

A newcomer reads about 1,250 lines of README and CONTRIBUTING before
changing a chart, and reads many facts two or three times. The page's
behaviour is in README and again in the landing-page spec. The
repository's layout is in README, in the site spec and in CLAUDE.md, and
the spec's copy has drifted from the code. The URL keys are written in
three places and a card's fields in four. CONTRIBUTING's "Charts"
section restates pixel values that the constants' own comments state.
Where two copies differ, the reader cannot tell which one is right.

The documents also lack three things a newcomer needs: the route of one
number from its query to its chart, a table of which test fails for
which change, and short definitions of the shapes that cross a module's
boundary. In the code, the comments are accurate and dense: headers of
twenty lines, a card's eleven fields in one sentence, data values that
go stale on the next rebuild, sentences that read "but" for "except".
Each topic module repeats one header paragraph and hides its cards
under about a hundred calls that freeze them. `style.css` is in the
order its rules were added, with dead rules and comments that
contradict the rules under them.

This change comes last in the series, after one-test-harness, so that
it describes the code once, as distributions-below, one-vocabulary,
one-chart-interface, one-home-per-rule and one-test-harness left it.
The owner's instruction holds throughout: simplicity and readability,
not clever tricks.

## What Changes

- **One home per fact.** Each fact is stated in one place and the others
  point to it. The specs hold what the visitor sees and what the data
  must satisfy. README holds what the site is, where its numbers come
  from, how to run, build and deploy it, and the map of the repository.
  CONTRIBUTING holds the site's words, the rules, how the parts fit, the
  patterns to copy and how to verify a change. A module's header and its
  `@typedef`s hold the shapes that cross its boundary. A constant's
  comment holds the reason for its value. CLAUDE.md holds a pointer and
  the git rules. Text is moved, not deleted: a passage leaves a document
  only for its home, or where its home already says it.
- **README to about 300 lines.** "What the site shows" becomes a tour of
  one line per section; its details move to the landing-page spec where
  the spec lacks them. "Where the numbers come from" keeps the
  provenance and the column contract and drops what the site spec
  defines. The Layout names the tests by file and by rule; what each test
  checks moves to CONTRIBUTING's table.
- **CONTRIBUTING to about 400 lines.** It opens with Words (written by
  one-vocabulary), the one home of the site's own words. The arrow block
  is followed by two worked traces: the family mix from its query to its
  donut, and the daily request rate from its plot-ready table to its
  card, with the test at each step. "Verifying a change" gains a table:
  you changed this, this test fails, this is how to update it. The
  "Charts" section leaves CONTRIBUTING.
- **The specs hold the visual requirements.** CONTRIBUTING's rules for
  colours, marks, axis ticks and number formats become three
  requirements of the site spec. README's card exceptions join the
  landing-page spec's "Figure cards are drawn from their answers". The
  site spec's layout block is replaced by README's Layout, which
  `tests/test_readme.py` keeps true, and its column list by README's
  column contract.
- **Shapes as `@typedef`s.** `FigureCard`, `TopicGroup` and `Topic` in
  `insights/figure_card.js`; `TrafficChoice` in
  `traffic/traffic_choice.js`; `ControlsCallbacks` and
  `MountedControls` for what the explorer and its controls give each
  other. Each is one line per field; the prose copies point to it.
  `AxisOptions` and `ChartParameters` are one-chart-interface's, and
  this change points the documents to them.
- **A topic module is its cards.** `frozenCard` goes: each topic module
  is one `frozenTopic({ … })` of plain literals, frozen once and whole.
  The paragraph the six topic modules repeat in their headers is
  written once, in `insights/figure_card.js`, and each topic module's
  header says in one sentence what its topic shows.
- **Comments state definitions, shortly.** One fact per sentence,
  "except" for "but", a list as a list, an example where a rule has
  cases. No data value a rebuild can change, as in the explorer's
  distribution charts. Each header over ten lines is looked at again.
- **The placeholder marks: the owner's decision.** The task is
  conditional on the owner's ruling (pushback 2).
- **`style.css` in cascade order.** Tokens, base, layout, components,
  then the sections in the page's order, each media rule beside the
  rule it changes. The dead rules go, the stale comments are fixed, and
  the topic tabs are styled by `aria-selected` as the legend is styled
  by `aria-pressed`.
- **CLAUDE.md to its pointer and the git rules,** the text shown to the
  owner before it is committed.

## What it moves

- README from 531 lines to about 300, CONTRIBUTING from 701 to about 400
  with Words, CLAUDE.md from 50 to about 15. Design D2 and D3 give the
  target sections, each with its length and the fact it owns, for the
  owner to judge before any text moves.
- The site spec: "The code follows CONTRIBUTING" and "Repository layout"
  restated on top of one-home-per-rule's text, and "Figure answers"
  modified; "The documents", "Chart colours", "Chart marks" and "Axis
  ticks and number formats" added. The landing-page spec: "Figure cards
  are drawn from their answers" modified.
- `insights/figure_card.js` gains the Insights' typedefs, the topic
  modules' paragraph and `frozenTopic`, and loses `frozenCard`. No
  module, folder, query, answer, URL key or test file is renamed, and no
  snapshot changes: every task is checked by `make test` comparing the
  snapshots unchanged. The topic tabs stop setting the class
  `is-active`, which no rule reads once the tabs are styled by
  `aria-selected`.
- Nothing is rebuilt: the trace query's comment is one-home-per-rule's
  and rides on its trace rebuild.

## Pushback and open points

1. **The reviews asked for a README of about 250 lines.** The Layout
   alone is about 130 lines once the tests are named by rule, since
   `tests/test_readme.py` requires every module of `site/js/` and
   `site_data/` to be named. About 300 is the plain target; a shorter
   README would need a second map, which is a second home.
2. **The placeholder marks: the owner rules in one word** (design D9).
   "Keep": the marks as they are. "Shorten" (recommended): one short
   mark per object, `// placeholder: heading and takeaway` on a group,
   so that `grep -rn placeholder site` stays the complete list in about
   60 lines. "Header": the 17 group marks go and one sentence in
   `insights/figure_card.js` covers them, which drops them from the
   list. Without a ruling, task 6.1 is skipped.
3. **The modified requirements build on the earlier deltas.** "The code
   follows CONTRIBUTING" and "Repository layout" are restated on top of
   one-home-per-rule's, the latest earlier delta of each. Those deltas
   are being rebased; task 9.1 checks every modified requirement against
   the latest earlier text before this change is archived.

## Not in this change

- The Words section's text, the renames and the shared trace axes:
  one-vocabulary.
- `AxisOptions`, `ChartParameters` and each kind's parameter list:
  one-chart-interface.
- The data step's docstrings, the trace query's measurement comment and
  its rebuild, the cards' domain comments and their test, and the card
  grid's span named on both sides: one-home-per-rule.
- The spec reporter and the test file names: one-test-harness.
- Fewer than nine media-query widths in `style.css`: merging two widths
  changes what a visitor sees at some width, which a reorder must not.
