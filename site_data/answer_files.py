"""Where the data step writes its answers in the site's data folder, and the JSON form they are written in.

The answers of the queries are at `all/explore/<query>.json`, a family query's at
`all/explore/<query>/<family_slug>.json`, with the hash of each query's text in `all/queries.json`. The answers of the
figures are at `all/figures/<figure>.json`, with each figure's row count in `all/figures.json`.

An answer is a JSON list with one object per row, its keys the column names in their order, on one line with a
trailing newline. Integers are written as integers and other numbers as floats, strings as strings, dates as
`YYYY-MM-DD` strings, lists as arrays, and NULL and NaN as null.
"""

import datetime
import json
import math
import pathlib

ANSWERS_FOLDER = "all"  # the query answers and the figure answers, over the whole trace
ANSWERED_FOLDER = "explore"  # the folder of `site/queries/` whose queries are answered, and of their answers
QUERY_HASHES_FILE = "queries.json"  # in the answers folder: the hash of the text of each query the answers come from
FIGURE_ANSWERS_FOLDER = "figures"  # in the answers folder: one answer per figure, the rows of its plot-ready table
FIGURE_INDEX_FILE = "figures.json"  # in the answers folder: each figure's name and its answer's row count
# Commas and colons without spaces: every byte is fetched by the visitors.
JSON_SEPARATORS = (",", ":")


def answer_path(query_name: str, family_slug: str | None = None) -> str:
    """The path of the answer of the query `query_name` (`explore/<query>`), relative to the data folder:
    `all/explore/<query>.json`, or `all/explore/<query>/<family_slug>.json` for one family of a family query."""
    if family_slug is None:
        return f"{ANSWERS_FOLDER}/{query_name}.json"
    return f"{ANSWERS_FOLDER}/{query_name}/{family_slug}.json"


def figure_answer_path(figure: str) -> str:
    """The path of the answer of the figure `figure`, relative to the data folder: `all/figures/<figure>.json`."""
    return f"{ANSWERS_FOLDER}/{FIGURE_ANSWERS_FOLDER}/{figure}.json"


def json_value(value: object) -> object:
    """The value as an answer holds it: a date becomes its `YYYY-MM-DD` text, a NaN None; every other value is kept."""
    if isinstance(value, datetime.date):
        return value.isoformat()
    # JSON has no NaN, and a missing number is what a NaN stands for here.
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def answer_text(rows: list[dict]) -> str:
    """The rows as one line of JSON, keys in the rows' order, and a trailing newline."""
    # allow_nan=False: an infinity has no JSON form either, and must stop the step rather than write invalid JSON.
    return json.dumps(rows, separators=JSON_SEPARATORS, allow_nan=False) + "\n"


def write_answer(path: pathlib.Path, rows: list[dict]) -> pathlib.Path:
    """Write `rows` as the answer file `path`, making its folder; the path."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(answer_text(rows))
    return path
