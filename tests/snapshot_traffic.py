"""The Traffic Explorer's snapshot units, read from the Explore page as it opens, nothing chosen: its controls, its
tiles with their notes, its bars' texts and legend, its bars' axes, its day range and its three distribution cards.
Each is the text written to its file, as `snapshot_units.py` writes the page's other units: a control's choice as
`field: choice | selected=…`, a handle of the day range as `name: day | value=… | max=…`, a distribution card as an
Insights card. Every reading function takes a Playwright page and reads it as it is now.
"""

from snapshot_units import (
    CARD_TEXTS, CHART, axis_lines, figure_card_units, labelled_texts, legend_lines, plain_text, unit_name,
)

TRAFFIC = "#traffic-explorer"  # the Traffic Explorer: its controls, then its card of tiles, bars, range and cards
TRAFFIC_BARS = "#traffic-explorer .traffic-bars"  # the bars' figure, with their legend
TRAFFIC_TILES = "#traffic-explorer .traffic-tiles li"
TRAFFIC_RANGE_INPUTS = "#traffic-explorer .traffic-range .range-track input"  # the From and To handles, in order
TRAFFIC_RANGE_DAYS = "#traffic-explorer .traffic-range .range-day"  # the From and To days under the track's ends
TRAFFIC_DISTRIBUTIONS = "#traffic-explorer .distribution-card"  # the three distribution cards, in their order


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


def range_lines(page) -> str:
    """The Traffic Explorer's day range: one line per handle, From then To, its name for a screen reader, the day
    written under its end of the track, its value (the day's index among the trace's days) and its largest value."""
    lines = []
    days = page.locator(TRAFFIC_RANGE_DAYS).all_inner_texts()
    for handle, day in zip(page.locator(TRAFFIC_RANGE_INPUTS).all(), days, strict=True):
        name = handle.get_attribute("aria-label")
        lines.append(f"{name}: {plain_text(day)} | value={handle.input_value()} | max={handle.get_attribute('max')}")
    return "\n".join(lines)


def distribution_units(page) -> dict[str, str]:
    """The Traffic Explorer's distribution cards, each read as an Insights card is (`figure_card_units`: its texts and
    its chart's name, axes and axis titles; it has no legend of its own) under `traffic.<its title's name>`."""
    units = {}
    for card in page.locator(TRAFFIC_DISTRIBUTIONS).all():
        name = unit_name(card.locator(".figure-title").inner_text())
        units.update(figure_card_units(card, f"traffic.{name}"))
    return units


def traffic_units(page) -> dict[str, str]:
    """The Traffic Explorer's units as it opens, nothing chosen: its controls, tiles (their notes the percentiles), the
    bars' texts, legend and axes, its day range and its distribution cards. The bars themselves, a rectangle for each
    day and series, are left to the tiles and the axes, and the cards' lines to the cards' axes."""
    bars = page.locator(TRAFFIC_BARS)
    units = {
        "traffic.controls": control_lines(page),
        "traffic.tiles": "\n".join(plain_text(tile) for tile in page.locator(TRAFFIC_TILES).all_inner_texts()),
        "traffic.texts": labelled_texts(bars, CARD_TEXTS),
        "traffic.legend": legend_lines(bars),
        "traffic.axes": axis_lines(bars.locator(CHART)),
        "traffic.range": range_lines(page),
    }
    units.update(distribution_units(page))
    return units
