# Change: A compact Traffic Explorer that opens on what matters

## Why

The Traffic Explorer now shows a day range, a metric and the chosen
requests' distributions, but it shows them in a way that costs the
visitor space and time. The range is two sliders on two rows where one
track with two handles says the same. The three distributions sit in
three cards of their own under the bars, each with a caption and a
definition, though the numbers they belong to are in the tiles at the
top and need no explaining. Their axes run from the smallest to the
largest value in the data, so the time to first token starts at a
millisecond and the input tokens trail off at a hundred million for a
handful of requests. And the page requests the Insights' first topic at
the same time as the explorer's daily answer, so on a slow line the
bars wait while figures below the fold download; as the answers grow,
that will cost more. Lastly, the hero's Dataset, Paper and Code buttons
and the footer's links should show at a glance where they lead.

## What Changes

- **One slider.** The From and To sliders become one track with two
  handles, the first day at its left end and the last at its right. The
  rules of the range (the push, the presets, the URL) do not change.
- **The distributions move into the tiles.** The input tokens, output
  tokens and TTFT tiles each draw their CDF under their number and
  percentiles, with both axes and nothing else: no card, no caption, no
  definition. The three cards under the bars go.
- **Fixed axes.** The input tokens' x axis runs from 1 to 1,000,000,
  the output tokens' from 1 to 100,000, the TTFT's from 0.01 to 100
  seconds, each ticked at decades; a line is clipped at the ends.
- **The explorer first, the rest after.** The page's first fetches are
  the hero's, the Overview's and the explorer's daily answer, the
  latter started from the page's head before the modules have loaded;
  the histogram answer once the bars are drawn; the Insights' shown
  topic once the explorer has drawn; a family's answers when chosen;
  nothing for a topic or a family not shown. The first draw's time is
  measured before and after, served compressed as the published page
  is, and recorded.
- **Marks on the links off the site.** The Dataset button and link
  carry the Hugging Face mark, the Paper a document mark, the Code and
  the lab's GitHub the GitHub mark, inline, before the text; the arrow
  after the text stays.

## What it moves

- The explorer's `js/traffic/` folder stays at eight modules: the
  cards' module becomes the tiles' charts' module.
- The snapshot units of the explorer change: the three cards' texts go,
  the tiles gain their charts' axes.
- No answer, query, table or URL key changes. The artifact repository
  is not touched.

## Pushback and open points

1. **Fixed axes hide the tail.** The input tokens above a million, the
   output tokens above 100,000 and the TTFTs above 100 s are under
   0.1% of requests each and leave the chart at its right edge; the
   CDF's last visible point then stops short of 100%. The axes are the
   same for every choice, so two choices can be compared by eye, which
   data-fitted axes did not allow.
2. **Small charts in tiles.** At 1280 px a tile is about 250 px wide,
   so a chart holds at most four ticks per axis. The axes stay, as the
   user asked; the tooltip gives the exact values.
3. **The Insights wait for the explorer.** The shown topic's figures
   are requested once the explorer has drawn, so on a slow line the
   Insights appear a second or two later than they do now. They are
   below the fold; a tab pressed before then draws its topic at once.

## Not in this change

- Prefetching other families' answers in the background: eleven
  families' daily and histogram answers are 20 MB uncompressed for a
  choice most visitors never make.
- Any change to the answers' format or the trace table.
