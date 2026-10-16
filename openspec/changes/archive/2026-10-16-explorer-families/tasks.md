# Tasks: Families in the Traffic Explorer

Every task ends with `make test` green and one commit. Task 0 is in the
artifact repository and comes first; task 1 reads what it writes.

## 0. The family table and the rollup (artifact repository)

- [x] 0.1 `data/paper/model_families.csv` with the families and patterns
      of design D1; the `daily_rollup.parquet` query in
      `paper/01_workload_overview/reproduce.py` joins each named model to
      the first pattern its name contains, keeps `chute_id` for the eight
      most requested named models of each family, and adds `family`;
      recompute it once against the trace; commit the cache, the table
      and the README row; record each family's share of requests and the
      file's size in this change's design.md.
      *Verify:* the rollup's requests sum to `trace_totals`; every
      family's rows sum to its models' plus its rest; `make paper-check`
      passes.

## 1. The answers

- [x] 1.1 `site_data/loading.py` reads `model_families.csv`;
      `site/queries/setup/family_models.sql` ranks the named models
      within their family from the rollup; `queries/explore/daily_by_family.sql`;
      `queries/explore/daily_by_model.sql` with the `$family` parameter;
      `answers.py` runs a parameterised query once per family of the
      by-family answer and writes `explore/daily_by_model/<slug>.json`;
      delete `explore/daily_rollup.sql` and its answer; the fixture
      artifact's rollup gains families; tests of design D5.
      *Verify:* `make data` writes the by-family answer and one file per
      family; record their sizes in design.md.

## 2. The explorer

- [x] 2.1 `traffic_filter.js`: the family in the choice, the URL keys,
      the series column by choice, the model drop-down's entries from a
      family's answer; `traffic_controls.js`: the family drop-down and
      the disabled model drop-down; `traffic.js`: fetch a family's answer
      on choice, keep it, draw by family, model or endpoint;
      `theme/colours.js`: `familyColours`; node tests.
      *Verify:* the URL round trip; Back and Forward restore the family;
      the console is clean; 360 px does not scroll sideways.

## 3. Tests and documentation

- [x] 3.1 Rewrite the explorer's snapshot unit; the deploy workflow
      fetches the by-family answer; README (the two answers, the family
      table), CONTRIBUTING (the parameterised query pattern), the
      explorer's guide line (the user's words) and the spec's Scenario
      values.
      *Verify:* `make test` green; `npm run check` passes.
