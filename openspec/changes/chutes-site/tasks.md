# Tasks: The Chutes trace site

Every task ends with `make test` green and one commit. Tasks 1 to 8 are in
this repository; task 0 is in the artifact repository and comes first,
because task 3 reads what it writes.

## 0. The artifact's two caches (artifact repository)

- [ ] 0.1 Add to `paper/01_workload_overview/reproduce.py` one cached query,
      `trace_totals.parquet`: one row with `first_started_at`,
      `last_started_at`, `requests`, `input_tokens`, `output_tokens`,
      `users` (distinct people as the paper's Table 2 counts them),
      `models` (distinct `chute_id`), `instances` (distinct `instance_id`),
      in that script's caching pattern; run it once against the trace;
      commit the cache under `data/paper/cache/` and its row in the
      section README's cache table.
      *Verify:* the row's requests, users, models and instances equal
      Table 2's; `make paper-check` still passes.
- [ ] 0.2 Add, the same way, `daily_rollup.parquet`: one row per day,
      `chute_id` (the twenty most requested named models, null for the
      rest) and endpoint group, with `requests`, `input_tokens`,
      `input_counted`, `output_tokens`, `output_counted`, `ttft_sum`,
      `ttft_counted`; run it once; commit it with its README row.
      *Verify:* its requests sum to Table 2's; its per-day totals equal
      `daily_requests`.

## 1. The repository seed

- [ ] 1.1 Copy the agentic site's files into this repository (no git
      history) and delete what D1 names; rename the package to
      `chutes_site`, the brand to "Chutes Production Trace", the Worker
      to `chutes-trace-site`; keep `CONTRIBUTING.md`, `CLAUDE.md`,
      `README.md` as drafts to rewrite in task 8.
      *Verify:* `node --test` passes over what remains; the Python tests
      that read a release are deleted, not skipped; the repository test
      lists exactly the tracked files.

## 2. The data step

- [ ] 2.1 `site_data/loading.py`: read the artifact's caches D3 names and
      `chute_models.csv` into frames, stopping with a message naming any
      missing file; `site_data/site_database.py`: register them as DuckDB
      tables under the cache names.
      *Verify:* a fixture artifact with every cache (a few rows each)
      loads; a missing cache stops with its name.
- [ ] 2.2 `site_data/months.py`: the trace start date constant (D6) and
      the calendar label of a trace month.
      *Verify:* month 1970-01 → `2025-04`, 1971-01 → `2026-04`.
- [ ] 2.3 `site/queries/explore/*.sql`: `trace_totals`, `model_mix`,
      `endpoint_mix`, `requests_by_month_model`, `tokens_by_month_model`,
      `requests_by_month_endpoint`, `daily_rollup` (the explorer's rows);
      `site_data/answers.py` writes each answer and `queries.json`.
      *Verify:* every query runs over the fixture and returns its
      documented columns; every answer equals the live query; the hash
      check fails on an edited query.
- [ ] 2.4 `site_data/figure_images.py`: render every PDF of the artifact's
      `config/figures.json` to `site/figures/<name>.png` at the D2 scale
      with pypdfium2 (pinned in `pyproject.toml`), writing `site/figures/index.json`
      with each image's width and height; stop naming any PDF missing.
      *Verify:* the fixture's one PDF renders at the expected width;
      a rebuild writes the same bytes.
- [ ] 2.5 `Makefile`: `make data ARTIFACT=<dir>` runs both; `make setup`
      installs this package only (the artifact is read, not imported);
      run it against the real artifact and commit `site/data` and
      `site/figures`; record the sizes and the time in design.md.
      *Verify:* `make data` twice writes identical files.

## 3. The landing page's numbers and Overview

- [ ] 3.1 The hero: title, lede (the span in months read from
      `trace_totals`, in digits), the buttons (Traffic Explorer, Insights,
      Dataset, Paper, Code), the lab line; the stats strip from
      `trace_totals`.
      *Verify:* node test over the hero's text; the strip's numbers
      are the answer's, formatted.
- [ ] 3.2 The donuts and the three monthly trends (D8) from their
      answers, with the calendar month ticks.
      *Verify:* node tests over the series and legends; snapshot.

## 4. The Traffic Explorer

- [ ] 4.1 `explore/traffic.js` and `traffic_filter.js`: the controls,
      the URL keys, the filtered daily chart and the four tiles of D4,
      from the `daily_rollup` answer; the guide line under the heading.
      *Verify:* node tests over the filter, the sums, the averages'
      counted denominators and the URL; a 360 px snapshot does not
      scroll sideways.

## 5. The Insights

- [ ] 5.1 `explore/figure_sections.js`: the six topics and 47 cards of
      D7 with title, insight, caption, definition, image (and the legend
      image where D7 says) and `isWide`; `explore/figure_card.js` draws a
      card: the image at its width with `width`/`height`, linked full
      size, `alt` of title and insight, the caption, the definition
      control with the source link.
      *Verify:* the node test that compares the cards' images with
      `site/figures/index.json`; the word-count test; a test that every
      file of the artifact's `config/figures.json` is used once when
      `ARTIFACT` is set.
- [ ] 5.2 Seed the copy from the paper (proposal point 3) and the topic
      takeaways from the finding boxes.
      *Verify:* the word-count test passes; the user reviews the text.
- [ ] 5.3 The white figure panel in the dark scheme; the image at the
      card's width on a phone.
      *Verify:* snapshots in both schemes; the 360 px state.

## 6. Tests

- [ ] 6.1 `tests/snapshot_units.py`: the six states and their units
      (D9); write `tests/snapshots/`.
      *Verify:* `make test` compares and passes; `make snapshots`
      rewrites.
- [ ] 6.2 The repository test: tracked files, no machine path, library
      URLs in one module, every listed figure image tracked, no file
      over 25 MiB, the data whole and current.
      *Verify:* it fails on a planted untracked image name.

## 7. Deployment

- [ ] 7.1 `wrangler.jsonc`, `.github/workflows/deploy.yml` with the D10
      checks; the GitHub repository and its two secrets are the user's to
      create.
      *Verify:* `npm run check` (a dry run) passes.

## 8. Documentation

- [ ] 8.1 Rewrite `README.md` (what the site shows, where the numbers
      come from, how to build, serve and deploy), `CONTRIBUTING.md` (the
      rules and the patterns, less the selection tables and the
      pipeline mirrors) and `CLAUDE.md`.
      *Verify:* every folder and module README's layout names exists.
