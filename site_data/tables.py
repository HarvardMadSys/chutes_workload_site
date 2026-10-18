"""Build the trace table: `python -m site_data.tables --trace <parquet> --artifact <dir> --out <dir>`.

The trace table is the answer of the query `trace/weekly_histograms` over the released trace, held as the view
`trace`, and the site's tables over the artifact, of which it reads `chute_models`, `model_families` and
`family_models`: one row per trace week, family, kept model, endpoint group, metric and bin, with the requests in the
bin (the query states each column's definition). The query is given the week as `months.py` defines it, its first
day and length bound by name (`TRACE_QUERY_PARAMETERS`). The builder writes it into the out folder as
`weekly_histograms.parquet`, its rows in the query's order, and beside it the sidecar `weekly_histograms.json`,
`{"query": <the SHA-256 of the query's text, as hex>, "rows": <the table's rows>, "trace_rows": <the trace's rows>}`,
by which `make test` tells a query edited since the table was built. It prints each file with its size, the rows and
the time taken. A missing trace or artifact file stops the run with its message and exit status 1, before anything is
written.

The table is built once from the trace, which is too large to read on every `make data`, and tracked; it is rebuilt
when the family table, the daily rollup's kept models, the query, or the week of `months.py` (its epoch or its length)
change. The sidecar hashes the query's text alone, not the two parameters, so after a change to the week only the
check of the table against the artifact's rollup, with `ARTIFACT`, finds a table not rebuilt.
"""

import argparse
import json
import pathlib
import time

import duckdb
import pyarrow
import pyarrow.parquet

from site_data import loading, months, site_database

QUERY = "trace/weekly_histograms"  # the trace table's query, the one query over the trace
TRACE_VIEW = "trace"  # the name the query reads the trace by
# The values the query's parameters are bound to by name: the day its weeks count from, `$trace_epoch`, and the days
# in a week, `$days_per_trace_week`.
TRACE_QUERY_PARAMETERS = {"trace_epoch": months.TRACE_EPOCH, "days_per_trace_week": months.DAYS_PER_TRACE_WEEK}


def main(arguments: list[str] | None = None) -> None:
    """Read the trace and the artifact named on the command line and write the trace table and its sidecar."""
    options = parsed_arguments(arguments)
    trace_path = loading.required_file(options.trace, loading.TRACE_HINT)
    artifact_tables = loading.load_artifact(options.artifact)
    started = time.monotonic()
    connection = open_trace_database(artifact_tables, trace_path)
    table = histogram_table(connection)
    trace_rows = connection.view(TRACE_VIEW).shape[0]
    written = write_table(table, trace_rows, options.out)
    for path in written:
        print(f"{path}  {path.stat().st_size:,} bytes")
    print(f"{table.num_rows:,} rows from {trace_rows:,} trace rows in {time.monotonic() - started:.0f} s")


def parsed_arguments(arguments: list[str] | None) -> argparse.Namespace:
    """The trace file, the artifact folder and the out folder named on the command line."""
    parser = argparse.ArgumentParser(prog="python -m site_data.tables", description="Build the trace table.")
    parser.add_argument("--trace", type=pathlib.Path, required=True, help="the released trace's Parquet file")
    parser.add_argument("--artifact", type=pathlib.Path, required=True,
                        help="a checkout of the paper's artifact repository")
    parser.add_argument("--out", type=pathlib.Path, required=True, help="the tables folder to write")
    return parser.parse_args(arguments)


def open_trace_database(artifact_tables: loading.ArtifactTables,
                        trace_path: pathlib.Path) -> duckdb.DuckDBPyConnection:
    """A new in-memory database on DuckDB's default threads holding the site's tables over `artifact_tables`
    (`site_database.register_tables`) and the Parquet file `trace_path` as the view `TRACE_VIEW`."""
    # Every thread, not the answers' one: the table's sums are integer counts, the same in any order, and the query
    # sorts its rows.
    connection = duckdb.connect()
    site_database.register_tables(connection, artifact_tables)
    connection.read_parquet(str(trace_path)).create_view(TRACE_VIEW)
    return connection


def histogram_table(connection: duckdb.DuckDBPyConnection) -> pyarrow.Table:
    """The rows of `QUERY` over the trace, given `TRACE_QUERY_PARAMETERS`, in its columns and order."""
    return connection.execute(site_database.statement_text(QUERY), TRACE_QUERY_PARAMETERS).to_arrow_table()


def write_table(table: pyarrow.Table, trace_rows: int, folder: pathlib.Path) -> list[pathlib.Path]:
    """Write `table` as the trace table into `folder`, making it, and its sidecar beside it. Returns the two files."""
    folder.mkdir(parents=True, exist_ok=True)
    table_path = folder / loading.TRACE_TABLE_FILE
    pyarrow.parquet.write_table(table, table_path)
    sidecar_path = folder / loading.TRACE_TABLE_SIDECAR_FILE
    sidecar_path.write_text(sidecar_text(table.num_rows, trace_rows))
    return [table_path, sidecar_path]


def sidecar_text(table_rows: int, trace_rows: int) -> str:
    """The sidecar of a trace table of `table_rows` rows built from `trace_rows` trace rows by the current query, as
    `answers.py` writes the queries' hashes: indented JSON, keys sorted, and a trailing newline."""
    sidecar = {
        "query": site_database.query_text_hash(site_database.QUERIES_FOLDER, QUERY),
        "rows": table_rows,
        "trace_rows": trace_rows,
    }
    return json.dumps(sidecar, indent=1, sort_keys=True) + "\n"


if __name__ == "__main__":
    main()
