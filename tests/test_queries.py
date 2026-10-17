"""The site's queries over the fixture artifact: each returns exactly its documented columns, reads only the site's
tables (the trace query, only the trace and the three tables of models and families), and counts what its definition
says. The trace query's rows are checked in `test_tables.py`."""

import datetime
import re

import duckdb
import pytest

import fixture_artifact
from site_data import site_database, tables

# Each query's columns, in order. A query added under `site/queries/` is added here.
EXPECTED_COLUMNS = {
    "explore/daily_by_family": ["day", "family", "family_slug", "endpoint_group", "requests", "input_tokens",
                                "input_counted", "output_tokens", "output_counted", "ttft_sum", "ttft_counted"],
    "explore/daily_by_model": ["day", "chute_id", "model", "endpoint_group", "requests", "input_tokens",
                               "input_counted", "output_tokens", "output_counted", "ttft_sum", "ttft_counted"],
    "explore/endpoint_mix": ["endpoint_group", "requests"],
    "explore/family_mix": ["family", "requests"],
    "explore/trace_totals": ["first_day", "last_day", "months", "requests", "input_tokens", "output_tokens", "users",
                             "models", "instances"],
    "setup/family_models": ["family", "chute_id", "name", "requests", "rank"],
    "trace/weekly_histograms": ["week", "family", "chute_id", "endpoint_group", "metric", "bin", "requests"],
}
# The tables of the site's database, the only ones a query of `SITE_TABLE_FOLDERS` may read.
SITE_TABLES = {"trace_totals", "daily_rollup", "function_name_daily_requests", "chute_models", "model_families",
               "trace_calendar", "family_models"}
SITE_TABLE_FOLDERS = ("explore/", "setup/")  # the folders of the queries over the site's tables alone
# The only tables the trace query reads: the trace, and the models and families that place its requests.
TRACE_QUERY_TABLES = {"trace", "chute_models", "model_families", "family_models"}
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


def site_query_names() -> list[str]:
    """The name of every listed query over the site's tables alone: those of `SITE_TABLE_FOLDERS`, sorted."""
    return [name for name in sorted(EXPECTED_COLUMNS) if name.startswith(SITE_TABLE_FOLDERS)]


@pytest.mark.parametrize("name", sorted(EXPECTED_COLUMNS))
def test_a_query_returns_its_columns_and_rows(connection: duckdb.DuckDBPyConnection,
                                              trace_connection: duckdb.DuckDBPyConnection, name: str) -> None:
    database = trace_connection if name == tables.QUERY else connection
    result = site_database.run_query(database, name, QUERY_PARAMETERS.get(name))
    assert result.columns == EXPECTED_COLUMNS[name]
    assert result.rows, f"{name} has no rows over the fixture"


@pytest.mark.parametrize("name", site_query_names())
def test_a_query_reads_only_the_site_s_tables(name: str) -> None:
    # DuckDB names a statement's tables only for a statement it can prepare whole, so a parameter is read as a string.
    text = NAMED_PARAMETER.sub("''", site_database.statement_text(name))
    named_tables = duckdb.get_table_names(text)
    assert named_tables <= SITE_TABLES, f"{name} reads {sorted(named_tables - SITE_TABLES)}"


def test_every_query_is_over_the_site_s_tables_or_is_the_trace_query() -> None:
    assert site_query_names() + [tables.QUERY] == sorted(EXPECTED_COLUMNS)


def test_the_trace_query_reads_only_the_trace_and_the_models_and_families() -> None:
    assert duckdb.get_table_names(site_database.statement_text(tables.QUERY)) == TRACE_QUERY_TABLES


def test_the_table_check_sees_every_table_a_query_names() -> None:
    text = "WITH counted AS (SELECT requests.id FROM requests JOIN chute_models ON true) SELECT * FROM counted"
    assert duckdb.get_table_names(text) == {"requests", "chute_models"}


def test_the_totals_span_the_trace_in_calendar_days(connection: duckdb.DuckDBPyConnection) -> None:
    [totals] = query_records(connection, "explore/trace_totals")
    assert totals["first_day"] == datetime.date(2025, 4, 11)
    assert totals["last_day"] == datetime.date(2025, 5, 13)
    assert totals["months"] == 2
    assert totals["requests"] == fixture_artifact.TOTAL_REQUESTS


def test_the_family_mix_is_each_family_by_its_requests_then_other(connection: duckdb.DuckDBPyConnection) -> None:
    mix = query_records(connection, "explore/family_mix")
    assert [(row["family"], row["requests"]) for row in mix] == [("DeepSeek", 95), ("gpt-oss", 20), ("Other", 25)]


def test_the_family_mix_sums_to_the_trace_and_names_the_daily_families(connection: duckdb.DuckDBPyConnection) -> None:
    mix = query_records(connection, "explore/family_mix")
    [totals] = query_records(connection, "explore/trace_totals")
    assert sum(row["requests"] for row in mix) == totals["requests"]
    by_family = query_records(connection, "explore/daily_by_family")
    mix_families = [row["family"] for row in mix]
    assert len(mix_families) == len(set(mix_families)), "a family has two rows"
    assert set(mix_families) == {row["family"] for row in by_family}


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
        (datetime.date(2025, 4, 11), "chute-01", "DeepSeek-model-01", "chat", 40),
        (datetime.date(2025, 4, 11), "chute-01", "DeepSeek-model-01", "chat_stream", 30),
        (datetime.date(2025, 4, 11), None, "Other DeepSeek", "chat_stream", 10),
        (datetime.date(2025, 5, 13), "chute-02", "deepseek-r1t-model-02", "completion", 15),
    ]
    other = query_records(connection, "explore/daily_by_model", {"family": "Other"})
    assert [(row["model"], row["requests"]) for row in other] == [("Other Other", 20), ("model-04", 5)]
