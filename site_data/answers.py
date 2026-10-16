"""The answers of the site's queries: every Explore query run over the site's database, each written as
`all/explore/<query>.json`, and the SHA-256 of the text of each query an answer depends on written to
`all/queries.json` as `{"<folder>/<query>": "<hex>"}`, so a query edited since can be found (`stale_queries`). An
answer depends on its own query and on the setup queries `setup/top_models` and `setup/family_models`, whose rows the
answers that name a model read.

A family query (`FAMILY_QUERIES`) takes the family as its one parameter, `$family`: it is run once per family of the
by-family answer (`FAMILIES_QUERY`) and written as `all/explore/<query>/<family_slug>.json`, its hash recorded once.

An answer is a JSON list with one object per row, its keys the query's column names in the query's order. Integers
are written as integers and other numbers as floats, strings as strings, dates as `YYYY-MM-DD` strings and NULL as
null.
"""

import dataclasses
import datetime
import hashlib
import json
import math
import pathlib
import shutil

import duckdb

from site_data import paths, site_database

ANSWERED_FOLDERS = ["explore"]  # the folders of `site/queries/` whose queries are answered
FAMILIES_QUERY = "explore/daily_by_family"  # its rows name the families the family queries are run for, with slugs
# The queries run once per family of `FAMILIES_QUERY`'s answer, the family bound as `$family`, each written as
# `<query>/<family_slug>.json`.
FAMILY_QUERIES = ["explore/daily_by_model"]
FAMILY_PARAMETER = "family"  # the name a family query binds the family's name to, `$family` in its text
OTHER_FAMILY = "Other"  # the family of every model in no family of the artifact's table: listed after every other


@dataclasses.dataclass(frozen=True)
class Family:
    """A family of the by-family answer: its `name`, the value a family query binds, and its `slug`, which names its
    answer files."""

    name: str
    slug: str


def answered_query_names(queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> list[str]:
    """The name of every answered query in `queries_folder`, `<folder>/<query>`, sorted: the family queries too."""
    names = []
    for folder in ANSWERED_FOLDERS:
        for path in sorted((queries_folder / folder).glob("*.sql")):
            names.append(f"{folder}/{path.stem}")
    return sorted(names)


def single_answer_query_names(queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> list[str]:
    """The name of every answered query in `queries_folder` that is not a family query, sorted: each has one answer
    file."""
    return [name for name in answered_query_names(queries_folder) if name not in FAMILY_QUERIES]


def hashed_query_names(queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> list[str]:
    """The name of every query the answers depend on: each answered query, and the setup queries of `top_models` and
    `family_models`."""
    return answered_query_names(queries_folder) + [site_database.TOP_MODELS_QUERY, site_database.FAMILY_MODELS_QUERY]


def families(family_rows: list[dict]) -> list[Family]:
    """The families of `family_rows`, the rows of `FAMILIES_QUERY`'s answer, each once: by their requests over the
    rows, most first, then `OTHER_FAMILY`; a tie by name."""
    requests = {}
    for row in family_rows:
        family = Family(name=row["family"], slug=row["family_slug"])
        requests[family] = requests.get(family, 0) + row["requests"]
    return sorted(requests, key=lambda family: (family.name == OTHER_FAMILY, -requests[family], family.name))


def write_answers(connection: duckdb.DuckDBPyConnection, data_directory: pathlib.Path) -> list[pathlib.Path]:
    """Replace the data folder's answers folder with the answer of every answered query, a family query's once per
    family, and the hashes of the queries they depend on; the answer files written: the single answers in the queries'
    order, then each family's, in the families' order."""
    answers_directory = data_directory / paths.ANSWERS_FOLDER
    if answers_directory.exists():
        shutil.rmtree(answers_directory)  # a query since removed keeps no answer
    answers_directory.mkdir(parents=True)
    written = []
    single_answers = {}  # each single answer's rows by its query's name; the families are read from one of them
    for name in single_answer_query_names():
        single_answers[name] = answer_rows(connection, name)
        path = answers_directory / paths.answer_file_in_folder(name)
        written.append(write_answer(path, single_answers[name]))
    for family in families(single_answers[FAMILIES_QUERY]):
        for name in FAMILY_QUERIES:
            path = answers_directory / paths.family_answer_file_in_folder(name, family.slug)
            written.append(write_answer(path, answer_rows(connection, name, {FAMILY_PARAMETER: family.name})))
    hashes_text = json.dumps(query_hashes(), indent=1, sort_keys=True) + "\n"
    (answers_directory / paths.QUERY_HASHES_FILE).write_text(hashes_text)
    return written


def write_answer(path: pathlib.Path, rows: list[dict]) -> pathlib.Path:
    """Write `rows` as the answer file `path`, making its folder; the path."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(answer_text(rows))
    return path


def query_hashes(queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> dict[str, str]:
    """Each query the answers depend on, by name, to the SHA-256 of its text as hex."""
    hashes = {}
    for name in hashed_query_names(queries_folder):
        hashes[name] = query_text_hash(queries_folder, name)
    return hashes


def stale_queries(data_directory: pathlib.Path,
                  queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> list[str]:
    """The name of each query of `queries_folder` the answers depend on whose text's hash is not the one recorded in
    the data folder's `all/queries.json`: edited, or added, since `make data` last wrote the answers."""
    recorded = json.loads((data_directory / paths.ANSWERS_FOLDER / paths.QUERY_HASHES_FILE).read_text())
    stale = []
    for name, current_hash in query_hashes(queries_folder).items():
        if recorded.get(name) != current_hash:
            stale.append(name)
    return stale


def query_text_hash(queries_folder: pathlib.Path, name: str) -> str:
    """The SHA-256, as hex, of the bytes of the query `name`, the file `<queries_folder>/<name>.sql`."""
    return hashlib.sha256((queries_folder / f"{name}.sql").read_bytes()).hexdigest()


def answer_rows(connection: duckdb.DuckDBPyConnection, query_name: str,
                parameters: dict[str, str] | None = None) -> list[dict]:
    """The rows of the query, given `parameters` (as `site_database.run_query` takes them), each a dict from the
    query's column names, in its order, to the row's JSON values."""
    result = site_database.run_query(connection, query_name, parameters)
    rows = []
    for row in result.rows:
        values = [json_value(value) for value in row]
        rows.append(dict(zip(result.columns, values)))
    return rows


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
    return json.dumps(rows, separators=paths.JSON_SEPARATORS, allow_nan=False) + "\n"
