# Tasks: A simpler Overview, a plain Definition, and a see-also link

Every task ends with `make test` green and one commit.

## 1. The family mix and the trends' removal (data step)

- [ ] 1.1 `queries/explore/family_mix.sql` of design D1; delete
      `model_mix.sql`, the three monthly queries, `setup/top_models.sql`;
      `site_database.py` registers no `top_models` and no monthly cache;
      `loading.py` and the fixture artifact drop
      `monthly_requests_tokens_by_model`; `make data` rewrites
      `site/data`; tests of design D5 for the queries, the database and
      the loading.
      *Verify:* `site/data/all/explore/` holds `family_mix.json` and no
      monthly answer; the family mix's requests sum to `trace_totals`'.

## 2. The Overview (page)

- [ ] 2.1 `landing/donuts.js` draws the family mix from
      `context.orders.families` with `FAMILY_SERIES`; `explore/start.js`
      gives `orders = { families, endpoints }`; delete
      `explore/trends.js`, its test, the `#trends` grid and
      `.trend-grid`; `MODEL_SERIES` and `modelColours` stay, as the
      Traffic Explorer colours a family's models by them; the snapshot's
      chart count of the Overview is two; the
      family mix's words marked placeholder.
      *Verify:* the Overview shows two donuts; the family donut's colours
      equal the Traffic Explorer's family colours.

## 3. The Definition control and the see-also line (page)

- [ ] 3.1 `insights/figure_card.js` of design D3: the control holds the
      definition alone, the card's article carries `data-figure`, the
      cards' `source` fields and the topics' `SECTION_README` go;
      `tests/snapshot.py` and `snapshot_units.py` read the figure from
      the attribute; definitions that name a cut-off or a count
      shortened to the description, marked placeholder; `cite.js` and
      `layout.js` of design D4 with its test.
      *Verify:* no card's Definition holds a link; `node --test` and the
      snapshots pass after `make snapshots`.

## 4. Docs and close

- [ ] 4.1 README (the Overview, the Definition control, the see-also
      line), CONTRIBUTING (the queries, the tables, the donut pattern),
      the spec's layout line of `js/explore/`; the tasks ticked.
      *Verify:* `make test` green; `openspec validate simpler-overview
      --strict` passes.
