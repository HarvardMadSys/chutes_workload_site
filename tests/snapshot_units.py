"""The states of a snapshot, and the units read from each in the browser: each unit is one block a visitor sees (a
chart, a legend, a block of text), returned as the text written to its file, `<state>/<unit>.txt`.

Text units hold one line per entry, whitespace collapsed: a card's texts as `label: text`, a legend's entries as `text
| pressed=… | mark`, a control's choice as `field: choice | selected=…`, an axis as `x-axis: label | label …`. An
Overview chart's SVG is written one element per line with Plot's numbered ids made plain, so `git diff` shows which
element changed; an Insights card's chart, which may hold thousands of cells, is written as its accessible name
(`name: …`) and, for each place it draws in, the card's body or each of its panels, the panel's title (`panel: …`),
its colour legend's title and labelled ticks (`colour-legend: Models: 1 | 10 | 100`), its axes' tick labels and its
axes' titles (`x-axis title: …`). Colours are recorded as the CSS tokens the page names (`var(--series-5)`), so a
series moved to another colour slot is caught. Every reading function takes a Playwright page or locator and reads it
as it is now; this module imports no Playwright itself.
"""

import re


class SharedTitleError(Exception):
    """Two cards of one state share a title, so their units, which are named by title, would share files."""


# The Explore page's states, each a folder of `tests/snapshots/`, and the Insights topic each shows, by its section id,
# which is also the anchor the page is opened at to show it; in the order of the topic tabs.
EXPLORE_STATES = {
    "explore-overview": "insights-overview",
    "explore-tokens": "insights-tokens",
    "explore-users": "insights-users",
    "explore-evolution": "insights-evolution",
    "explore-caching": "insights-caching",
    "explore-balancing": "insights-balancing",
}

# Plot numbers each clip path, marker and pattern in the order charts are drawn, which follows the order their answers
# arrive, so the number is left out: `plot-clip-7` is written `plot-clip`.
PLOT_NUMBERED_ID = re.compile(r"\bplot-(clip|marker|pattern)-\d+")
BETWEEN_ELEMENTS = re.compile(r">\s*<")  # where one element's tag ends and the next begins
WHITESPACE = re.compile(r"\s+")
NOT_A_WORD = re.compile(r"[^a-z0-9]+")

# The texts of a figure card, in the order they are written: a label and its selector. The line of rows is an Overview
# donut's and the Traffic Explorer's; an Insights card has none.
CARD_TEXTS = (
    ("title", ".figure-title"),
    ("insight", ".figure-insight"),
    ("caption", ".figure-caption"),
    ("definition", ".figure-definition-text"),
    ("rows", ".figure-rows"),
)

# The texts of an Insights topic, as `CARD_TEXTS`: its heading and takeaway, then its groups' headings and takeaways.
TOPIC_TEXTS = (
    ("heading", "h2"),
    ("takeaway", ".topic-takeaway"),
    ("group", ".figure-group-title"),
    ("group takeaway", ".figure-group-takeaway"),
)

# Every entry of a legend, in the order shown: a series button of a figure, or an entry of a bands chart's key.
LEGEND_ENTRIES = ".legend-button, .band-key-entry"
LEGEND_MARK = ".legend-swatch"  # the colour mark inside a legend entry

# A chart is an SVG element drawn in a figure's body that is not inside another SVG.
CHART = ".figure-body svg:not(svg svg)"

# A chart the page has named for a screen reader: an Insights card's, or each of its panels'.
NAMED_CHART = '.figure-body svg[role="img"]'

# A chart's tick labels along one axis: Plot labels the group "x-axis tick label" or "y-axis tick label".
AXIS_TICK_LABELS = 'g[aria-label$="axis tick label"]'

# A chart's axis titles: Plot labels the group of each "x-axis label" or "y-axis label".
AXIS_TITLES = 'g[aria-label="x-axis label"], g[aria-label="y-axis label"]'

# The colour legend Plot draws above a chart that shades a value: an SVG whose class ends in "-ramp", its title the one
# text outside its ticks, and its ticks' labels, an unlabelled tick's empty.
COLOUR_LEGEND = 'svg[class$="-ramp"]'
COLOUR_LEGEND_TITLE = ":scope > text"
COLOUR_LEGEND_TICK_LABELS = "g.tick text"

# A panel of a multi-panel card, holding its title and its chart.
PANEL = ".chart-panel"
PANEL_TITLE = ".chart-panel-title"

TRAFFIC = "#traffic-explorer"  # the Traffic Explorer: its controls, then its card of tiles, legend and bars
TRAFFIC_CARD = "#traffic-explorer .traffic-card"
TRAFFIC_TILES = "#traffic-explorer .traffic-tiles li"


def state_names() -> list[str]:
    """The folder name of every state, in the order the states are read."""
    return list(EXPLORE_STATES)


def plain_text(text: str) -> str:
    """`text` with every run of whitespace made one space, and none at either end."""
    return WHITESPACE.sub(" ", text).strip()


def markup_lines(html: str) -> str:
    """`html` with Plot's numbered ids unnumbered and its whitespace collapsed, one element per line."""
    html = PLOT_NUMBERED_ID.sub(r"plot-\1", html)
    return BETWEEN_ELEMENTS.sub(">\n<", plain_text(html))


def unit_name(title: str) -> str:
    """The file name a card's units are written under: its title in lower case, words joined by underscores."""
    return NOT_A_WORD.sub("_", title.lower()).strip("_")


def labelled_texts(scope, labels_and_selectors) -> str:
    """One `label: text` line for every element inside `scope` each selector matches, in the order given. The text is
    the element's text content, since a figure's definition sits in a closed control the browser does not lay out."""
    lines = []
    for label, selector in labels_and_selectors:
        for text in scope.locator(selector).all_text_contents():
            lines.append(f"{label}: {plain_text(text)}")
    return "\n".join(lines)


def legend_lines(scope) -> str:
    """One line per legend entry inside `scope`: its text, its pressed state where it has one, and its colour mark."""
    lines = []
    for entry in scope.locator(LEGEND_ENTRIES).all():
        parts = [plain_text(entry.inner_text())]
        pressed = entry.get_attribute("aria-pressed")
        if pressed is not None:
            parts.append(f"pressed={pressed}")
        mark = entry.locator(LEGEND_MARK)
        if mark.count() > 0:
            parts.append(f"{mark.first.get_attribute('class')} {mark.first.get_attribute('style')}")
        lines.append(" | ".join(parts))
    return "\n".join(lines)


def chart_name_lines(scope) -> str:
    """One line per named chart inside `scope`: its accessible name, `name: Title: insight`."""
    names = scope.locator(NAMED_CHART).evaluate_all("charts => charts.map((chart) => chart.getAttribute('aria-label'))")
    return "\n".join(f"name: {plain_text(name)}" for name in names)


def axis_lines(scope) -> str:
    """One line per chart axis inside `scope`: its name, "x-axis" or "y-axis", and its tick labels in order."""
    lines = []
    for axis in scope.locator(AXIS_TICK_LABELS).all():
        name = axis.get_attribute("aria-label").removesuffix(" tick label")
        labels = [plain_text(label) for label in axis.locator("text").all_text_contents()]
        lines.append(f"{name}: " + " | ".join(labels))
    return "\n".join(lines)


def axis_title_lines(scope) -> list[str]:
    """One line per chart axis title inside `scope`: its axis, "x-axis" or "y-axis", and its title."""
    lines = []
    for axis in scope.locator(AXIS_TITLES).all():
        name = axis.get_attribute("aria-label").removesuffix(" label")
        lines.append(f"{name} title: " + plain_text(" ".join(axis.locator("text").all_text_contents())))
    return lines


def colour_legend_lines(scope) -> list[str]:
    """One line per colour legend inside `scope`: its title and the labels of its labelled ticks, in order."""
    lines = []
    for legend in scope.locator(COLOUR_LEGEND).all():
        title = plain_text(" ".join(legend.locator(COLOUR_LEGEND_TITLE).all_text_contents()))
        ticks = []
        for label in legend.locator(COLOUR_LEGEND_TICK_LABELS).all_text_contents():
            if label.strip():
                ticks.append(plain_text(label))
        lines.append(f"colour-legend: {title}: " + " | ".join(ticks))
    return lines


def chart_place_lines(place) -> list[str]:
    """The lines of one place a card draws a chart in, its body or one of its panels: the panel's title where it is
    one, then its colour legend, its axes' tick labels and its axes' titles."""
    lines = [f"panel: {plain_text(title)}" for title in place.locator(PANEL_TITLE).all_text_contents()]
    lines.extend(colour_legend_lines(place))
    axes = axis_lines(place)
    if axes:
        lines.append(axes)
    lines.extend(axis_title_lines(place))
    return lines


def figure_chart_lines(scope) -> str:
    """An Insights card's chart: its accessible name, then the lines of each place it draws in, each of its panels in
    order, or its body where it has none."""
    lines = [chart_name_lines(scope)]
    places = scope.locator(PANEL)
    if places.count() == 0:
        places = scope.locator(".figure-body")
    for place in places.all():
        lines.extend(chart_place_lines(place))
    return "\n".join(lines)


def figure_units(scope, name: str) -> dict[str, str]:
    """An Overview figure's units under `name`: its texts, and where it has them its legend and its charts' SVG."""
    units = {f"{name}.texts": labelled_texts(scope, CARD_TEXTS)}
    legend = legend_lines(scope)
    if legend:
        units[f"{name}.legend"] = legend
    charts = scope.locator(CHART).evaluate_all("charts => charts.map((chart) => chart.outerHTML)")
    if charts:
        units[f"{name}.chart"] = "\n".join(markup_lines(chart) for chart in charts)
    return units


def figure_card_units(scope, name: str) -> dict[str, str]:
    """An Insights card's units under `name`: its texts, its legend where it has one (its series' names), and its
    chart (`figure_chart_lines`)."""
    units = {f"{name}.texts": labelled_texts(scope, CARD_TEXTS)}
    legend = legend_lines(scope)
    if legend:
        units[f"{name}.legend"] = legend
    units[f"{name}.chart"] = figure_chart_lines(scope)
    return units


def cards_units(cards, card_units) -> dict[str, str]:
    """The units of every card `cards` matches, each card's read by `card_units` under its title's name; two cards may
    not share a title."""
    units = {}
    for card in cards.all():
        title = card.locator(".figure-title").inner_text()
        name = unit_name(title)
        if f"{name}.texts" in units:
            raise SharedTitleError(f"two cards are titled {title!r}; their units would share files")
        units.update(card_units(card, name))
    return units


def topic_units(page, topic: str) -> dict[str, str]:
    """The units of the Insights' topic section `topic` (its id): the tabs, its `TOPIC_TEXTS`, then each card."""
    tabs = []
    for tab in page.locator("#topic-tabs [role=tab]").all():
        tabs.append(f"tab: {plain_text(tab.inner_text())} | selected={tab.get_attribute('aria-selected')}")
    section = page.locator(f"#{topic}")
    heading = labelled_texts(section, TOPIC_TEXTS)
    units = {"topic.texts": "\n".join(tabs) + "\n" + heading}
    units.update(cards_units(section.locator(".card-grid > .card"), figure_card_units))
    return units


def text_lines(block) -> list[str]:
    """The lines of text `block` shows, each with its whitespace collapsed, empty lines left out."""
    lines = []
    for line in block.inner_text().splitlines():
        if line.strip():
            lines.append(plain_text(line))
    return lines


def stats_lines(page) -> str:
    """The stats strip: one line per count with its noun, then the line of dates."""
    lines = [plain_text(item) for item in page.locator("#stats li").all_inner_texts()]
    lines.extend(plain_text(dates) for dates in page.locator("#stats .stats-dates").all_inner_texts())
    return "\n".join(lines)


def control_lines(page) -> str:
    """The Traffic Explorer's controls: one line per choice of each drop-down and per period button, each with whether
    it is the one chosen."""
    lines = []
    for field in page.locator(f"{TRAFFIC} .control-field").all():
        name = plain_text(field.locator(".control-field-name").inner_text())
        for option in field.locator("option").all():
            selected = option.evaluate("option => option.selected")
            lines.append(f"{name}: {plain_text(option.inner_text())} | selected={str(selected).lower()}")
        for button in field.locator("button").all():
            lines.append(f"{name}: {plain_text(button.inner_text())} | pressed={button.get_attribute('aria-pressed')}")
    return "\n".join(lines)


def traffic_units(page) -> dict[str, str]:
    """The Traffic Explorer's units as it opens, nothing chosen: its controls, tiles, texts, legend and its chart's
    axes. The bars themselves, a rectangle for each day and series, are left to the tiles and the axes."""
    card = page.locator(TRAFFIC_CARD)
    return {
        "traffic.controls": control_lines(page),
        "traffic.tiles": "\n".join(plain_text(tile) for tile in page.locator(TRAFFIC_TILES).all_inner_texts()),
        "traffic.texts": labelled_texts(card, CARD_TEXTS),
        "traffic.legend": legend_lines(card),
        "traffic.axes": axis_lines(card.locator(CHART)),
    }


def explore_page_units(page) -> dict[str, str]:
    """The Explore page's units outside the Insights: hero, stats strip, Overview cards, Traffic Explorer, cite, team,
    footer."""
    units = {
        "hero": "\n".join(text_lines(page.locator("#hero"))),
        "stats": stats_lines(page),
        "cite": "\n".join(text_lines(page.locator("#cite"))),
        "team": "\n".join(text_lines(page.locator("#team"))),
        "footer": "\n".join(text_lines(page.locator("#site-footer"))),
    }
    units.update(cards_units(page.locator("#mixes > .card"), figure_units))
    units.update(traffic_units(page))
    return units
