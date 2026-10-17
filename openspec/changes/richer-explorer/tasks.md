# Tasks: A richer Traffic Explorer

Every task ends with `make test ARTIFACT=../2027_chutes_repo_artifact`
green and one commit. The artifact repository is not touched. Copy the
user writes is marked `// placeholder:` where this change adds any.

## 0. The trace table

- [ ] 0.1 `site/queries/trace/weekly_histograms.sql` (design D3, D4,
      D5): the view `trace`, `chute_models`, `model_families` and
      `family_models`, one row per week, family, kept chute id, endpoint
      group, metric and bin. `site_data/tables.py`: `python -m
      site_data.tables --trace <parquet> --artifact <dir> --out tables`
      opens the site's database over the artifact (as `make data` does),
      adds the trace as the view `trace`, runs the query, writes the
      Parquet file and the sidecar; `make tables`. The fixture artifact
      gains a small trace whose rows add up to its rollup; tests of
      design D10 for the query, the builder and the sidecar; the
      repository test takes `tables/` with `.parquet` and `.json`.
      Then run `make tables` against the released trace and commit
      `tables/weekly_histograms.parquet` and its sidecar; record the
      run's time and the file's size and rows in design.md D3.
      *Verify:* the fixture test; the consistency test against the
      artifact's rollup passes on the real table.

## 1. The answers

- [ ] 1.1 `site_data/loading.py` reads `tables/weekly_histograms.parquet`
      (the `--tables` folder, default `tables/`); `site_database.py`
      registers `weekly_histograms`, eight tables;
      `queries/explore/histograms_by_family.sql` and
      `queries/explore/histograms_by_model.sql` (`$family`) of design D6;
      `answers.py` lists the second among the family queries; tests of
      design D10; `make data`; record the answers' sizes in design.md D6.
      *Verify:* the answer tests; `make data` writes one histogram file
      per family.

## 2. The explorer's folder

- [ ] 2.1 Move `traffic.js`, `traffic_filter.js` and `traffic_controls.js`
      from `site/js/explore/` to `site/js/traffic/`, with their imports,
      their tests' imports, the page module, the README's layout and
      CONTRIBUTING; nothing else changes.
      *Verify:* `make test` green with no snapshot change.

## 3. The day range and the metric

- [ ] 3.1 `traffic_filter.js`: the choice holds `from`, `to` and `metric`
      in place of `period`; `readTrafficChoice` clips the days to the
      trace's and drops a reversed pair; `periodRange` gives a period
      button's days; `rowsInChoice` keeps the days of the range;
      `dailyValues(rows, seriesColumn, metric, colours)` sums the
      metric's column. `traffic_range.js`: the two sliders of design D1,
      their days written beside them, a slider moved past the other
      pushing it, `input` events drawing through one
      `requestAnimationFrame`. `traffic_controls.js`: the metric
      drop-down; the period buttons set the range and show pressed when
      the range equals theirs. `traffic.js`: the bars of the metric, with
      their title, tooltip and formats (design D2); the sliders under the
      bars. Node tests of design D10; `make snapshots`.
      *Verify:* the URL round trip of `from`, `to` and `metric`; Back and
      Forward restore the range; the console is clean; 360 px does not
      scroll sideways.

## 4. The distributions

- [ ] 4.1 `traffic_distributions.js` (design D7, D8): read the histogram
      answer of the choice after the bars are drawn; fold the rows of
      the weeks holding a chosen day into one bin map per series and
      metric; the CDF rows at the bins' upper edges for the `lines` kind
      with `cdf: true`; the p50 and p90 at the bins' geometric middles;
      the three cards under the bars, in a grid, each a figure of the
      card pattern with its own definition, their lines hidden by the
      card's legend as the bars are; the tiles' percentile notes.
      `traffic.js`: the legend's redraw draws all four charts; the
      distributions are requested once the bars have drawn, and again on
      a change of choice. Node tests of design D10; the snapshot units
      for the three charts and the notes; `make snapshots`.
      *Verify:* the CDFs' end points are 100%; the percentile of a
      one-bin distribution is that bin's middle; a legend press hides
      the series in four charts.

## 5. Words, measurement and documents

- [ ] 5.1 The explorer's guide line, the cards' titles, captions and
      definitions as placeholders for the authors; the loading
      measurement of design D8 repeated on the finished page and
      recorded there; README (what the site shows, where the numbers
      come from, building the tables, layout), CONTRIBUTING (the trace
      table, the histogram answers, the explorer's keys), CLAUDE.md,
      `openspec/config.yaml` (the trace is read once, by `make tables`),
      the deploy workflow's check of a histogram answer; the spec's
      scenario values.
      *Verify:* `make test` green; `tests/test_readme.py` finds every
      path; the bars' time to draw is not later than the baseline of D8.
