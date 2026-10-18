# Change: The distributions under the explorer, and the explorer as wide as the window

## Why

The last change drew the three distributions, the input tokens, the
output tokens and the time to first token, inside the tiles at the top
of the Traffic Explorer's card. In a tile a chart is 140 px high and a
quarter of the card wide, its y axis has room for three labels, and the
tiles, which are the explorer's headline numbers, now carry more than
numbers. The user asks for the headline to be numbers again and for
the three distributions to stand in a row of their own under the day
range, each as large as any figure. The explorer's card is also capped
at the page's width, 76rem, so on a wide screen a year of days is drawn
on 1,200 px with empty margins either side; the user asks for the
explorer to take the window's width.

Behind the page, the last move of the distributions (from cards into
the tiles) touched 27 files, because the charts' module was named and
keyed after the tiles that held them, the tiles' module made the
charts' places, the chart's height lived in the JavaScript and the
stylesheet, and the tests reached the charts by their position among
an element's children. This change makes the move once more, and
makes it the last one that costs that much: the charts' module makes
its own places, keyed by the metric it draws, and knows nothing of
where the explorer puts them; the height has one home; the explorer's
tests find elements by selector. It is the first of a series of
changes for simplicity and readability that the code-condition review
of 2026-10-18 proposed (`one-vocabulary`, `one-chart-interface`,
`one-home-per-rule`, `one-test-harness`, `one-home-per-fact` follow).

## What Changes

- **Numbers in the tiles, nothing else.** The four tiles show their
  number, its label and its notes (the TTFT's share, each average's
  p50 and p90). No chart.
- **Three charts under the day range.** Inside the explorer's wide
  card, under the slider, a row of three charts: Input tokens, Output
  tokens, Time to first token, each with a one-line title, both axes
  and a tooltip, at a figure's height, three abreast at desktop width
  and one under the other on a narrow screen. No caption, definition
  or rows line. The fixed x domains and ticks, the clipping at the
  domain's ends, the no-request note and the legend that hides a
  series in all four charts stay as they are. The y axis is ticked as
  every CDF on the page is.
- **The explorer as wide as the window.** The Traffic Explorer section
  spans the window, less the gutters; every other section keeps the
  page's width.
- **A charts' module that does not care where it is.** The tile
  charts' module becomes `traffic_distribution_charts.js`, which makes
  its own three places, keyed by metric (`input_tokens`,
  `output_tokens`, `ttft`), and draws into them; the tiles' module
  writes texts only; the percentiles are keyed by metric as the charts
  are; the explorer decides where the row goes.
- **The explorer's tests by selector.** The shared test fake gains
  `querySelector` and `querySelectorAll` for a class, an id, a data
  attribute or a tag, and the explorer's tests use the selectors the
  stylesheet and the snapshot test already use, in place of
  `children[1].children[3]`.
- **One treatment of a family that cannot be read.** Whether at the
  page's opening or on a choice, the error shows in the bars' place
  and the three charts' places, and the tiles keep their numbers
  without percentiles.

## What it moves

- `js/traffic/` stays at eight modules: `traffic_tile_charts.js`
  becomes `traffic_distribution_charts.js`.
- The explorer's snapshot units: the three charts' units keep their
  names (by accessible name); their axis lines change with the y
  ticks; the tiles' texts do not change.
- No answer, query, table or URL key changes. The artifact repository
  is not touched.

## Pushback and open points

1. **No cap at all on the explorer's width.** On a 2,560 px screen the
   bars are drawn over 2,400 px. A year has 367 days, so each bar is
   then 6 px wide, which reads well; the three distribution charts are
   each 800 px wide, wider than any figure on the page. The user asked
   for the window's width; a cap (say 120rem) is one line if the wide
   charts look thin.
2. **The charts' places grow by a little when the charts arrive.**
   Every figure's body reserves 12rem while it loads, and a drawn chart
   is 240 px; the row grows by about 24 px once, as every card on the
   page does. The tile charts kept a place of their exact height
   because the bars stood under them; the row stands at the card's
   foot, so nothing moves under it.
3. **Three charts on a phone are three screens of chart.** They stand
   one under the other, each at a figure's height, as the three cards
   did two changes ago. The visitor scrolls past them to the Insights.

## Not in this change

- The explorer's state kept in one place (the current choice lives in
  the view, the controls, the slider and the URL): the review's one
  large finding on the explorer, left for a later change.
- The other tests' reach by child index (the legend's, the Insights'):
  `one-test-harness`.
- Day ticks on the bars for a short range; the handles' days under the
  handles rather than under the track's ends.
