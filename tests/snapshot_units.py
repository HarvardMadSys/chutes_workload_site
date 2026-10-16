"""The states of a snapshot, and the units read from each in the browser: each unit is one block a visitor sees (a
chart, a table, a legend, a block of text), returned as the text written to its file, `<state>/<unit>.txt`.

Text units hold one line per entry, their whitespace collapsed: a card's texts as `label: text`, a legend's entries
as `text | pressed=… | mark`, a table's rows as cells joined by ` | `. Markup units (a chart's SVG) hold the element's
outer HTML with one element per line and Plot's numbered ids made plain, so that `git diff` shows which element
changed. Colours are recorded as the CSS tokens the page names (`var(--series-5)`), so
a series moved to another colour slot is caught; the colour a token holds is the palette tests' job. Every reading
function takes a Playwright page or locator and reads it as it is now; this module imports no Playwright itself.
"""

import re


class SharedTitleError(Exception):
    """Two cards of one state share a title, so their units, which are named by title, would share files."""


# The Explore page's states, each a folder of `tests/snapshots/`, and the Insights topic each shows, by its section id;
# in the order of the topic tabs, the page opening on the first.
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


def table_lines(table) -> str:
    """One line per row of `table`, header first: its cells' texts joined by ` | `."""
    lines = []
    for row in table.locator("tr").all():
        cells = row.locator("th, td").all_inner_texts()
        lines.append(" | ".join(plain_text(cell) for cell in cells))
    return "\n".join(lines)


def figure_units(scope, name: str) -> dict[str, str]:
    """A figure's units under `name`: its texts, and where it has them its legend, its charts and its table."""
    units = {f"{name}.texts": labelled_texts(scope, CARD_TEXTS)}
    legend = legend_lines(scope)
    if legend:
        units[f"{name}.legend"] = legend
    charts = scope.locator(CHART).evaluate_all("charts => charts.map((chart) => chart.outerHTML)")
    if charts:
        units[f"{name}.chart"] = "\n".join(markup_lines(chart) for chart in charts)
    tables = scope.locator(".figure-body table")
    if tables.count() > 0:
        units[f"{name}.table"] = "\n\n".join(table_lines(table) for table in tables.all())
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


def explore_page_units(page) -> dict[str, str]:
    """The Explore page's units outside the Insights: hero, stats strip, Overview cards, cite, team."""
    units = {
        "hero": "\n".join(text_lines(page.locator("#hero"))),
        "stats": stats_lines(page),
        "cite": "\n".join(text_lines(page.locator("#cite"))),
        "team": "\n".join(text_lines(page.locator("#team"))),
    }
    units.update(cards_units(page.locator("#mixes > .card, #trends > .card")))
    return units
