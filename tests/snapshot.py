"""The snapshot test: what a visitor sees on six states of the site, kept as text in `tests/snapshots/` and compared.

A snapshot is one folder per page state, `tests/snapshots/<state>/`, holding one text file per unit the state shows:
each chart's SVG, or an Insights card's chart's name and tick labels, each legend's entries, each card's texts, the
stats strip. `snapshot_units.py` names the states and says what each file holds. The states are the Explore page
opened at each of its six Insights topics' anchors (`index.html#insights-tokens`), each in a fresh page. A unit that
is the same in every state is written once, with the first state: the Explore page's hero, stats strip, Overview,
Traffic Explorer, cite, team and footer.

    .venv/bin/python tests/snapshot.py           # compare: fails naming each unit that changed (make test)
    .venv/bin/python tests/snapshot.py --write   # rewrite every file (make snapshots)

Each state also checks that the page, opened at a topic, requested no other topic's figure answers.

Regenerate with `make snapshots` when a change is meant to alter a chart or a text, and review the diff of
`tests/snapshots/` like code: it is what a visitor will see differently. A data rebuild changes it too. Compare skips,
saying so, where Chromium is not installed (`make setup-browser`). Plot, from jsDelivr, and the fonts, from Google, are
part of what is compared, so the test needs the network: offline it fails, naming the requests that failed.

The site is served from `site/` by Python's own HTTP server on a free port and opened in headless Chromium, at a fixed
width, locale, time zone and colour scheme, so that every machine writes the same text.
"""

import argparse
import contextlib
import difflib
import functools
import http.server
import pathlib
import re
import shutil
import sys
import threading

import playwright.sync_api

import snapshot_units
from repository_root import ROOT

SITE_FOLDER = ROOT / "site"
SNAPSHOTS_FOLDER = ROOT / "tests" / "snapshots"

VIEWPORT = {"width": 1280, "height": 900}  # a desktop width: each chart is drawn at its card's width, which follows it
LOCALE = "en-US"  # the browser formats numbers and dates in its locale, so it is fixed
TIME_ZONE = "UTC"  # and in its time zone
COLOUR_SCHEME = "light"  # the scheme the pages are read in; colours are recorded as tokens, which both schemes share
DRAW_TIMEOUT_MS = 60_000  # the longest a state may take to draw: a topic fetches its answers, and Plot from the CDN
DIFF_LINES_SHOWN = 12  # the lines of each changed unit's diff printed; `git diff` after `make snapshots` shows the rest
# True once every card of the topic section the argument names has drawn its chart and named it, the last step of a
# card's drawing; a card that shows an error has no named chart, and so is never counted drawn.
TOPIC_CHARTS_DRAWN = """(topic) => {
  const bodies = [...document.querySelectorAll(`#${topic} .figure-body`)];
  return bodies.length > 0 && bodies.every((body) => body.querySelector('svg[role="img"]') !== null);
}"""
# The charts each state draws outside the Insights, by the selector of the section that holds them.
CHART_COUNTS = {"#overview": 2, "#traffic": 1}  # the two donuts; the Traffic Explorer's bars
# True once each section the argument names holds as many drawn charts as it gives: a chart's place holding an SVG
# that the page has named, the last step of every drawing, whole axes and labels included.
CHARTS_DRAWN = """(counts) => Object.entries(counts).every(([section, count]) => {
  const bodies = [...document.querySelectorAll(`${section} .figure-body`)];
  return bodies.length === count && bodies.every((body) => body.querySelector('svg[role="img"]') !== null);
})"""
TILE_VALUE = "#traffic-explorer .traffic-tiles li strong"  # the value of each of the Traffic Explorer's tiles
A_DIGIT = re.compile(r"\d")  # a tile showing a number, not its loading or missing text
MONTH_COUNT = re.compile(r"\d+ months? of")  # the hero's lede and the footer's line, once the totals give the months
FIGURE_ANSWER = re.compile(r"/data/all/figures/(?P<figure>[^/?#]+)\.json$")  # the address of a figure's answer
CARD_FIGURE = "data-figure"  # the attribute of a card's article that names its figure
SKIP_MESSAGE = "snapshots skipped: Chromium could not start ({reason}). `make setup-browser` installs it."


class PageError(Exception):
    """The site could not be read as the snapshots need: a state did not draw, or the browser reported an error (a
    console error, an error a script threw, a request that failed)."""


class QuietRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Python's file server, without its line per request."""

    def log_message(self, message_format, *arguments):
        """Write nothing: the test prints its own report."""


@contextlib.contextmanager
def served_site(folder: pathlib.Path):
    """Serve `folder` on a free port of this machine while the block runs; yield its address."""
    handler = functools.partial(QuietRequestHandler, directory=str(folder))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)  # port 0: the system picks a free one
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()


def record_errors(page, errors: list[str]) -> None:
    """Append to `errors` every error `page` logs in its console, throws, or meets fetching a file, from now on."""
    page.on("console", functools.partial(record_console_error, errors))
    page.on("pageerror", functools.partial(record_thrown_error, errors))
    page.on("requestfailed", functools.partial(record_failed_request, errors))


def record_console_error(errors: list[str], message) -> None:
    """Append a console message to `errors`, with the address it came from, when it is an error."""
    if message.type == "error":
        errors.append(f"console: {message.text} ({message.location['url']})")


def record_thrown_error(errors: list[str], error) -> None:
    """Append an error a script threw to `errors`."""
    errors.append(f"thrown: {error}")


def record_failed_request(errors: list[str], request) -> None:
    """Append a request that got no answer to `errors`, with its address, which names its host."""
    errors.append(f"request failed: {request.url} ({request.failure})")


def answered_figure(address: str) -> str | None:
    """The figure whose answer `address` is, `fig_seasonality` for `.../data/all/figures/fig_seasonality.json`; None
    for any other file."""
    match = FIGURE_ANSWER.search(address)
    return match["figure"] if match else None


def record_figure_answer(requested: list[str], request) -> None:
    """Append to `requested` the figure whose answer `request` asks for, when it asks for one."""
    figure = answered_figure(request.url)
    if figure is not None:
        requested.append(figure)


def topic_figures(page, topic: str) -> set[str]:
    """The figures of the cards of the topic section `topic` (its id), as their articles' `data-figure` name them."""
    figures = set()
    for card in page.locator(f"#{topic} [{CARD_FIGURE}]").all():
        figures.add(card.get_attribute(CARD_FIGURE))
    return figures


def other_topics_answers(page, topic: str, requested: list[str]) -> list[str]:
    """The figures of `requested` that are the cards' of a topic other than `topic`: none, when a topic shown reads
    only its own answers."""
    others = set()
    for other in snapshot_units.EXPLORE_STATES.values():
        if other != topic:
            others |= topic_figures(page, other)
    return sorted(set(requested) & others)


def wait_until_drawn(page, topic: str) -> None:
    """Wait until the topic section `topic` (its id) is the one shown and every unit the state reads has drawn: no
    loading line is visible, the hero and the footer count the months, every chart of the Overview and the Traffic
    Explorer (`CHART_COUNTS`) is drawn and named, every card of the topic has drawn its chart, and the Traffic
    Explorer's first tile shows a number. Nothing is drawn after these, so the state is read once."""
    expect = playwright.sync_api.expect
    expect(page.locator(f"#tab-{topic}")).to_have_attribute("aria-selected", "true", timeout=DRAW_TIMEOUT_MS)
    expect(page.locator(f"#{topic}")).to_be_visible(timeout=DRAW_TIMEOUT_MS)
    expect(page.locator(".loading:visible")).to_have_count(0, timeout=DRAW_TIMEOUT_MS)
    expect(page.locator("#hero .hero-lede")).to_contain_text(MONTH_COUNT, timeout=DRAW_TIMEOUT_MS)
    expect(page.locator("#site-footer")).to_contain_text(MONTH_COUNT, timeout=DRAW_TIMEOUT_MS)
    page.wait_for_function(CHARTS_DRAWN, arg=CHART_COUNTS, timeout=DRAW_TIMEOUT_MS)
    page.wait_for_function(TOPIC_CHARTS_DRAWN, arg=topic, timeout=DRAW_TIMEOUT_MS)
    expect(page.locator(TILE_VALUE).first).to_have_text(A_DIGIT, timeout=DRAW_TIMEOUT_MS)


def read_state(page, address: str, topic: str, with_page_units: bool) -> dict[str, str]:
    """The units of the Explore page opened at the topic `topic` (its anchor), once drawn; with `with_page_units`, also
    the page's units that no topic changes. Raises a PageError when the page requested another topic's answers."""
    requested = []
    page.on("request", functools.partial(record_figure_answer, requested))
    page.goto(f"{address}/index.html#{topic}", wait_until="networkidle")
    wait_until_drawn(page, topic)
    strays = other_topics_answers(page, topic, requested)
    if strays:
        raise PageError(f"opened at #{topic}, the page requested other topics' answers: {', '.join(strays)}")
    units = snapshot_units.topic_units(page, topic)
    if with_page_units:
        page_units = snapshot_units.explore_page_units(page)
        shared = sorted(set(units) & set(page_units))
        if shared:
            raise snapshot_units.SharedTitleError(f"the topic and the page both show {', '.join(shared)}")
        units.update(page_units)
    return units


def read_states(browser, address: str) -> dict[str, dict[str, str]]:
    """Every state's units, `{state: {unit: text}}`, each read in a fresh page of `browser` from the site at
    `address`; the first state also holds the page's units that no topic changes."""
    errors = []
    states = {}
    for state, topic in snapshot_units.EXPLORE_STATES.items():
        page = browser.new_page(viewport=VIEWPORT, locale=LOCALE, timezone_id=TIME_ZONE, color_scheme=COLOUR_SCHEME)
        record_errors(page, errors)
        try:
            states[state] = read_state(page, address, topic, with_page_units=not states)
        except (playwright.sync_api.Error, AssertionError) as error:  # a state that did not draw: say why, with what the browser reported
            raise PageError(f"in the state {state}: {error}\nthe browser reported:\n" + "\n".join(errors)) from error
        except snapshot_units.SharedTitleError as error:
            raise PageError(f"in the state {state}: {error}") from error
        page.close()
    if errors:
        raise PageError("the site reported errors in the browser:\n" + "\n".join(errors))
    return states


def snapshot_files(states: dict[str, dict[str, str]]) -> dict[pathlib.Path, str]:
    """Each unit's file and the text it holds, ending in a newline."""
    files = {}
    for state, units in states.items():
        for unit, text in units.items():
            files[SNAPSHOTS_FOLDER / state / f"{unit}.txt"] = text + "\n"
    return files


def write_snapshots(files: dict[pathlib.Path, str]) -> None:
    """Replace `tests/snapshots/` with `files`, so a unit no longer shown leaves no file behind."""
    if SNAPSHOTS_FOLDER.exists():
        shutil.rmtree(SNAPSHOTS_FOLDER)
    for path, text in files.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)


def diff_excerpt(kept: str, shown: str) -> list[str]:
    """The first lines of a diff from the kept text of a unit to the text the site shows now."""
    diff = list(difflib.unified_diff(kept.splitlines(), shown.splitlines(), lineterm="", n=0))
    without_file_names = diff[2:]  # a unified diff starts with two lines naming its two sides
    return without_file_names[:DIFF_LINES_SHOWN]


def changed_units(files: dict[pathlib.Path, str], folder: pathlib.Path) -> list[str]:
    """A report of every unit whose file in `folder` differs from what the site shows now (`files`): changed, new, or
    no longer shown; each named by its path inside `folder`."""
    report = []
    for path, text in sorted(files.items()):
        name = path.relative_to(folder)
        if not path.exists():
            report.append(f"new: {name}")
            continue
        kept = path.read_text()
        if kept != text:
            report.append(f"changed: {name}\n    " + "\n    ".join(diff_excerpt(kept, text)))
    for path in sorted(folder.rglob("*.txt")):
        if path not in files:
            report.append(f"no longer shown: {path.relative_to(folder)}")
    return report


def compare_snapshots(files: dict[pathlib.Path, str]) -> int:
    """Print every unit that changed and return 1, or say the snapshots are unchanged and return 0."""
    folder_name = SNAPSHOTS_FOLDER.relative_to(ROOT)
    report = changed_units(files, SNAPSHOTS_FOLDER)
    if not report:
        print(f"snapshots unchanged: {len(files)} units in {len(snapshot_units.state_names())} states")
        return 0
    print(f"units that differ from {folder_name}/:")
    for entry in report:
        print(entry)
    print(f"{len(report)} units differ. If the change is meant, run `make snapshots` and review `git diff {folder_name}`.")
    return 1


def parse_arguments(arguments: list[str]) -> argparse.Namespace:
    """The command line's options: `write`, true to rewrite the snapshots rather than compare."""
    parser = argparse.ArgumentParser(description="Compare the site with its snapshots in tests/snapshots/.")
    parser.add_argument("--write", action="store_true", help="rewrite the snapshots instead of comparing")
    return parser.parse_args(arguments)


def main(arguments: list[str]) -> int:
    """Compare the site with its snapshots, or with `--write` rewrite them; the exit code is 1 when a unit changed or
    the site could not be read, 0 when Chromium cannot start and the comparison is skipped."""
    write = parse_arguments(arguments).write
    with served_site(SITE_FOLDER) as address, playwright.sync_api.sync_playwright() as browsers:
        try:
            browser = browsers.chromium.launch()
        except (playwright.sync_api.Error, AssertionError) as error:  # Chromium is not installed, or cannot start on this machine
            if write:
                raise
            print(SKIP_MESSAGE.format(reason=str(error).splitlines()[0]))
            return 0
        try:
            files = snapshot_files(read_states(browser, address))
        except PageError as error:
            print(f"snapshots failed: {error}")
            return 1
        # Leaving the block closes Chromium and stops the server.
    if write:
        write_snapshots(files)
        print(f"snapshots written: {len(files)} files in {SNAPSHOTS_FOLDER.relative_to(ROOT)}/")
        return 0
    return compare_snapshots(files)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
