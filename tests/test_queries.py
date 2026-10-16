"""The site's queries over the fixture artifact: each returns exactly its documented columns, reads only the site's
tables, and counts what its definition says."""

import datetime

import duckdb
import pytest

import fixture_artifact
from site_data import site_database

# Each query's columns, in order. A query added under `site/queries/` is added here.
EXPECTED_COLUMNS = {
    "explore/daily_rollup": ["day", "chute_id", "model", "endpoint_group", "requests", "input_tokens", "input_counted",
                             "output_tokens", "output_counted", "ttft_sum", "ttft_counted"],
    "explore/endpoint_mix": ["endpoint_group", "requests"],
    "explore/model_mix": ["model", "requests"],
    "explore/requests_by_month_endpoint": ["month", "calendar_month", "endpoint_group", "requests"],
    "explore/requests_by_month_model": ["month", "calendar_month", "model", "requests"],
    "explore/tokens_by_month_model": ["month", "calendar_month", "model", "tokens"],
    "explore/trace_totals": ["first_day", "last_day", "months", "requests", "input_tokens", "output_tokens", "users",
                             "models", "instances"],
    "setup/top_models": ["chute_id", "name", "rank"],
}
# The tables of the site's database, the only ones a query may read.
SITE_TABLES = {"trace_totals", "daily_rollup", "monthly_requests_tokens_by_model", "function_name_daily_requests",
               "chute_models", "trace_calendar", "top_models"}


def query_names() -> list[str]:
    """The name of every query: each `.sql` file under `site/queries/`, sorted."""
    names = []
    for path in sorted(site_database.QUERIES_FOLDER.rglob("*.sql")):
        names.append(path.relative_to(site_database.QUERIES_FOLDER).with_suffix("").as_posix())
    return names


def query_records(connection: duckdb.DuckDBPyConnection, name: str) -> list[dict]:
    """The query's rows, each a dict from column to value."""
    result = site_database.run_query(connection, name)
    records = []
    for row in result.rows:
        records.append(dict(zip(result.columns, row)))
    return records


def test_every_query_has_its_columns_listed() -> None:
    assert query_names() == sorted(EXPECTED_COLUMNS)


@pytest.mark.parametrize("name", sorted(EXPECTED_COLUMNS))
def test_a_query_returns_its_columns_and_rows(connection: duckdb.DuckDBPyConnection, name: str) -> None:
    result = site_database.run_query(connection, name)
    assert result.columns == EXPECTED_COLUMNS[name]
    assert result.rows, f"{name} has no rows over the fixture"


@pytest.mark.parametrize("name", sorted(EXPECTED_COLUMNS))
def test_a_query_reads_only_the_site_s_tables(name: str) -> None:
    named_tables = duckdb.get_table_names(site_database.statement_text(name))
    assert named_tables <= SITE_TABLES, f"{name} reads {sorted(named_tables - SITE_TABLES)}"


def test_the_table_check_sees_every_table_a_query_names() -> None:
    text = "WITH counted AS (SELECT requests.id FROM requests JOIN sessions ON true) SELECT * FROM counted"
    assert duckdb.get_table_names(text) == {"requests", "sessions"}


def test_the_named_models_are_ranked_by_their_requests(connection: duckdb.DuckDBPyConnection) -> None:
    top_models = query_records(connection, "setup/top_models")
    assert [model["chute_id"] for model in top_models[:3]] == ["chute-01", "chute-02", "chute-03"]
    # The unnamed model and the idle one are not ranked.
    assert [model["rank"] for model in top_models] == list(range(1, 11))


def test_the_totals_span_the_trace_in_calendar_days(connection: duckdb.DuckDBPyConnection) -> None:
    [totals] = query_records(connection, "explore/trace_totals")
    assert totals["first_day"] == datetime.date(2025, 4, 11)
    assert totals["last_day"] == datetime.date(2025, 5, 13)
    assert totals["months"] == 2
    assert totals["requests"] == fixture_artifact.TOTAL_REQUESTS


def test_the_model_mix_is_the_eight_then_every_other_model(connection: duckdb.DuckDBPyConnection) -> None:
    mix = query_records(connection, "explore/model_mix")
    assert [row["model"] for row in mix] == ["model-01", "model-02", "model-03", "model-04", "model-05", "model-06",
                                             "model-07", "model-08", "Other"]
    assert mix[0]["requests"] == 105  # 100 in the first month, 5 in the second
    assert mix[-1]["requests"] == 20 + 10 + 3 + 7  # the ninth and tenth named models, and the unnamed one


def test_other_comes_last_in_a_month_whatever_its_requests(connection: duckdb.DuckDBPyConnection) -> None:
    second_month = []
    for row in query_records(connection, "explore/requests_by_month_model"):
        if row["month"] == 2:
            second_month.append((row["calendar_month"], row["model"], row["requests"]))
    assert second_month == [("2025-05", "model-01", 5), ("2025-05", "Other", 7)]


def test_the_endpoint_trend_counts_each_month_s_requests(connection: duckdb.DuckDBPyConnection) -> None:
    trend = query_records(connection, "explore/requests_by_month_endpoint")
    assert [(row["month"], row["endpoint_group"], row["requests"]) for row in trend] == [
        (1, "chat", 85), (1, "chat_stream", 40), (2, "completion", 15)]


def test_the_daily_rollup_names_the_twenty_and_counts_every_request(connection: duckdb.DuckDBPyConnection) -> None:
    rollup = query_records(connection, "explore/daily_rollup")
    assert sum(row["requests"] for row in rollup) == fixture_artifact.TOTAL_REQUESTS
    others = [row for row in rollup if row["model"] == "Other"]
    assert [(row["day"], row["chute_id"], row["requests"]) for row in others] == [
        (datetime.date(2025, 4, 12), None, 25)]
    assert rollup[-1]["day"] == datetime.date(2025, 5, 13)
    assert rollup[1]["ttft_sum"] is None and rollup[1]["ttft_counted"] == 0
