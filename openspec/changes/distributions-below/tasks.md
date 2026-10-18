# Tasks: The distributions under the explorer, and the explorer as wide as the window

Every task ends with `make test ARTIFACT=../2027_chutes_repo_artifact`
green and one commit. The artifact repository is not touched. Copy the
user writes is marked `// placeholder:` where this change adds any.

## 1. The fake page's selectors

- [ ] 1.1 `tests/fake_page.js`: `FakeElement.querySelector` and
      `querySelectorAll` of design D5, with `matches`; the `controlsOf`
      helper there, once; `tests/fake_page.test.js`. The explorer's
      tests (`traffic.test.js`, `traffic_tiles.test.js`,
      `traffic_tile_charts.test.js`, `traffic_controls.test.js`,
      `traffic_period_buttons.test.js`) reach elements by selector; no
      `children[n]` left in them. No site code changes.
      *Verify:* `node --test` green; `grep -c "children\[" tests/traffic*.test.js`
      gives 0; snapshots unchanged.

## 2. The charts under the range, the tiles as numbers

- [ ] 2.1 `traffic_distribution_charts.js` from `traffic_tile_charts.js`
      (design D3), making the three titled places of design D1 keyed
      by metric, at the kinds' default height and margins, the y axis
      at the kind's ticks; `choicePercentiles` keyed by metric;
      `traffic_tiles.js` writing texts only (design D2); `traffic.js`
      placing the row after the range and drawing there, and one
      treatment of a failed family read (design D6); the stylesheet's
      tile-chart rules gone and the row's rules added. Node tests of
      design D7; `tests/snapshot_traffic.py`'s selectors; `make
      snapshots`, the three charts' axis units the only change.
      *Verify:* at 1280 px the three charts stand abreast under the
      slider with both axes titled, a line clipped at the right edge;
      at 360 px one under the other; the tiles show numbers only; the
      legend hides a series in all four charts; the console is clean.

## 3. The explorer as wide as the window

- [ ] 3.1 The width cap moved from `.page` to `.page > section`, the
      Traffic Explorer's section uncapped (design D4); the hero's
      band, the section borders and the Insights' grid checked.
      *Verify:* at 1920 px the explorer's card spans the window less
      the gutters and every other section is 76rem wide and centred;
      at 1280 and 360 px nothing else moved; snapshots unchanged; no
      horizontal scroll at any width.

## 4. Documents and the spec's values

- [ ] 4.1 README and CONTRIBUTING (the row of three charts, the
      tiles as numbers, the page's width, `js/traffic/`'s modules, the
      fake page's selectors), the `site` spec's layout line, the
      scenario values as built.
      *Verify:* `make test` green; `tests/test_readme.py` finds every
      path; `openspec validate distributions-below --strict` passes.
