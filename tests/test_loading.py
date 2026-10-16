"""Reading the artifact: every cache, the model names and the family table load with their columns, and a missing file
stops the step naming it."""

import pathlib
import re

import pandas
import pyarrow
import pytest

import fixture_artifact
from site_data import loading


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
