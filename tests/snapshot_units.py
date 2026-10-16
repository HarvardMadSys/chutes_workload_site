"""The states of a snapshot, and the units read from each in the browser: each unit is one block a visitor sees (a
chart, a legend, a block of text, a card's images), returned as the text written to its file, `<state>/<unit>.txt`.

Text units hold one line per entry, whitespace collapsed: a card's texts as `label: text`, a legend's entries as `text
| pressed=… | mark`, an image as `src | width=… | height=…`, a control's choice as `field: choice | selected=…`, an axis
as `x-axis: label | label …`. A chart's SVG is written one element per line with Plot's numbered ids made plain, so
`git diff` shows which element changed. Colours are recorded as the CSS tokens the page names (`var(--series-5)`), so a
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

# The texts of a figure card, in the order they are written: a label and its selector.
CARD_TEXTS = (
    ("title", ".figure-title"),
    ("insight", ".figure-insight"),
    ("caption", ".figure-caption"),
    ("definition", ".figure-definition-text"),
    ("rows", ".figure-rows"),
)

LEGEND_ENTRIES = ".legend-button"  # every entry of a legend, in the order shown: a series button of a figure
LEGEND_MARK = ".legend-swatch"  # the colour mark inside a legend entry

# A chart is an SVG element drawn in a figure's body that is not inside another SVG.
CHART = ".figure-body svg:not(svg svg)"

FIGURE_IMAGES = ".figure-body img"  # an Insights card's figure image, and its legend image where it has one

# A chart's tick labels along one axis: Plot labels the group "x-axis tick label" or "y-axis tick label".
AXIS_TICK_LABELS = 'g[aria-label$="axis tick label"]'

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


def image_lines(scope) -> str:
    """One line per figure image inside `scope`: its source and the width and height it is shown at."""
    lines = []
    for image in scope.locator(FIGURE_IMAGES).all():
        width = image.get_attribute("width")
        height = image.get_attribute("height")
        lines.append(f"{image.get_attribute('src')} | width={width} | height={height}")
    return "\n".join(lines)


def axis_lines(scope) -> str:
    """One line per chart axis inside `scope`: its name, "x-axis" or "y-axis", and its tick labels in order."""
    lines = []
    for axis in scope.locator(AXIS_TICK_LABELS).all():
        name = axis.get_attribute("aria-label").removesuffix(" tick label")
        labels = [plain_text(label) for label in axis.locator("text").all_text_contents()]
        lines.append(f"{name}: " + " | ".join(labels))
    return "\n".join(lines)


def figure_units(scope, name: str) -> dict[str, str]:
    """A figure's units under `name`: its texts, and where it has them its legend, its charts and its images."""
    units = {f"{name}.texts": labelled_texts(scope, CARD_TEXTS)}
    legend = legend_lines(scope)
    if legend:
        units[f"{name}.legend"] = legend
    charts = scope.locator(CHART).evaluate_all("charts => charts.map((chart) => chart.outerHTML)")
    if charts:
        units[f"{name}.chart"] = "\n".join(markup_lines(chart) for chart in charts)
    images = image_lines(scope)
    if images:
        units[f"{name}.images"] = images
    return units


def cards_units(cards) -> dict[str, str]:
    """The units of every card `cards` matches, each card's under its title's name; two cards may not share a title."""
    units = {}
    for card in cards.all():
        title = card.locator(".figure-title").inner_text()
        name = unit_name(title)
        if f"{name}.texts" in units:
            raise SharedTitleError(f"two cards are titled {title!r}; their units would share files")
        units.update(figure_units(card, name))
    return units


def topic_units(page, topic: str) -> dict[str, str]:
    """The units of the Insights' topic section `topic` (its id): the tabs and its heading, then every card of it."""
    tabs = []
    for tab in page.locator("#topic-tabs [role=tab]").all():
        tabs.append(f"tab: {plain_text(tab.inner_text())} | selected={tab.get_attribute('aria-selected')}")
    section = page.locator(f"#{topic}")
    heading = labelled_texts(section, (("heading", "h2"), ("takeaway", ".topic-takeaway")))
    units = {"topic.texts": "\n".join(tabs) + "\n" + heading}
    units.update(cards_units(section.locator(".card-grid > .card")))
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
    units.update(cards_units(page.locator("#mixes > .card, #trends > .card")))
    units.update(traffic_units(page))
    return units
