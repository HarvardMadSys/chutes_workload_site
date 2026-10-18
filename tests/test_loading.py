"""Reading the artifact and the trace table: every cache, the model names, the family table and the trace table load
with their columns, and a missing file stops the step naming it and saying how to supply it."""

import pathlib
import re

import duckdb
import pyarrow
import pyarrow.compute
import pyarrow.parquet
import pytest

import fixture_artifact
from site_data import loading


def test_every_cache_loads_with_its_columns(artifact_tables: loading.ArtifactTables) -> None:
    assert artifact_tables.trace_totals.column_names == ["first_started_at", "last_started_at", "requests",
                                                         "input_tokens", "output_tokens", "users", "models",
                                                         "instances"]
    assert artifact_tables.daily_rollup.column_names == ["day", "family", "chute_id", "function_group", "requests",
                                                         "input_tokens", "input_counted", "output_tokens",
                                                         "output_counted", "ttft_sum", "ttft_counted"]
    assert artifact_tables.function_name_daily_requests.column_names == ["day", "function_group", "requests"]
    assert artifact_tables.daily_rollup.num_rows == 7
    assert artifact_tables.trace_totals["requests"].to_pylist() == [fixture_artifact.TOTAL_REQUESTS]


def test_the_model_names_keep_the_chute_id_and_name(artifact_tables: loading.ArtifactTables) -> None:
    assert artifact_tables.chute_models.column_names == ["chute_id", "name"]
    assert artifact_tables.chute_models["chute_id"].to_pylist()[0] == "chute-01"
    assert artifact_tables.chute_models["name"].to_pylist()[-1] == "model-idle"


def test_the_family_table_keeps_its_three_columns(artifact_tables: loading.ArtifactTables) -> None:
    assert artifact_tables.model_families.column_names == ["match_order", "family", "pattern"]
    assert artifact_tables.model_families["family"].to_pylist() == ["DeepSeek", "DeepSeek", "gpt-oss"]


def test_the_trace_table_loads_with_its_columns(fixture_tables: pathlib.Path,
                                                artifact_tables: loading.ArtifactTables) -> None:
    weekly_histograms = loading.load_trace_table(fixture_tables)
    assert weekly_histograms.column_names == ["week", "family", "chute_id", "endpoint_group", "metric", "bin",
                                              "requests"]
    assert weekly_histograms.num_rows == 22
    # Each request is in one bin of each metric it recorded, as the rollup counts the requests that recorded each.
    counted = 0
    for column in ["input_counted", "output_counted", "ttft_counted"]:
        counted += pyarrow.compute.sum(artifact_tables.daily_rollup[column]).as_py()
    assert pyarrow.compute.sum(weekly_histograms["requests"]).as_py() == counted


def test_a_missing_trace_table_stops_naming_it_and_saying_to_run_make_tables(tmp_path: pathlib.Path) -> None:
    missing = tmp_path / loading.TRACE_TABLE_FILE
    with pytest.raises(SystemExit, match=re.escape(f"missing {missing}: run make tables")):
        loading.load_trace_table(tmp_path)


@pytest.mark.parametrize("missing", [
    pathlib.Path("data/paper/cache/trace_totals.parquet"),
    pathlib.Path("data/paper/cache/daily_rollup.parquet"),
    pathlib.Path("data/paper/cache/function_name_daily_requests.parquet"),
    pathlib.Path("data/paper/chute_models.csv"),
    pathlib.Path("data/paper/model_families.csv"),
])
def test_a_missing_file_stops_naming_it(tmp_path: pathlib.Path, missing: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path)
    (artifact / missing).unlink()
    with pytest.raises(SystemExit, match=re.escape(f"missing {artifact / missing}")):
        loading.load_artifact(artifact)


def test_an_integer_column_holding_nulls_is_an_integer_in_the_database(tmp_path: pathlib.Path) -> None:
    cache = pyarrow.table({"requests": pyarrow.array([3, None], pyarrow.int64()),
                           "tokens": pyarrow.array([1.5, None], pyarrow.float64())})
    pyarrow.parquet.write_table(cache, tmp_path / "cache.parquet")
    connection = duckdb.connect()
    connection.register("cache", loading.read_cache(tmp_path / "cache.parquet"))
    assert connection.table("cache").types == ["BIGINT", "DOUBLE"]
    assert connection.execute("SELECT requests, tokens FROM cache").fetchall() == [(3, 1.5), (None, None)]
