"""The site's database in DuckDB over the site's frames in memory, in which `make data` and the tests run the site's
queries.

It is opened by registering each frame as the table of its name. A query's name is its path under `site/queries/`
without `.sql`.
"""

import dataclasses
import pathlib

import duckdb
import pandas

QUERIES_FOLDER = pathlib.Path(__file__).resolve().parent.parent / "site" / "queries"
# One thread, so that a sum of floats adds its rows in the same order on every run and a rebuilt answer is the same to
# the last bit.
THREADS = 1


@dataclasses.dataclass(frozen=True)
class QueryRows:
    """A query's result: its column names, and each row's values in their order."""

    columns: list[str]
    rows: list[list]


def statement_text(name: str) -> str:
    """The text of the statement `name`: the file `site/queries/<name>.sql`."""
    return (QUERIES_FOLDER / f"{name}.sql").read_text()


def open_site_database(frames: dict[str, pandas.DataFrame]) -> duckdb.DuckDBPyConnection:
    """A new in-memory database on `THREADS` threads, each frame of `frames` the table of its name."""
    connection = duckdb.connect(config={"threads": THREADS})
    for table, frame in frames.items():
        connection.register(table, frame)
    return connection


def query_rows(connection: duckdb.DuckDBPyConnection, name: str) -> QueryRows:
    """The rows of the query `name`, its columns and each row's values in their order."""
    result = connection.execute(statement_text(name))
    columns = [column[0] for column in result.description]
    return QueryRows(columns=columns, rows=[list(row) for row in result.fetchall()])
