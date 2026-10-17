"""The Traffic Explorer's snapshot units, read from the Explore page as it opens, nothing chosen: its controls, its
tiles, its card's texts and legend, its chart's axes and its day range. Each is the text written to its file, as
`snapshot_units.py` writes the page's other units: a control's choice as `field: choice | selected=…`, a slider as
`name: day | value=… | max=…`. Every reading function takes a Playwright page and reads it as it is now.
"""

from snapshot_units import CARD_TEXTS, CHART, axis_lines, labelled_texts, legend_lines, plain_text

TRAFFIC = "#traffic-explorer"  # the Traffic Explorer: its controls, then its card of tiles, legend, bars and range
TRAFFIC_CARD = "#traffic-explorer .traffic-card"
TRAFFIC_TILES = "#traffic-explorer .traffic-tiles li"
TRAFFIC_RANGE_FIELDS = "#traffic-explorer .traffic-range .range-field"  # the From and To sliders, each in its field


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
    """The Traffic Explorer's day range: one line per slider, its name, the day it writes beside it, its value (the
    day's index among the trace's days) and its largest value."""
    lines = []
    for field in page.locator(TRAFFIC_RANGE_FIELDS).all():
        name = plain_text(field.locator(".control-field-name").inner_text())
        day = plain_text(field.locator(".range-day").inner_text())
        slider = field.locator("input")
        lines.append(f"{name}: {day} | value={slider.input_value()} | max={slider.get_attribute('max')}")
    return "\n".join(lines)


def traffic_units(page) -> dict[str, str]:
    """The Traffic Explorer's units as it opens, nothing chosen: its controls, tiles, texts, legend, its chart's axes
    and its day range. The bars themselves, a rectangle for each day and series, are left to the tiles and the axes."""
    card = page.locator(TRAFFIC_CARD)
    return {
        "traffic.controls": control_lines(page),
        "traffic.tiles": "\n".join(plain_text(tile) for tile in page.locator(TRAFFIC_TILES).all_inner_texts()),
        "traffic.texts": labelled_texts(card, CARD_TEXTS),
        "traffic.legend": legend_lines(card),
        "traffic.axes": axis_lines(card.locator(CHART)),
        "traffic.range": range_lines(page),
    }
