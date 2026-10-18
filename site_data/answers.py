"""The answers of the site's queries: every query of `queries/explore/` run over the site's database, each written as
`all/explore/<query>.json`, and the SHA-256 of the text of each query an answer depends on written to
`all/queries.json` as `{"<folder>/<query>": "<hex>"}`, so a query edited since can be found (`stale_queries`). An
answer depends on its own query and on the setup query `setup/family_models`, whose rows the answers that name a
family's models read.

A family query (`FAMILY_QUERIES`) takes the family as its one parameter, `$family`: it is run once per family of the
by-family answer (`FAMILIES_QUERY`) and written as `all/explore/<query>/<family_slug>.json`, its hash recorded once.
Each answer is written in the JSON form of `answer_files.py`, its keys the query's column names in the query's order.
"""

import dataclasses
import json
import pathlib
import shutil

import duckdb

from site_data import answer_files, site_database

FAMILIES_QUERY = "explore/daily_by_family"  # its rows name the families the family queries are run for, with slugs
# The queries run once per family of `FAMILIES_QUERY`'s answer, the family bound as `$family`, each written as
# `<query>/<family_slug>.json`.
FAMILY_QUERIES = ["explore/daily_by_model", "explore/histograms_by_model"]
FAMILY_PARAMETER = "family"  # the name a family query binds the family's name to, `$family` in its text
OTHER_FAMILY = "Other"  # the family of every model in no family of the artifact's table: listed after every other


@dataclasses.dataclass(frozen=True)
class Family:
    """A family of the by-family answer: its `name`, the value a family query binds, and its `slug`, which names its
    answer files."""

    name: str
    slug: str


def answered_query_names(queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> list[str]:
    """The name of every query of the answered folder in `queries_folder`, `explore/<query>`, sorted: the family
    queries too."""
    names = []
    for path in (queries_folder / answer_files.ANSWERED_FOLDER).glob("*.sql"):
        names.append(f"{answer_files.ANSWERED_FOLDER}/{path.stem}")
    return sorted(names)


def single_answer_query_names(queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> list[str]:
    """The name of every answered query in `queries_folder` that is not a family query, sorted: each has one answer
    file."""
    return [name for name in answered_query_names(queries_folder) if name not in FAMILY_QUERIES]


def hashed_query_names(queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> list[str]:
    """The name of every query the answers depend on: each answered query, and the setup query of `family_models`."""
    return answered_query_names(queries_folder) + [site_database.FAMILY_MODELS_QUERY]


def families(family_rows: list[dict]) -> list[Family]:
    """The families of `family_rows`, the rows of `FAMILIES_QUERY`'s answer, each once: by their requests over the
    rows, most first, then `OTHER_FAMILY`; a tie by name."""
    requests = {}
    for row in family_rows:
        family = Family(name=row["family"], slug=row["family_slug"])
        requests[family] = requests.get(family, 0) + row["requests"]
    return sorted(requests, key=lambda family: (family.name == OTHER_FAMILY, -requests[family], family.name))


def write_answers(connection: duckdb.DuckDBPyConnection, data_directory: pathlib.Path) -> list[pathlib.Path]:
    """Replace the data folder's `all/explore/` and `all/queries.json` with the answer of every answered query, a family
    query's once per family, and the hashes of the queries they depend on, leaving every other file of `all/` as it
    is. Returns the answer files written: the single answers in the queries' order, then each family's, in the
    families' order."""
    answers_directory = data_directory / answer_files.ANSWERS_FOLDER
    if (answers_directory / answer_files.ANSWERED_FOLDER).exists():
        shutil.rmtree(answers_directory / answer_files.ANSWERED_FOLDER)  # a query since removed keeps no answer
    answers_directory.mkdir(parents=True, exist_ok=True)
    written = []
    single_answers = {}  # each single answer's rows by its query's name; the families are read from one of them
    for name in single_answer_query_names():
        single_answers[name] = answer_rows(connection, name)
        path = data_directory / answer_files.answer_path(name)
        written.append(answer_files.write_answer(path, single_answers[name]))
    for family in families(single_answers[FAMILIES_QUERY]):
        for name in FAMILY_QUERIES:
            path = data_directory / answer_files.answer_path(name, family.slug)
            rows = answer_rows(connection, name, {FAMILY_PARAMETER: family.name})
            written.append(answer_files.write_answer(path, rows))
    hashes_text = json.dumps(query_hashes(), indent=1, sort_keys=True) + "\n"
    (answers_directory / answer_files.QUERY_HASHES_FILE).write_text(hashes_text)
    return written


def query_hashes(queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> dict[str, str]:
    """Each query the answers depend on, by name, to the SHA-256 of its text as hex."""
    hashes = {}
    for name in hashed_query_names(queries_folder):
        hashes[name] = site_database.query_text_hash(queries_folder, name)
    return hashes


def stale_queries(data_directory: pathlib.Path,
                  queries_folder: pathlib.Path = site_database.QUERIES_FOLDER) -> list[str]:
    """The name of each query of `queries_folder` the answers depend on whose text's hash is not the one recorded in
    the data folder's `all/queries.json`: edited, or added, since `make data` last wrote the answers."""
    recorded = json.loads((data_directory / answer_files.ANSWERS_FOLDER / answer_files.QUERY_HASHES_FILE).read_text())
    stale = []
    for name, current_hash in query_hashes(queries_folder).items():
        if recorded.get(name) != current_hash:
            stale.append(name)
    return stale


def answer_rows(connection: duckdb.DuckDBPyConnection, query_name: str,
                parameters: dict[str, str] | None = None) -> list[dict]:
    """The rows of the query, given `parameters` (as `site_database.run_query` takes them), each a dict from the
    query's column names, in its order, to the row's JSON values."""
    result = site_database.run_query(connection, query_name, parameters)
    rows = []
    for row in result.rows:
        values = [answer_files.json_value(value) for value in row]
        rows.append(dict(zip(result.columns, values)))
    return rows

