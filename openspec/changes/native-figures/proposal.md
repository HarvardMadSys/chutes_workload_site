# Change: Native, interactive figures

## Why

The Insights show the paper's 48 figures as PNG images rendered from the
artifact's PDFs. An image cannot follow the dark scheme, cannot say its
value under the pointer, cannot hide a series, and gives a screen reader
nothing but its title; the paper's 7 pt labels are small on a phone; and
the images weigh 7.3 MB. The Overview and the Traffic Explorer are already
drawn natively from small answers, and the figures should be drawn the
same way. The values do not change: every figure is drawn from the same
numbers the paper's PDF is.

## What

- **Every figure is drawn by the site**, with Observable Plot, from one
  small answer per figure, `site/data/all/figures/<figure>.json`, with a
  tooltip under the pointer, a legend that toggles where there is more
  than one series, the dark scheme, and the paper's axes, scales and
  labels.
- **The artifact gains one plot-ready table per figure**,
  `data/paper/plotdata/<figure>.parquet`: the frame the figure's
  reproduce script draws, written by that script in its caching pattern
  and committed, so the paper's PDF and the site's chart are drawn from
  one file. A figure of a point cloud (the hexbins, the rasters) gets the
  cloud binned to a grid, since a million dots cannot ship. The sixteen
  figures whose inputs exist only in this machine's `output/` or need the
  trace run once here, as the explorer's caches did.
- **The site's data step converts plotdata to JSON** and nothing else:
  the PDF rendering, pypdfium2, Pillow and `site/figures/` go.
- The Insights keep their six topics, 47 cards, copy and definition
  controls; the definition control links the figure's plotdata file and
  its section README.

## What it moves

- The 48 images (7.3 MB) become 48 answers, expected under 3 MB in all,
  the four rasters most of it; measured when first built (design.md).
- A raster of one dot per request becomes a grid of hourly request counts
  per user or model row. A hexbin becomes a grid of counts on the same
  log axes, in square cells. A figure with two y axes (the two user
  zooms) becomes two panels in one card. The 2 × 4 routing figure
  becomes four charts in one wide card, each with a line per model. The
  boxplot is drawn from the five box statistics computed in the
  artifact. The share legend becomes the two share charts' own legend,
  in the artifact's order.
- The artifact's `check_figures.py` also checks that every listed figure
  has its plotdata file.

## Pushback and open points

1. **The rasters are a different picture.** Hourly cells per row read as
   the paper's dot rasters do at a glance, but a dot per request is gone.
   Dense grids are drawn on a canvas, so they carry no per-cell tooltip;
   every other kind has one.
2. **Hexagons become squares.** The density figures are binned in the
   artifact on a log grid with the paper's cell count; the paper's PDFs
   keep matplotlib's hexagons from the same points.
3. **Colours are the site's.** Series take the site's palette, so the
   three highlighted models have one colour each across every card, not
   matplotlib's tab10; the paper's colours are not reproduced.
4. **The load-balancing plotdata needs the trace once.** The two user
   zooms query the trace on every run of the artifact's script; their
   plotdata is written once here and committed.
5. **The copy stays yours.** Titles, insights, captions, definitions and
   the 27 placeholder lines are unchanged by this change.

## Not in this change

- The Traffic Explorer's families (the change `explorer-families`).
- Redrawing a chart when the window is resized (parked earlier).
- Redesigning any figure: each keeps the paper's axes and series.
