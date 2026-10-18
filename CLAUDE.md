# Working in this repository

This is the Chutes trace site: a static, public site for the Chutes
production trace, drawn from the paper's artifact repository. Start with
`README.md` (what the site shows, where its numbers come from, how to run,
build and deploy it, and the map of the folders) and `CONTRIBUTING.md` (the
rules, the patterns to copy, how to verify a change). The specification is
in `openspec/`: a change being built is a folder of `openspec/changes/`,
and an archived change's specs move to `openspec/specs/`. The site's own
words (the page, a section, a topic, a card, a breakdown and the rest)
are defined in the Words section of `CONTRIBUTING.md`.

The rules in `CONTRIBUTING.md` are binding. The ones that matter most:

- Simple, readable and maintainable first; no optimisation without a
  measurement recorded in the change's `design.md`.
- Plain HTML, CSS and ES modules. No framework, no bundler, no npm
  runtime dependency; library URLs only in `site/js/shared/libraries.js`.
- SQL only in `site/queries/**/*.sql`, over the artifact's caches, its
  model names and family table, the derived tables `trace_calendar`,
  `trace_weeks` and `family_models`, and the trace table `weekly_histograms` (the
  trace query alone reads the trace); never assembled from strings.
- Every definition comes from the artifact; the site filters, counts, sums
  and draws. It reads the trace once, in `make tables TRACE=<the released
  trace's Parquet file>`, which builds the tracked trace table
  `tables/weekly_histograms.parquet` (the explorer's distributions) by the
  one query under `site/queries/trace/`; rerun it when the artifact's
  family table or daily rollup, that query, or the week of
  `site_data/months.py` (its epoch or its length) changes, then `make data`.
  The Insights' figures are drawn in
  the browser from the artifact's plot-ready tables,
  `data/paper/plotdata/<figure>.parquet`, which `make data` copies column
  for column into `site/data/all/figures/<figure>.json`; a card names its
  chart kind and the paper's axes (CONTRIBUTING's "A figure card" and
  "Adding a figure"; README's column contract).
- Names are words; functions ≤ 50 lines; modules ≤ 300 lines; every module
  has tests.
- The page reads what `make data` wrote, never a query: after editing a
  query, or when the artifact's caches or plot-ready tables change, run
  `make data ARTIFACT=<the artifact's checkout>`, then `make snapshots`,
  and commit `site/data` and `tests/snapshots` with the change.

## Verifying a change

As `CONTRIBUTING.md`'s "Verifying a change" says: `make test`, and
`make snapshots` when the change is meant to alter what the page shows.

## Git

One commit per task, `make test` green at every commit. Never push without
being asked. Commit messages end with
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, followed by a
`Claude-Session:` line with the session's link when there is one.
