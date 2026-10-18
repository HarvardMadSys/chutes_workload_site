"""The Traffic Explorer's snapshot units, read from the page as it opens, nothing chosen: its controls, its
tiles' texts with their notes, its bars' texts and legend, its bars' axes, its day range and its three distribution
charts. Each is the text written to its file, as `snapshot_units.py` writes the page's other units: a control's choice
as `field: choice | selected=…`, a handle of the day range as `name: day | value=… | max=…`, a distribution chart as
an Insights card's chart. Every reading function takes a Playwright page and reads it as it is now.
"""

from snapshot_units import (
    CARD_TEXTS, CHART, NAMED_CHART, axis_lines, figure_chart_lines, labelled_texts, legend_lines, plain_text, unit_name,
)

TRAFFIC = "#traffic-explorer"  # the Traffic Explorer: its controls, then its card of tiles, bars, range and charts
TRAFFIC_BARS = "#traffic-explorer .traffic-bars"  # the bars' figure, with their legend
TRAFFIC_TILE_TEXTS = "#traffic-explorer .traffic-tiles li"  # each tile's value, label and notes
# the three distribution charts under the day range, in order
TRAFFIC_DISTRIBUTION_CHARTS = "#traffic-explorer .traffic-distributions .distribution-chart"
TRAFFIC_RANGE_INPUTS = "#traffic-explorer .traffic-range .range-track input"  # the From and To handles, in order
TRAFFIC_RANGE_DAYS = "#traffic-explorer .traffic-range .range-day"  # the From and To days under the track's ends


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


def distribution_chart_units(page) -> dict[str, str]:
    """The Traffic Explorer's three distribution charts, each read as an Insights card's chart is
    (`figure_chart_lines`: its accessible name, its axes and its axis titles) under `traffic.<its accessible name, as a
    file name>.chart`."""
    units = {}
    for chart in page.locator(TRAFFIC_DISTRIBUTION_CHARTS).all():
        name = unit_name(chart.locator(NAMED_CHART).get_attribute("aria-label"))
        units[f"traffic.{name}.chart"] = figure_chart_lines(chart)
    return units


def traffic_units(page) -> dict[str, str]:
    """The Traffic Explorer's units as it opens, nothing chosen: its controls, tiles' texts (their notes the
    percentiles), the bars' texts, legend and axes, its day range and its distribution charts. The bars themselves, a
    rectangle for each day and series, are left to the tiles and the axes, and the charts' lines to the charts' axes."""
    bars = page.locator(TRAFFIC_BARS)
    units = {
        "traffic.controls": control_lines(page),
        "traffic.tiles": "\n".join(plain_text(tile) for tile in page.locator(TRAFFIC_TILE_TEXTS).all_inner_texts()),
        "traffic.texts": labelled_texts(bars, CARD_TEXTS),
        "traffic.legend": legend_lines(bars),
        "traffic.axes": axis_lines(bars.locator(CHART)),
        "traffic.range": range_lines(page),
    }
    units.update(distribution_chart_units(page))
    return units
