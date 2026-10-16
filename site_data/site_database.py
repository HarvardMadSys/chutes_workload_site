"""The site's database in DuckDB over the artifact's frames in memory, in which `make data` and the tests run the site's
queries.

It is opened by registering each frame of `loading.ArtifactFrames` as the table of its name: `trace_totals`,
`daily_rollup`, `monthly_requests_tokens_by_model`, `function_name_daily_requests` and `chute_models`, and the
calendar of `months.trace_calendar` as `trace_calendar`, to the daily rollup's last day. Then the setup query
`setup/top_models` ranks the named models by their requests, and its rows are registered as `top_models`, the one
definition of the most requested models every answer that names a model reads. A query's name is its path under
`site/queries/` without `.sql`; `run_query` gives its result as `QueryRows`.
"""

import dataclasses
import pathlib

import duckdb

from site_data import loading, months

QUERIES_FOLDER = pathlib.Path(__file__).resolve().parent.parent / "site" / "queries"
# One thread, so that a sum of floats adds its rows in the same order on every run and a rebuilt answer is the same to
# the last bit.
THREADS = 1
TOP_MODELS_QUERY = "setup/top_models"  # its rows are the table `top_models`, registered when the database opens


@dataclasses.dataclass(frozen=True)
class QueryRows:
    """A query's result: its column names, and each row's values in their order."""

    columns: list[str]
    rows: list[list]


def statement_text(name: str) -> str:
    """The text of the statement `name`: the file `site/queries/<name>.sql`."""
    return (QUERIES_FOLDER / f"{name}.sql").read_text()


def open_database(frames: loading.ArtifactFrames) -> duckdb.DuckDBPyConnection:
    """A new in-memory database on `THREADS` threads, each of the artifact's frames the table of its name, the
    trace calendar to the last day of the daily rollup, and the rows of `TOP_MODELS_QUERY` as `top_models`."""
    connection = duckdb.connect(config={"threads": THREADS})
    connection.register("trace_totals", frames.trace_totals)
    connection.register("daily_rollup", frames.daily_rollup)
    connection.register("monthly_requests_tokens_by_model", frames.monthly_requests_tokens_by_model)
    connection.register("function_name_daily_requests", frames.function_name_daily_requests)
    connection.register("chute_models", frames.chute_models)
    last_trace_day = frames.daily_rollup["day"].max().date()
    connection.register("trace_calendar", months.trace_calendar(last_trace_day))
    connection.register("top_models", connection.execute(statement_text(TOP_MODELS_QUERY)).df())
    return connection


def run_query(connection: duckdb.DuckDBPyConnection, name: str) -> QueryRows:
    """The rows of the query `name`, its columns and each row's values in their order."""
    result = connection.execute(statement_text(name))
    columns = [column[0] for column in result.description]
    return QueryRows(columns=columns, rows=[list(row) for row in result.fetchall()])
