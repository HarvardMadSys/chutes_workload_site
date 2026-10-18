# Tasks: One home per fact

Every task ends with `make test ARTIFACT=../2027_chutes_repo_artifact`
green and one commit. The artifact repository is not touched. Copy the
user writes is marked `// placeholder:` where this change adds any; it
adds none. No task changes what the page shows: `tests/snapshots/` must
not change in any task, `make snapshots` is not run, and `make test`
passing with the snapshots unchanged is the check. Each task starts by
reading the names of design D12 in the code as the earlier changes left
it, and each task that moves text checks its rows of design D1's table
of moves.

## 1. Shapes, the topic modules and the explorer's comments

- [x] 1.1 Around one-chart-interface's `AxisOptions` and
      `ChartParameters`: `plot/axes.js`' header cut to what the module
      holds, pointing to `AxisOptions`; the run-on JSDocs of design D8
      split into a sentence and a list.
      *Verify:* no kind's JSDoc restates a field of either typedef;
      snapshots unchanged.
- [x] 1.2 `FigureCard`, `TopicGroup` and `Topic` in
      `insights/figure_card.js`, one line per field, with the topic
      modules' repeated paragraph written once above them (design D7,
      D9); the card module's header cut to what it does;
      `page/topics.js`' header and each topic module's header point to
      them, a topic module's header one sentence of what its topic
      shows.
      *Verify:* every name of the card and topic fields' test lists is a
      `@property` of its typedef; the header check no longer lists
      `figure_card.js`; snapshots unchanged.
- [x] 1.3 `frozenTopic(topic)` in `insights/figure_card.js`; each topic
      module writes its topic as one `frozenTopic({ … })` over plain
      literals; `frozenCard` goes, its test becoming one of
      `frozenTopic` (design D9).
      *Verify:* `grep -rn "frozenCard" site tests` is empty; the test
      that every object a card holds is frozen passes; `grep -c
      "Object.freeze(" site/js/insights/*.js` is recorded before and
      after in the commit message; snapshots unchanged.
- [x] 1.4 `TrafficChoice` in `traffic/traffic_choice.js` in place of the
      sentence of the choice; `ControlsCallbacks` and `MountedControls`
      in `traffic/traffic_controls.js`, which its header and
      `mountTrafficControls` point to; `clippedFrom` as examples;
      `urlChoice` in two short sentences; the distribution charts'
      domains without their data figures (design D8).
      *Verify:* the controls' contract is written once; `grep -n
      "131,072\|11,585\|0.088" site/js/traffic` is empty; snapshots
      unchanged.

## 2. The long headers

- [x] 2.1 Every other header the header check lists, and the code's
      comments that read "but" for "except", rewritten by design D8's
      rules, a sentence a first reader needs kept; the repository
      test's "about eight modules" says nine.
      *Verify:* the header check's list before and after is recorded in
      the commit message; `grep -rn " but " site/js site_data` lists
      only contrasts; snapshots unchanged.

## 3. README

- [x] 3.1 README to the sections of design D2: the tour, the
      provenance with the cache table and the column contract,
      "Building the data" as the one home of the trace step's cost (the
      Makefile's comment on `tables` points to it), the Layout with the
      tests named by file and by rule. Each detail that leaves "What the
      site shows" is in the landing-page spec or in this change's delta
      of it.
      *Verify:* `tests/test_readme.py` passes; README is about 300
      lines; every row of design D1's table that starts in README is
      checked; snapshots unchanged.

## 4. CONTRIBUTING

- [x] 4.1 The opening, Words (one-vocabulary's, every house word
      defined elsewhere moved into it or pointing to it), "The rules"
      with "a fact has one home", and "How the site is put together":
      the arrow block one step per line, the two worked traces of design
      D4, the page's parts with the URL keys and the order of the reads
      as pointers.
      *Verify:* every file and test the traces name exists; each step
      of each trace is read in the code; snapshots unchanged.
- [x] 4.2 "Patterns to copy" pointing to the typedefs and README's
      column contract, its example card copied from the code as
      one-home-per-rule left it; "Charts" removed, each of its rules
      found in this change's site spec delta, in an earlier change's
      requirement or in its constant's comment; "Verifying a change"
      with the table of design D5.
      *Verify:* every test file the table names exists in `tests/`; no
      sentence of the old "Charts" section is without a home in design
      D1's table; CONTRIBUTING is about 400 lines; snapshots unchanged.

## 5. The documents' wording

- [x] 5.1 README and CONTRIBUTING read once more by design D8's prose
      rules: one fact per sentence, "except" for an exception, a list as
      a list.
      *Verify:* the sentences over 40 words, counted as the onboarding
      review counted them (code blocks and tables removed, split on full
      stops), are recorded before and after in the commit message, and
      each one left is a list; snapshots unchanged.

## 6. The placeholder marks

- [ ] 6.1 Only on the owner's ruling (design D9): the marks as the
      chosen option says. Without a ruling this task is skipped.
      *Verify:* for "keep" and "shorten", `grep -rn placeholder site`
      lists every line of copy that is not the paper's own, as before;
      the word-count test passes; snapshots unchanged.

## 7. CLAUDE.md

- [x] 7.1 CLAUDE.md to the pointer and the git rules of design D11,
      shown to the owner before the commit.
      *Verify:* each line removed is in README or CONTRIBUTING; the
      owner has seen the text; snapshots unchanged.

## 8. The stylesheet

- [x] 8.1 `style.css` reordered as design D10 lists, each media rule
      after the rule it changes, the header comment naming the order; no
      selector or declaration changes.
      *Verify:* the computed styles of every element at 360 px and 1280
      px, light and dark, are equal before and after (design D10); the
      legend buttons, the cite copy button and the tabs hovered by hand
      in both schemes; the card grid's span test passes; snapshots
      unchanged.
- [x] 8.2 The dead rules removed, the stale comments fixed, the topic
      tabs styled by `aria-selected` and `page/topic_tabs.js` no longer
      setting `is-active`, its test checking `aria-selected`.
      *Verify:* the computed styles are equal before and after; `grep -n
      "is-active\|\.mono\|control-label" site` is empty; snapshots
      unchanged.

## 9. The specs and the close

- [x] 9.1 This change's spec deltas checked against the main specs and
      the deltas of distributions-below to one-test-harness as they
      stand then: each modified requirement restated from the latest
      earlier text with this change's edits; design D2 and D3 given the
      lengths as built.
      *Verify:* `openspec validate one-home-per-fact --strict` and
      `openspec validate --specs` pass; no requirement text of an
      earlier change is lost (diff each modified requirement against
      the latest earlier delta of it); snapshots unchanged.
