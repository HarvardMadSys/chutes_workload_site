"""The answers of the site's queries: every Explore query run once over the site's database, each written as
`all/<folder>/<query>.json`, and the SHA-256 of each such query's text written to `all/queries.json` as
`{"<folder>/<query>": "<hex>"}`, so a query edited since can be found (`stale_queries`).

An answer is a JSON list with one object per row, its keys the query's column
names in the query's order. Integers are written as integers and other numbers
as floats, strings as strings, booleans as booleans and NULL as null.
"""

import dataclasses
import hashlib
import json
import math
import pathlib
import shutil

import duckdb

from site_data import paths, site_database

ANSWERED_PAGES = ["explore"]  # the folders whose queries are answered


@dataclasses.dataclass(frozen=True)
class WrittenAnswers:
    """What the answers folder holds."""

    files: int
    bytes: int


def answered_query_names(queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> list[str]:
    """The name of every query of the answered pages in `queries_folder`, `<page>/<query>`, sorted."""
    names = []
    for page in ANSWERED_PAGES:
        for path in sorted((queries_folder / page).glob("*.sql")):
            names.append(f"{page}/{path.stem}")
    return sorted(names)


def write_answers(connection: duckdb.DuckDBPyConnection, data_directory: pathlib.Path) -> WrittenAnswers:
    """Replace the data folder's answers folder with the answer of every answered query and the hash of every answered
    query's text."""
    answers_directory = data_directory / paths.ANSWERS_FOLDER
    if answers_directory.exists():
        shutil.rmtree(answers_directory)  # a query since removed keeps no answer
    answers_directory.mkdir(parents=True)
    files, size = 0, 0
    for name in answered_query_names():
        path = answers_directory / paths.answer_file_in_folder(name)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(answer_text(answer_rows(connection, name)))
        files += 1
        size += path.stat().st_size
    hashes_text = json.dumps(query_hashes(), indent=1, sort_keys=True) + "\n"
    (answers_directory / paths.QUERY_HASHES_FILE).write_text(hashes_text)
    return WrittenAnswers(files=files, bytes=size)


def query_hashes(queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> dict[str, str]:
    """Each answered query of `queries_folder`, by name, to the SHA-256 of its text as hex."""
    hashes = {}
    for name in answered_query_names(queries_folder):
        hashes[name] = query_text_hash(queries_folder, name)
    return hashes


def stale_queries(data_directory: pathlib.Path,
                  queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> list[str]:
    """The name of each answered query of `queries_folder` whose text's hash is not the one recorded in the data
    folder's `all/queries.json`: edited, or added, since `make data` last wrote the answers."""
    recorded = json.loads((data_directory / paths.ANSWERS_FOLDER / paths.QUERY_HASHES_FILE).read_text())
    stale = []
    for name, current_hash in query_hashes(queries_folder).items():
        if recorded.get(name) != current_hash:
            stale.append(name)
    return stale


def query_text_hash(queries_folder: pathlib.Path, name: str) -> str:
    """The SHA-256, as hex, of the bytes of the query `name`, the file `<queries_folder>/<name>.sql`."""
    return hashlib.sha256((queries_folder / f"{name}.sql").read_bytes()).hexdigest()


def answer_rows(connection: duckdb.DuckDBPyConnection, query_name: str) -> list[dict]:
    """The rows of the query, each a dict from the query's column names, in its order, to the row's JSON values."""
    result = site_database.query_rows(connection, query_name)
    rows = []
    for row in result.rows:
        values = [json_value(value) for value in row]
        rows.append(dict(zip(result.columns, values)))
    return rows


def json_value(value: object) -> object:
    """The value as an answer holds it: a NaN becomes None, every other value is kept."""
    # JSON has no NaN, and a missing number is what a NaN stands for here.
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def answer_text(rows: list[dict]) -> str:
    """The rows as one line of JSON, keys in the rows' order, and a trailing newline."""
    # allow_nan=False: an infinity has no JSON form either, and must stop the step rather than write invalid JSON.
    return json.dumps(rows, separators=paths.JSON_SEPARATORS, allow_nan=False) + "\n"
