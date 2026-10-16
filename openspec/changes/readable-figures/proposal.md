# Change: Readable figures

## Why

Six reviews of the Insights, one per topic, compared each card with the
paper's figure and the paper's text. Every card makes the paper's point,
but several are harder to read than the paper's: the CDFs are drawn as
staircases over percentile points the paper joins with lines; the heat
maps and rasters are squat, 240 px tall against the paper's near-square
plots; the routing simulation crams both models' eight lines into each
of four small panels and lets two of them lie on the axis; the hour-of-
week heat map labels each row with the day after the one it holds; the
band charts have no key; the eviction cards hide LRU under an identical
LRB line on an unlabelled axis; the trace-day and trace-month axes make
the reader convert to dates; and the card grid splits the pairs the
paper sets side by side.

## What Changes

- **The chart kinds gain the few parameters the cards need**: a card's
  `height`; CDFs drawn linearly between their points with the tooltip
  picking the curve under the pointer, and a tooltip listing every
  series at the hovered x; a panel that draws only the series it names;
  a dashed reference line in the cells, scatter and bars kinds; a
  stacked bar without the gap between its segments; raster rows centred
  on their ticks and separated where there is room; a key for the band
  charts, with lighter bands and a heavier median; a date in the
  tooltip of a trace-day axis, month names on the trace-month axis with
  the partial last month marked; a few tick formats (a duration, hours
  into a window, a value to two significant figures).
- **Every card is tuned**: axes from zero or from their natural floor,
  every decade ticked where the plot has room, the paper's limits where
  the site's were loose, the true weekday labels, heights that match
  the paper's proportions, and wide cards placed so the paper's pairs
  share a row.
- **The routing simulation is drawn as the paper draws it**: two rows,
  one per model, eight panels, each row on its own y scales, one legend
  entry per policy.
- **Copy that contradicts the drawing is corrected** in the smallest
  way and marked placeholder: cells are cells, not hexagons; a caption
  that names panels the site does not have; a definition describing a
  sampling that did not happen. Everything else the reviews flagged in
  the copy is listed for the authors in design.md and left as it is.

## What it moves

- No answer changes: every change is in how the site draws the rows it
  already ships. The artifact is untouched.
- The hour-of-week heat map's rows read Sun..Sat, the days they hold;
  the paper's figure reads Mon..Sun. The site's caption on weekends no
  longer matches what it shows (listed for the authors).
- The snapshots of every topic are rewritten.

## Out of scope

- Data changes the reviews suggested (a tokens-per-request line, a
  Mon-first seasonality, the share charts as one two-panel figure,
  the seasonality divisor), and the questions for the authors.
- The Definition links and the Overview (the change `simpler-overview`,
  which is archived first; this change's Insights requirement restates
  that change's text).
