## MODIFIED Requirements

### Requirement: Figure cards are drawn from their answers
A card's figure SHALL be drawn by the site with the chart kind the card
names, from the rows of the figure's answer alone, at the card's width,
with the paper's axes: the same quantities on x and y, a log scale where
the paper's axis is log, the paper's limits where the card gives them,
and tick labels in the site's formats; a y axis of a count SHALL start
at zero and an axis of a ratio at its floor, and an axis of the trace's
days or months SHALL say which dates they are. The one exception to the
paper's axes SHALL be the per-user inter-arrival band card, on a linear
axis to 400 s that clips its bands where the paper's axis is log, so
that the median's move over the year shows. The daily and hourly cards
SHALL count days from the trace's first, their tooltips writing each
day's date. A monthly card SHALL name a trace month by the calendar
month its first day falls in, "Apr '25" to "Apr '26", and SHALL star the
thirteenth, "Apr '26*", since it holds only the trace's last two days;
each card on that axis SHALL say what the star means in its definition.
A CDF SHALL be drawn as straight lines between its points. A chart SHALL
be as tall as its card asks, 240 px by default, and the two cards of a
grid row SHALL take the same height. Every kind except `raster` SHALL
show a tooltip with the values under the pointer; the two
eviction-algorithm cards' tooltip SHALL list every algorithm's value at
the hovered cache size. A `raster` is drawn on a canvas and takes no
tooltip, and its row ticks sit on the rows' centres. A bands card SHALL
show a key naming its two bands and its median. The routing card's
legend SHALL hold one button per policy, which hides that policy in both
rows of panels. Series colours SHALL come from the theme, the three
highlighted models and the global series keeping one colour each across
every card. In the dark scheme a chart SHALL use the dark tokens as the
Overview's charts do. On a phone a chart SHALL be as wide as its card
and the page SHALL NOT scroll sideways. A card whose answer fails to
load SHALL say so in the chart's place. A chart's SVG SHALL carry the
card's title and insight as its accessible name.

#### Scenario: A value under the pointer
- **WHEN** the pointer rests on the requests-per-day line at day 120
- **THEN** a tooltip SHALL show that day with its date and its requests

#### Scenario: A log axis
- **WHEN** the input-tokens CDF card is drawn
- **THEN** its x axis SHALL be logarithmic from 10 to 1,000,000 tokens, ticked at every decade from 100 to 100,000 in the site's format

#### Scenario: A raster
- **WHEN** the Qwen3-Next-80B card is drawn
- **THEN** it SHALL shade each user row's hours by their requests, with the days of the window on the x axis, neighbouring hours and rows sharing a pixel, shaded by the most requests among them, where the window has more hours or rows than the plot has pixels

#### Scenario: A phone
- **WHEN** the page is opened 360 pixels wide
- **THEN** the cards SHALL stack in one column, each chart as wide as its card, and the page SHALL not scroll sideways

#### Scenario: The partial last month
- **WHEN** a card on the trace's month axis is drawn
- **THEN** its last tick SHALL read "Apr '26*" and its definition SHALL say that the thirteenth month holds only the trace's last two days

#### Scenario: Hiding a routing policy
- **WHEN** the visitor presses a policy in the routing card's legend
- **THEN** that policy's lines SHALL leave every panel of both rows
