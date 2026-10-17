# Tasks: A compact Traffic Explorer that opens on what matters

Every task ends with `make test ARTIFACT=../2027_chutes_repo_artifact`
green and one commit. The artifact repository is not touched. Copy the
user writes is marked `// placeholder:` where this change adds any.

## 1. Marks on the links off the site

- [ ] 1.1 `shared/link_marks.js` with the three marks of design D5;
      `landing/hero.js` and `shared/layout.js` write each link off the
      site with its mark before the text and the arrow after; the
      `.link-mark` rule. Node test of design D7; `make snapshots` if a
      unit moves.
      *Verify:* the hero's three buttons and the footer's four links
      show their marks in both schemes; the console is clean.

## 2. One slider

- [ ] 2.1 `traffic_range.js`: the two inputs laid over one track of
      design D1, the days at the track's ends, the push rule and the
      events unchanged; the `.traffic-range` rules; `traffic.js` places
      the one row. Node tests of design D7; `make snapshots`.
      *Verify:* either handle drags, Tab reaches both, the arrow keys
      move them, the URL round trip of `from` and `to` holds, and at
      360 px the track takes the card's width.

## 3. The distributions in the tiles

- [ ] 3.1 `traffic_tiles.js` leaves a chart place in the input, output
      and TTFT tiles; `traffic_tile_charts.js` (from
      `traffic_distribution_cards.js`) draws the three CDFs there with
      the fixed domains and ticks of design D3, the loading, error and
      no-request states of design D2; `traffic.js` draws them where it
      drew the cards and the legend hides a series in the four charts;
      the three cards, their grid rules and their copy go. Node tests
      of design D7; `tests/snapshot_traffic.py`'s units; `make
      snapshots`.
      *Verify:* a line is clipped at the right edge, not ended early;
      the TTFT axis reads 0.01 s to 100 s; the console is clean; the
      tiles stack on a phone with their charts.

## 4. The explorer first, the rest after

- [ ] 4.1 Measure the page before the change with the scripts of
      design D4, plain and gzipped; then `explore/start.js` draws the
      shown topic once the sections have settled, the page's head
      preloads the daily answer, and the order of design D4 holds;
      measure again and record both tables in design D4. Node tests of
      design D7 for the order.
      *Verify:* the bars are drawn earlier on the throttled line than
      before, or no later within noise, and the shown topic's figures
      are requested after the explorer has drawn; a tab pressed before
      then draws at once; the console has no preload warning.

## 5. Documents and the spec's values

- [ ] 5.1 README and CONTRIBUTING (the one slider, the tiles' charts,
      the loading order, the link marks, `js/traffic/`'s modules), the
      `site` spec's layout line, the spec's scenario values as built,
      design D4's tables filled.
      *Verify:* `make test` green; `tests/test_readme.py` finds every
      path; `openspec validate compact-explorer --strict` passes.
