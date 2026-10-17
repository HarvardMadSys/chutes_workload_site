"""The site's database: every frame of the artifact is the table of its name, with the calendar, the family models
and the trace table its eight tables, and a query is run from its file."""

import datetime

import duckdb

import test_queries
from site_data import site_database


def test_every_frame_is_the_table_of_its_name(connection: duckdb.DuckDBPyConnection) -> None:
    counts = {}
    for table in ["trace_totals", "daily_rollup", "function_name_daily_requests", "chute_models", "model_families"]:
        counts[table] = connection.table(table).shape[0]
    assert counts == {"trace_totals": 1, "daily_rollup": 7, "function_name_daily_requests": 4, "chute_models": 11,
                      "model_families": 3}


def test_the_database_holds_eight_tables(connection: duckdb.DuckDBPyConnection) -> None:
    tables = {row[0] for row in connection.execute("SELECT name FROM (SHOW TABLES)").fetchall()}
    assert tables == test_queries.SITE_TABLES
    assert len(tables) == 8


def test_the_trace_table_is_registered_as_weekly_histograms(connection: duckdb.DuckDBPyConnection) -> None:
    weekly_histograms = connection.table("weekly_histograms")
    assert weekly_histograms.columns == ["week", "family", "chute_id", "endpoint_group", "metric", "bin", "requests"]
    assert weekly_histograms.shape[0] == 22


def test_the_database_runs_on_one_thread(connection: duckdb.DuckDBPyConnection) -> None:
    assert connection.execute("SELECT current_setting('threads')").fetchone()[0] == site_database.THREADS


def test_the_calendar_runs_to_the_daily_rollup_s_last_day(connection: duckdb.DuckDBPyConnection) -> None:
    calendar = connection.table("trace_calendar").df()
    assert calendar["trace_day"].tolist()[-1].date() == datetime.date(1970, 2, 2)
    assert calendar["month"].tolist()[-1] == 2


def test_the_family_models_are_registered_when_the_database_opens(connection: duckdb.DuckDBPyConnection) -> None:
    family_models = connection.table("family_models").df()
    assert list(family_models.columns) == ["family", "chute_id", "name", "requests", "rank"]
    assert len(family_models) == 4


def test_a_query_s_parameter_is_bound_by_name(connection: duckdb.DuckDBPyConnection) -> None:
    result = site_database.run_query(connection, "explore/daily_by_model", {"family": "gpt-oss"})
    assert [row[result.columns.index("model")] for row in result.rows] == ["gpt-oss-model-03"]
