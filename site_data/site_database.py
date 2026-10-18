"""The site's database in DuckDB over the artifact's tables and the trace table in memory, in which `make data` and the
tests run the site's queries.

It is opened by registering (`register_tables`) each Arrow table of `loading.ArtifactTables` under its name:
`trace_totals`, `daily_rollup`, `function_name_daily_requests`, `chute_models` and `model_families`, and the calendar
of `months.trace_calendar` as `trace_calendar`, to the daily rollup's last day. Then the setup query
`setup/family_models` ranks the daily rollup's named models within their family, and its rows are registered as
`family_models`, the one definition of a family's models. Last, the trace table (`loading.load_trace_table`) is
registered as `weekly_histograms`: eight tables in all. The trace table's builder (`tables.py`) registers the first
seven in a connection of its own, as it builds the eighth. A query's name is its path under `site/queries/` without
`.sql`; `run_query` gives its result as `QueryRows`, a query that takes a parameter (`$family`) being given its value
by name.
"""

import dataclasses
import hashlib
import pathlib

import duckdb
import pyarrow
import pyarrow.compute

from site_data import loading, months

QUERIES_FOLDER = pathlib.Path(__file__).resolve().parent.parent / "site" / "queries"
# One thread, so that a sum of floats adds its rows in the same order on every run and a rebuilt answer is the same to
# the last bit.
THREADS = 1
FAMILY_MODELS_QUERY = "setup/family_models"  # its rows are the table `family_models`, registered on opening


@dataclasses.dataclass(frozen=True)
class QueryRows:
    """A query's result: its column names, and each row's values in their order."""

    columns: list[str]
    rows: list[list]


def statement_text(name: str) -> str:
    """The text of the statement `name`: the file `site/queries/<name>.sql`."""
    return (QUERIES_FOLDER / f"{name}.sql").read_text()


def query_text_hash(queries_folder: pathlib.Path, name: str) -> str:
    """The SHA-256, as hex, of the bytes of the query `name`, the file `<queries_folder>/<name>.sql`."""
    return hashlib.sha256((queries_folder / f"{name}.sql").read_bytes()).hexdigest()


def open_database(tables: loading.ArtifactTables, weekly_histograms: pyarrow.Table) -> duckdb.DuckDBPyConnection:
    """A new in-memory database on `THREADS` threads holding the site's eight tables: the seven of `register_tables`
    over `tables`, and the trace table `weekly_histograms` as the table of its name."""
    connection = duckdb.connect(config={"threads": THREADS})
    register_tables(connection, tables)
    connection.register("weekly_histograms", weekly_histograms)
    return connection


def register_tables(connection: duckdb.DuckDBPyConnection, tables: loading.ArtifactTables) -> None:
    """Register in `connection` each of the artifact's tables under its name, the trace calendar to the last day of
    the daily rollup, and the rows of `FAMILY_MODELS_QUERY` as `family_models`."""
    connection.register("trace_totals", tables.trace_totals)
    connection.register("daily_rollup", tables.daily_rollup)
    connection.register("function_name_daily_requests", tables.function_name_daily_requests)
    connection.register("chute_models", tables.chute_models)
    connection.register("model_families", tables.model_families)
    last_trace_day = pyarrow.compute.max(tables.daily_rollup["day"]).as_py().date()
    connection.register("trace_calendar", months.trace_calendar(last_trace_day))
    # A whole Arrow table: `.arrow()` gives a stream, which the second query that joins `family_models` finds empty.
    family_models = connection.execute(statement_text(FAMILY_MODELS_QUERY)).to_arrow_table()
    connection.register("family_models", family_models)


def run_query(connection: duckdb.DuckDBPyConnection, name: str, parameters: dict[str, str] | None = None) -> QueryRows:
    """The rows of the query `name`, its columns and each row's values in their order; `parameters` gives the value
    of each parameter the query names (`{"family": "DeepSeek"}` for `$family`), bound by DuckDB, never written into
    the text."""
    result = connection.execute(statement_text(name), parameters)
    columns = [column[0] for column in result.description]
    return QueryRows(columns=columns, rows=[list(row) for row in result.fetchall()])
