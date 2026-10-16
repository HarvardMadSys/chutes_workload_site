"""The site's queries over the fixture artifact: each returns exactly its documented columns, reads only the site's
tables, and counts what its definition says."""

import datetime
import re

import duckdb
import pytest

import fixture_artifact
from site_data import site_database

# Each query's columns, in order. A query added under `site/queries/` is added here.
EXPECTED_COLUMNS = {
    "explore/daily_by_family": ["day", "family", "family_slug", "endpoint_group", "requests", "input_tokens",
                                "input_counted", "output_tokens", "output_counted", "ttft_sum", "ttft_counted"],
    "explore/daily_by_model": ["day", "chute_id", "model", "endpoint_group", "requests", "input_tokens",
                               "input_counted", "output_tokens", "output_counted", "ttft_sum", "ttft_counted"],
    "explore/endpoint_mix": ["endpoint_group", "requests"],
    "explore/model_mix": ["model", "requests"],
    "explore/requests_by_month_endpoint": ["month", "calendar_month", "endpoint_group", "requests"],
    "explore/requests_by_month_model": ["month", "calendar_month", "model", "requests"],
    "explore/tokens_by_month_model": ["month", "calendar_month", "model", "tokens"],
    "explore/trace_totals": ["first_day", "last_day", "months", "requests", "input_tokens", "output_tokens", "users",
                             "models", "instances"],
    "setup/family_models": ["family", "chute_id", "name", "requests", "rank"],
    "setup/top_models": ["chute_id", "name", "rank"],
}
# The tables of the site's database, the only ones a query may read.
SITE_TABLES = {"trace_totals", "daily_rollup", "monthly_requests_tokens_by_model", "function_name_daily_requests",
               "chute_models", "model_families", "trace_calendar", "top_models", "family_models"}
# The parameters a query that takes one is run with here: a family of the fixture.
QUERY_PARAMETERS = {"explore/daily_by_model": {"family": "DeepSeek"}}
# A named parameter in a query's text, `$family`.
NAMED_PARAMETER = re.compile(r"\$\w+")


def query_names() -> list[str]:
    """The name of every query: each `.sql` file under `site/queries/`, sorted."""
    names = []
    for path in sorted(site_database.QUERIES_FOLDER.rglob("*.sql")):
        names.append(path.relative_to(site_database.QUERIES_FOLDER).with_suffix("").as_posix())
    return names


def query_records(connection: duckdb.DuckDBPyConnection, name: str,
                  parameters: dict[str, str] | None = None) -> list[dict]:
    """The query's rows, given `parameters`, each a dict from column to value."""
    result = site_database.run_query(connection, name, parameters)
    records = []
    for row in result.rows:
        records.append(dict(zip(result.columns, row)))
    return records


def test_every_query_has_its_columns_listed() -> None:
    assert query_names() == sorted(EXPECTED_COLUMNS)


@pytest.mark.parametrize("name", sorted(EXPECTED_COLUMNS))
def test_a_query_returns_its_columns_and_rows(connection: duckdb.DuckDBPyConnection, name: str) -> None:
    result = site_database.run_query(connection, name, QUERY_PARAMETERS.get(name))
    assert result.columns == EXPECTED_COLUMNS[name]
    assert result.rows, f"{name} has no rows over the fixture"


@pytest.mark.parametrize("name", sorted(EXPECTED_COLUMNS))
def test_a_query_reads_only_the_site_s_tables(name: str) -> None:
    # DuckDB names a statement's tables only for a statement it can prepare whole, so a parameter is read as a string.
    text = NAMED_PARAMETER.sub("''", site_database.statement_text(name))
    named_tables = duckdb.get_table_names(text)
    assert named_tables <= SITE_TABLES, f"{name} reads {sorted(named_tables - SITE_TABLES)}"


def test_the_table_check_sees_every_table_a_query_names() -> None:
    text = "WITH counted AS (SELECT requests.id FROM requests JOIN chute_models ON true) SELECT * FROM counted"
    assert duckdb.get_table_names(text) == {"requests", "chute_models"}


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


def test_the_family_models_are_ranked_within_their_family(connection: duckdb.DuckDBPyConnection) -> None:
    family_models = query_records(connection, "setup/family_models")
    assert [(row["family"], row["chute_id"], row["requests"], row["rank"]) for row in family_models] == [
        ("DeepSeek", "chute-01", 70, 1), ("DeepSeek", "chute-02", 15, 2), ("Other", "chute-04", 5, 1),
        ("gpt-oss", "chute-03", 20, 1)]


def test_the_daily_rows_by_family_count_every_request(connection: duckdb.DuckDBPyConnection) -> None:
    by_family = query_records(connection, "explore/daily_by_family")
    assert sum(row["requests"] for row in by_family) == fixture_artifact.TOTAL_REQUESTS
    assert [(row["day"], row["family_slug"], row["endpoint_group"], row["requests"]) for row in by_family] == [
        (datetime.date(2025, 4, 11), "deepseek", "chat", 40),
        (datetime.date(2025, 4, 11), "deepseek", "chat_stream", 40),
        (datetime.date(2025, 4, 11), "gpt-oss", "chat", 20),
        (datetime.date(2025, 4, 12), "other", "chat", 25),
        (datetime.date(2025, 5, 13), "deepseek", "completion", 15),
    ]
    assert by_family[1]["ttft_sum"] is None and by_family[1]["ttft_counted"] == 0


def test_every_family_is_the_family_table_s_or_other(connection: duckdb.DuckDBPyConnection) -> None:
    table_families = set(connection.table("model_families").df()["family"])
    by_family = query_records(connection, "explore/daily_by_family")
    assert {row["family"] for row in by_family} <= table_families | {"Other"}


def test_a_family_s_daily_rows_name_its_models_and_its_rest(connection: duckdb.DuckDBPyConnection) -> None:
    deepseek = query_records(connection, "explore/daily_by_model", {"family": "DeepSeek"})
    named = [(row["day"], row["chute_id"], row["model"], row["endpoint_group"], row["requests"]) for row in deepseek]
    assert named == [
        (datetime.date(2025, 4, 11), None, "Other DeepSeek", "chat_stream", 10),
        (datetime.date(2025, 4, 11), "chute-01", "model-01", "chat", 40),
        (datetime.date(2025, 4, 11), "chute-01", "model-01", "chat_stream", 30),
        (datetime.date(2025, 5, 13), "chute-02", "model-02", "completion", 15),
    ]
    other = query_records(connection, "explore/daily_by_model", {"family": "Other"})
    assert [(row["model"], row["requests"]) for row in other] == [("Other Other", 20), ("model-04", 5)]
