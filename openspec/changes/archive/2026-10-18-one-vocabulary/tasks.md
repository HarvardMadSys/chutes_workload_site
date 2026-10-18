# Tasks: One vocabulary, one name per thing

Every task ends with `make test ARTIFACT=../2027_chutes_repo_artifact`
green and one commit. The artifact repository is not touched. Copy the
user writes is marked `// placeholder:` where this change adds any; it
adds none. This change is a refactor: in every task `make snapshots`
must report the snapshots unchanged, which is the check that nothing
the page shows has moved; task 2.1 alone renames the state folders,
and there `git diff -M --stat` must show six whole-folder renames and
no changed line. Each task updates README's Layout block for what it
moves, so `tests/test_readme.py` stays green, and the paths and names
CONTRIBUTING gives.

## 1. The page's folders

- [x] 1.1 `js/explore/` becomes `js/page/` and `js/pages/explore.js`
      becomes `js/page/main.js` (design D1, D2): `start.js`,
      `topic_tabs.js`, `topics.js` (from `figure_sections.js`,
      `FIGURE_SECTIONS` as `TOPICS`), and `scrolling_row.js` from
      `shared/`; `explore/legend.js` moves to `shared/legend.js`, so
      that `js/explore/` goes whole. `index.html` loads
      `js/page/main.js`. `test_repository.py` checks that
      `index.html` loads `js/page/main.js` and that `page/start.js`
      imports the answers module;
      `test_figures_registry.py` reads `page/topics.js`
      (`TOPICS_MODULE`). "The Explore page", "the landing page" and
      "the one page" become "the page" in `site/js`, `tests` and
      `CONTRIBUTING.md`'s data-flow block.
      *Verify:* `grep -rn "Explore page\|landing page\|js/explore\|js/pages" site tests README.md CONTRIBUTING.md CLAUDE.md`
      finds nothing; `node --test` loads every module; snapshots
      unchanged.
- [x] 1.2 `js/landing/` becomes `js/sections/`, and `donuts.js`
      becomes `mixes.js` (design D2); `page/main.js` imports from
      there.
      *Verify:* `grep -rn "landing/\|donuts.js" site tests README.md CONTRIBUTING.md`
      finds nothing; snapshots unchanged.

## 2. The Insights' words

- [x] 2.1 `insights/overview.js` becomes `insights/workload.js` with
      `WORKLOAD_TOPIC` (design D3); `index.html`'s classes
      `figure-section` and `figure-sections` become `traffic`, `topic`
      and `insights`, each `style.css` selector of `.figure-section`
      naming `.traffic` and `.topic` instead, and `h2#overview-heading`
      becomes `h2#workload-heading`; `topic_tabs.js` takes `topics`
      and `start.js` keeps `drawnTopics`. `snapshot_units.py`'s
      `EXPLORE_STATES` becomes `PAGE_STATES`, the six anchors, and
      `explore_page_units` becomes `page_units`; `test_snapshot.py`
      and `test_snapshot_units.py` follow; `make snapshots` writes
      the state folders under their new names.
      *Verify:* `git diff -M --stat tests/snapshots` shows six folder
      renames and no line changed; `#overview` and
      `#insights-overview` open the page where they did; the topics
      and the explorer look as before at 360 px and at desktop width,
      in both schemes.

## 3. The legend's rule and the shared layer

- [x] 3.1 The legend's rule has one home (design D5): that a legend
      of fewer than two series hides nothing moves into
      `drawShownSeries`, so that `drawDistributionCurves` calls only
      that; `drawWithLegend`'s and `traffic.js`'s `shared` becomes
      `legendState`.
      *Verify:* the legend tests pass unchanged, except for imports and
      the parameter's name; a one-series chart in the explorer still draws
      with no legend; snapshots unchanged.
- [x] 3.2 `shared/charts.js` splits into `plot/frame.js`,
      `shared/figure.js` and `shared/rows.js`, and `axes/ticks.js`
      becomes `plot/axes.js` (design D6); `divergingColour` moves to
      `plot/frame.js`; `charts.test.js` splits into
      `plot_frame.test.js`, `shared_figure.test.js` and
      `shared_rows.test.js`, `ticks.test.js` becomes
      `plot_axes.test.js`. `js/axes/` goes.
      *Verify:* `grep -rn "shared/charts.js\|axes/ticks.js" site tests README.md CONTRIBUTING.md`
      finds nothing; every folder holds at most nine modules (the
      repository test); snapshots unchanged.

## 4. Series, breakdowns and a card's colours

- [x] 4.1 The breakdown (design D4): `BY_FAMILY`, `BY_MODEL`,
      `BY_ENDPOINT` with the `Breakdown` typedef in `shared/series.js`,
      `choiceBreakdown` in `traffic_filter.js`, a mix's `breakdown` in
      `sections/mixes.js`, `drawTrafficBars` returning
      `{ breakdown, legend }` and `drawDistributionCharts` taking
      `{ rows, breakdown, legend }`; `series.test.js` and
      `traffic_filter.test.js` follow.
      *Verify:* `grep -rnw "MODEL_SERIES\|FAMILY_SERIES\|ENDPOINT_SERIES\|choiceSeries" site tests`
      finds nothing; snapshots unchanged.
- [x] 4.2 A card's colours sit with the cards (design D7): the fixed
      and highlighted colours, `figureColours` and
      `endpointFigureColours` to `insights/card_series.js`; the
      policies' separator, colours, `seriesPolicy`, `policyColours`
      and `policyLegend` to `insights/routing_panels.js`, which builds
      its series names with that separator; their tests move from
      `series.test.js` to `insights_card_series.test.js` and to a new
      `insights_routing_panels.test.js`.
      *Verify:* `shared/series.js`' header is one paragraph with no
      paper name in it; the routing card's legend lists each policy
      once; snapshots unchanged.
- [x] 4.3 `figure_card.js` draws a card (design D8): the trace's axes
      to `plot/trace_axes.js`, `COUNT_COLOUR` to `card_series.js`;
      `context.orders` becomes `context.mixes`, `startPage` builds the
      shared answers before it mounts the Insights and adds the history
      part after, and `drawFigureChart(body, card, mixes)` takes the
      endpoint mix's rows from them; `ENDPOINT_ORDER` and `endpointOrder`
      go, and `ENDPOINT_PALETTE` moves to `card_series.js`. The start test's list of reads has
      `explore/endpoint_mix` once.
      *Verify:* opening the page requests `explore/endpoint_mix` once
      (the browser's network list); the Daily API calls card's colours
      match the Overview's endpoint mix; snapshots unchanged.

## 5. One name for one shape

- [x] 5.1 The traffic names of design D5: `drawTrafficBars`,
      `colourOrders`, `barSeries` with `summary` passed beside it,
      `distributionCharts` as the parameter of
      `drawDistributionCurves`, `drawing` in `drawDayBars`; and the
      twice-exported names `stackedBarTipText` and
      `drawnScatterPoints`; the raster's `columnCount` and `rowCount`.
      `tests/test_naming.py` gains
      `test_no_two_modules_export_one_name`, with a planted case.
      *Verify:* the new test fails on a planted second `drawBars` and
      passes on the tree; snapshots unchanged.

## 6. Test file names

- [x] 6.1 The node test files take the names of design D9's table by
      `git mv`, those task 3.2 split or renamed already aside; README's Layout block lists them under the rule;
      `tests/test_naming.py` gains
      `test_node_test_files_start_with_a_folder`, with a planted case.
      *Verify:* `git diff -M --stat tests` shows renames alone, except
      for the new test; `make test` runs as many node tests as before.

## 7. The Words section

- [x] 7.1 `CONTRIBUTING.md` opens with the Words section of design
      D10, every name in it as the code now has it; README's and
      CLAUDE.md's headers point to it; README's Layout block describes
      `page/`, `sections/`, `shared/`, `plot/` and `insights/` as
      design D6 counts them. Before this change is archived, its
      `site` spec delta's `js/traffic/` line is set to the line
      `distributions-below` archived.
      *Verify:* every backticked name in the Words section is found
      by `grep -rn` in `site/js`; `openspec validate one-vocabulary
      --strict` and `openspec validate --specs` pass; snapshots
      unchanged.
