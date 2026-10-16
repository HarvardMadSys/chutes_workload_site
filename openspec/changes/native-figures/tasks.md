# Tasks: Native, interactive figures

Every task ends with `make test` green (the artifact: `make paper-check`)
and one commit. Task 0 is in the artifact repository and comes first; its
plotdata files are what every later task reads. The sections' order
follows the Insights' topics.

## 0. The artifact's plotdata (artifact repository)

- [x] 0.1 `paper/_common.py`: `cached_frame(name, build)`, the plotdata
      twin of `cached_query`, reading `PLOTDATA_DIR/name` when cached and
      otherwise calling `build()` and writing it; `paper/_paths.py`:
      `PLOTDATA_DIR` (`output/paper/plotdata/`, seeded from
      `data/paper/plotdata/` as the caches are); `check_figures.py` also
      prints every listed figure without a plotdata file.
      *Verify:* `make paper-check` lists all 48 figures as missing plotdata.
- [x] 0.2 `paper/01_workload_overview/reproduce.py`: a plotdata function
      per figure (the four `lines`, the seasonality's `cells` with the
      per-weekday division), the draw functions reading them; run it;
      commit the five files under `data/paper/plotdata/`.
      *Verify:* the figures redraw byte-alike from the plotdata; the
      seasonality cells equal the drawn image's values.
- [x] 0.3 `paper/02_token_shape_latency/reproduce.py`: the five `cdf`
      tables (series Global and the three highlighted models) and the
      three latency grids as `cells`, with the script's ≤32K / ≤8000
      filter applied; run; commit.
      *Verify:* each CDF has four series of 101 steps; each grid's cells
      equal the plotted mesh.
- [x] 0.4 `paper/06_users_models/reproduce.py`: the six density figures
      binned as `cells` on log grids of the paper's cell counts (counts
      per cell), the scatter as `scatter`, the four rasters as `raster`
      (row index × hour of the 31-day window, requests), the share
      legend as `legend` and the two shares as `stacked_bars` (with the
      script's TEE merge and top-ten); run once (the rasters and the
      user medians need the local tables); commit.
      *Verify:* every raster's cells sum to its table's requests in the
      window; the shares' columns sum to 1 per month.
- [x] 0.5 `paper/03_workload_evolution/reproduce.py`: the two monthly
      token `bands`, the two cohort `bands` (the script's quantiles over
      users), the two hit-ratio `cdf` tables, the two hit-ratio hexbins as
      `cells`, the monthly IAT `bands`, the per-user IAT `boxes` (the
      five box statistics and the count per model, whiskers at 1.5 IQR as
      the figure draws them); run once (the cohort table is local);
      commit.
      *Verify:* the boxes' medians equal the figure's; the cohort bands
      have 13 rows.
- [x] 0.6 `paper/04_prefix_caching/reproduce.py`: the TTL coverage as
      `lines` (2,000 points); `pipeline/caching/plot_hit_ratio.py`: the
      two sweeps as `lines` (series per algorithm); run once (the pair
      table is local); commit.
      *Verify:* the coverage line is monotone; each sweep has seven series.
- [x] 0.7 `paper/05_load_balancing/reproduce.py`: the three hourly
      `lines`, the concurrency `cells` (instance × minute of the densest
      day), the two P90 hexbins as `cells`, the two user zooms as `bars`
      with panels `request_share` and `token_hit`; `pipeline/routing/plot_tradeoff.py`:
      the routing figure as `lines` with panels `a` to `d` and a series
      per model, panel (d) as the script computes it; run once (the
      zooms query the trace); commit.
      *Verify:* `make paper-check` reports no figure without plotdata;
      the zooms' bars equal the figure's.
- [x] 0.8 Each section README's table gains the plotdata column; the
      artifact README says what `data/paper/plotdata/` is; record the
      files' total size in this change's design.md.
      *Verify:* every plotdata file is tracked and under 1 MB.

## 1. The site's data step

- [x] 1.1 `site_data/figure_answers.py`: for every figure of
      `config/figures.json`, read its plotdata and write
      `site/data/all/figures/<figure>.json` and `all/figures.json`;
      `__main__.py` runs it after the query answers; delete
      `figure_images.py`, its tests, pypdfium2 and Pillow from
      `pyproject.toml`, `site/figures/`, the `--figures` option and
      `readFigureIndex`; the fixture artifact gains one plotdata per
      kind; tests: answer equals plotdata, a missing plotdata stops the
      step, a rebuild writes identical bytes.
      *Verify:* `make data ARTIFACT=...` writes 48 figure answers; record
      their sizes and the time in design.md.

## 2. The chart kinds

- [x] 2.1 `charts/lines.js` (from the agentic site's `cdf.js`: series
      lines, optional markers, log axes, a `cdf` answer drawn with the y
      axis as a share, a `panel` filter) and `charts/bands.js` (from
      `ranges.js`: the median line and two bands), with tooltips; node
      tests over their marks and scales.
      *Verify:* the fixture answers draw; a log axis is requested where
      the card says.
- [x] 2.2 `charts/cells.js` (rectangles from the four edges, a
      sequential colour scale with its legend, log axes) and
      `charts/raster.js` (`Plot.raster` from integer positions); tests.
      *Verify:* a cells answer with 697 rows draws 697 rectangles; the
      raster's width and height follow the answer's extent.
- [x] 2.3 `charts/scatter.js` (dots coloured by a diverging scale),
      `charts/boxes.js` (a box per series from its five statistics) and
      `charts/bars.js` (grouped bars, a `panel` filter); tests.
      *Verify:* nine modules in `js/charts/`, each tested.

## 3. The cards

- [x] 3.1 Move `figure_sections.js` and `figure_card.js` to
      `js/insights/`; a card names `figure`, `kind`, `axes` and
      `panels`; `figure_card.js` fetches the answer, draws the chart by
      kind at the card's width with the shared legend where there is
      more than one series, and shows the Definition control with the
      plotdata and README links; `shared/series.js` gains the fixed
      colours of Global and the three highlighted models; delete the
      white panel and the image styles; the node test of the kinds and
      columns over the shipped answers.
      *Verify:* the first topic draws five charts; the console is clean.
- [x] 3.2 Topics 01 and 02: the thirteen cards' kinds and axes (the
      paper's labels, log scales and limits).
      *Verify:* snapshot of both topics.
- [x] 3.3 Topic 03: the ten cards, the rasters' day axis and the
      diverging scatter.
      *Verify:* the Users topic draws in under two seconds at desktop width
      (record the time in design.md).
- [x] 3.4 Topics 04 and 05: the two shares in the legend's order, the
      bands, the boxes, the sweeps.
      *Verify:* snapshots.
- [x] 3.5 Topic 06: the two-panel zooms and the four-panel routing card.
      *Verify:* snapshots; the wide card at 360 px does not scroll sideways.

## 4. Tests, deployment and documentation

- [x] 4.1 `tests/snapshot_units.py`: a card's unit is its chart's series,
      legend and tick labels; rewrite `tests/snapshots/`; the repository
      test checks `all/figures.json` against the tracked answers and the
      rebuild; the figures-registry test compares cards and legend use
      with `config/figures.json`; the deploy workflow fetches one figure
      answer.
      *Verify:* `make test` green; `npm run check` passes.
- [x] 4.2 `README.md`, `CONTRIBUTING.md` (the chart kinds and the column
      contract) and `CLAUDE.md` describe the plotdata flow.
      *Verify:* the README layout test passes both ways.
