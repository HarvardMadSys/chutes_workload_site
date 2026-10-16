"""The site's database: every frame of the artifact is the table of its name, and a query is run from its file."""

import duckdb

from site_data import site_database


def test_every_frame_is_the_table_of_its_name(connection: duckdb.DuckDBPyConnection) -> None:
    counts = {}
    for table in ["trace_totals", "daily_rollup", "monthly_requests_tokens_by_model", "function_name_daily_requests",
                  "chute_models"]:
        counts[table] = connection.table(table).shape[0]
    assert counts == {"trace_totals": 1, "daily_rollup": 4, "monthly_requests_tokens_by_model": 13,
                      "function_name_daily_requests": 4, "chute_models": 11}


def test_the_database_runs_on_one_thread(connection: duckdb.DuckDBPyConnection) -> None:
    assert connection.execute("SELECT current_setting('threads')").fetchone()[0] == site_database.THREADS
