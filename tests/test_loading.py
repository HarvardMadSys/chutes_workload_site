"""Reading the artifact and the trace table: every cache, the model names, the family table and the trace table load
with their columns, and a missing file stops the step naming it and saying how to supply it."""

import pathlib
import re

import pandas
import pyarrow
import pytest

import fixture_artifact
from site_data import loading, paths


def test_every_cache_loads_with_its_columns(frames: loading.ArtifactFrames) -> None:
    assert list(frames.trace_totals.columns) == ["first_started_at", "last_started_at", "requests", "input_tokens",
                                                 "output_tokens", "users", "models", "instances"]
    assert list(frames.daily_rollup.columns) == ["day", "family", "chute_id", "function_group", "requests",
                                                 "input_tokens", "input_counted", "output_tokens", "output_counted",
                                                 "ttft_sum", "ttft_counted"]
    assert list(frames.function_name_daily_requests.columns) == ["day", "function_group", "requests"]
    assert len(frames.daily_rollup) == 7
    assert frames.trace_totals["requests"].tolist() == [fixture_artifact.TOTAL_REQUESTS]


def test_the_model_names_keep_the_chute_id_and_name(frames: loading.ArtifactFrames) -> None:
    assert list(frames.chute_models.columns) == ["chute_id", "name"]
    assert frames.chute_models["chute_id"].tolist()[0] == "chute-01"
    assert frames.chute_models["name"].tolist()[-1] == "model-idle"


def test_the_family_table_keeps_its_three_columns(frames: loading.ArtifactFrames) -> None:
    assert list(frames.model_families.columns) == ["match_order", "family", "pattern"]
    assert frames.model_families["family"].tolist() == ["DeepSeek", "DeepSeek", "gpt-oss"]


def test_the_trace_table_loads_with_its_columns(fixture_tables: pathlib.Path, frames: loading.ArtifactFrames) -> None:
    weekly_histograms = loading.load_trace_table(fixture_tables)
    assert list(weekly_histograms.columns) == ["week", "family", "chute_id", "endpoint_group", "metric", "bin",
                                               "requests"]
    assert len(weekly_histograms) == 22
    # Each request is in one bin of each metric it recorded, as the rollup counts the requests that recorded each.
    counted = frames.daily_rollup[["input_counted", "output_counted", "ttft_counted"]].to_numpy().sum()
    assert weekly_histograms["requests"].sum() == counted


def test_a_missing_trace_table_stops_naming_it_and_saying_to_run_make_tables(tmp_path: pathlib.Path) -> None:
    missing = tmp_path / paths.TRACE_TABLE_FILE
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


def test_an_integer_column_holding_nulls_stays_integer() -> None:
    table = pyarrow.table({"requests": pyarrow.array([3, None], pyarrow.int64()),
                           "tokens": pyarrow.array([1.5, None], pyarrow.float64())})
    frame = loading.with_nullable_integers(table.to_pandas(), table.schema)
    assert str(frame["requests"].dtype) == "Int64"
    assert frame["requests"].tolist()[0] == 3
    assert pandas.isna(frame["requests"].tolist()[1])
    assert pandas.api.types.is_float_dtype(frame["tokens"])
