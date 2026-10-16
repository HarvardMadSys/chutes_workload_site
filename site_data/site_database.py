"""The site's database in DuckDB over the artifact's frames in memory, in which `make data` and the tests run the site's
queries.

It is opened by registering each frame of `loading.ArtifactFrames` as the table of its name: `trace_totals`,
`daily_rollup`, `monthly_requests_tokens_by_model`, `function_name_daily_requests` and `chute_models`. A query's
name is its path under `site/queries/` without `.sql`; `run_query` gives its result as `QueryRows`.
"""

import dataclasses
import pathlib

import duckdb

from site_data import loading

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


def open_database(frames: loading.ArtifactFrames) -> duckdb.DuckDBPyConnection:
    """A new in-memory database on `THREADS` threads, each of the artifact's frames the table of its name."""
    connection = duckdb.connect(config={"threads": THREADS})
    connection.register("trace_totals", frames.trace_totals)
    connection.register("daily_rollup", frames.daily_rollup)
    connection.register("monthly_requests_tokens_by_model", frames.monthly_requests_tokens_by_model)
    connection.register("function_name_daily_requests", frames.function_name_daily_requests)
    connection.register("chute_models", frames.chute_models)
    return connection


def run_query(connection: duckdb.DuckDBPyConnection, name: str) -> QueryRows:
    """The rows of the query `name`, its columns and each row's values in their order."""
    result = connection.execute(statement_text(name))
    columns = [column[0] for column in result.description]
    return QueryRows(columns=columns, rows=[list(row) for row in result.fetchall()])
