"""The trace table: the fixture trace adds up to the fixture's daily rollup; the trace query over it gives the weekly
histograms counted here by hand, which add up to the rollup's counted requests; the builder writes the table and its
sidecar, the same bytes on a rebuild, and stops on a missing trace; and the tracked table is current with its query
and, with the artifact's checkout (`ARTIFACT`; skipped, saying so, without one), agrees with the artifact's rollup."""

import json
import pathlib
import re
import typing

import duckdb
import pandas
import pyarrow.parquet
import pytest

import fixture_artifact
from repository_root import ROOT
from site_data import loading, site_database, tables

# Each metric of the trace table and the daily rollup's column counting the requests that recorded it.
COUNTED_COLUMNS = {"input_tokens": "input_counted", "output_tokens": "output_counted", "ttft": "ttft_counted"}
TRACE_EPOCH = pandas.Timestamp("1970-01-01")  # the trace's first day, from which its weeks count
DAYS_PER_WEEK = 7  # a trace week is seven trace days
# The fixture's weekly histograms, counted by hand from `fixture_artifact.TRACE_REQUESTS`: (week, family, chute id,
# endpoint group, metric, bin, requests). An input of 100 tokens is in bin 26, 50 in 22 and 40 in 21; an output of 20
# in 17, 13 in 14, 23 in 18, 10 in 13, 12 in 14 and 0 in 0; a TTFT of 6 s in bin 10, 0.5 s in -4 and 0.25 s in -8.
FIXTURE_HISTOGRAMS = [
    (0, "DeepSeek", "chute-01", "chat", "input_tokens", 26, 40),
    (0, "DeepSeek", "chute-01", "chat", "output_tokens", 17, 40),
    (0, "DeepSeek", "chute-01", "chat", "ttft", -4, 29),
    (0, "DeepSeek", "chute-01", "chat", "ttft", 10, 1),
    (0, "DeepSeek", "chute-01", "chat_stream", "input_tokens", 22, 30),
    (0, "DeepSeek", "chute-01", "chat_stream", "output_tokens", 14, 29),
    (0, "DeepSeek", "chute-01", "chat_stream", "output_tokens", 18, 1),
    (0, "DeepSeek", None, "chat_stream", "input_tokens", 22, 10),
    (0, "DeepSeek", None, "chat_stream", "output_tokens", 13, 10),
    (0, "Other", "chute-04", "chat", "input_tokens", 21, 5),
    (0, "Other", "chute-04", "chat", "output_tokens", 14, 5),
    (0, "Other", "chute-04", "chat", "ttft", -8, 1),
    (0, "Other", "chute-04", "chat", "ttft", -4, 4),
    (0, "Other", None, "chat", "input_tokens", 21, 20),
    (0, "Other", None, "chat", "output_tokens", 14, 20),
    (0, "Other", None, "chat", "ttft", -4, 20),
    (0, "gpt-oss", "chute-03", "chat", "input_tokens", 26, 20),
    (0, "gpt-oss", "chute-03", "chat", "output_tokens", 17, 20),
    (0, "gpt-oss", "chute-03", "chat", "ttft", -4, 20),
    (4, "DeepSeek", "chute-02", "completion", "output_tokens", 0, 15),
    (4, "DeepSeek", "chute-02", "completion", "ttft", -8, 14),
    (4, "DeepSeek", "chute-02", "completion", "ttft", -4, 1),
]


class WeekGroup(typing.NamedTuple):
    """A trace week's requests of one family, kept model (None for the family's other models) and endpoint group that
    recorded one metric."""

    week: int
    family: str
    chute_id: str | None
    endpoint_group: str
    metric: str


def kept_chute(chute_id: object) -> str | None:
    """A kept model's chute id as a key: the id, or None where pandas holds a missing one."""
    return None if pandas.isna(chute_id) else chute_id


def table_requests_by_week(table: pandas.DataFrame) -> dict[WeekGroup, int]:
    """The trace table's requests per week, family, kept model, endpoint group and metric, summed over bins."""
    sums = table.groupby(["week", "family", "chute_id", "endpoint_group", "metric"], dropna=False)["requests"].sum()
    requests = {}
    for (week, family, chute_id, endpoint_group, metric), value in sums.items():
        requests[WeekGroup(int(week), family, kept_chute(chute_id), endpoint_group, metric)] = int(value)
    return requests


def rollup_counted_by_week(daily_rollup: pandas.DataFrame) -> dict[WeekGroup, int]:
    """The daily rollup's counted requests per trace week, family, kept model, endpoint group and metric: each
    metric's counted column summed over the week's days; a group none of whose requests recorded the metric is left
    out, as the table has no row for it."""
    weeks = (daily_rollup["day"] - TRACE_EPOCH).dt.days // DAYS_PER_WEEK
    counted = {}
    for metric, column in COUNTED_COLUMNS.items():
        sums = daily_rollup.groupby([weeks, "family", "chute_id", "function_group"], dropna=False)[column].sum()
        for (week, family, chute_id, endpoint_group), value in sums.items():
            if value > 0:
                counted[WeekGroup(int(week), family, kept_chute(chute_id), endpoint_group, metric)] = int(value)
    return counted


def rollup_sum(value: float) -> float:
    """A sum of the daily rollup as a number: a sum over no recorded value, written as null, is 0."""
    return 0.0 if pandas.isna(value) else value


def test_each_entry_of_the_fixture_trace_adds_up_to_its_rollup_row(frames: loading.ArtifactFrames) -> None:
    rollup_rows = frames.daily_rollup.to_dict("records")
    for row, requests in zip(rollup_rows, fixture_artifact.TRACE_REQUESTS, strict=True):
        recorded_inputs = [value for value in requests.input_tokens if value is not None]
        recorded_outputs = [value for value in requests.output_tokens if value is not None]
        positive_ttfts = [value for value in requests.ttfts if value is not None and value > 0]
        assert (requests.day, requests.function_name) == (row["day"], row["function_group"])
        assert len(requests.input_tokens) == row["requests"]
        assert (len(recorded_inputs), sum(recorded_inputs)) == (row["input_counted"], rollup_sum(row["input_tokens"]))
        assert (len(recorded_outputs), sum(recorded_outputs)) == (row["output_counted"],
                                                                  rollup_sum(row["output_tokens"]))
        assert (len(positive_ttfts), sum(positive_ttfts)) == (row["ttft_counted"], rollup_sum(row["ttft_sum"]))


def test_the_trace_query_gives_the_fixture_s_weekly_histograms(trace_connection: duckdb.DuckDBPyConnection) -> None:
    result = site_database.run_query(trace_connection, tables.QUERY)
    assert [tuple(row) for row in result.rows] == FIXTURE_HISTOGRAMS


def test_the_fixture_s_histograms_add_up_to_the_rollup_s_counted_requests(
        trace_connection: duckdb.DuckDBPyConnection, frames: loading.ArtifactFrames) -> None:
    table = tables.histogram_table(trace_connection).to_pandas()
    assert table_requests_by_week(table) == rollup_counted_by_week(frames.daily_rollup)


def command(trace: pathlib.Path, artifact: pathlib.Path, output: pathlib.Path) -> list[str]:
    """The command line of a build from `trace` and `artifact` into `output`'s tables folder."""
    return ["--trace", str(trace), "--artifact", str(artifact), "--out", str(output / "tables")]


def test_the_builder_writes_the_table_and_its_sidecar(artifact: pathlib.Path, fixture_trace: pathlib.Path,
                                                      tmp_path: pathlib.Path, capsys: pytest.CaptureFixture) -> None:
    tables.main(command(fixture_trace, artifact, tmp_path))
    table = pyarrow.parquet.read_table(tmp_path / "tables" / loading.TRACE_TABLE_FILE)
    assert table.schema.names == ["week", "family", "chute_id", "endpoint_group", "metric", "bin", "requests"]
    assert [str(field.type) for field in table.schema] == ["int32", "string", "string", "string", "string", "int32",
                                                           "int64"]
    assert [tuple(row.values()) for row in table.to_pylist()] == FIXTURE_HISTOGRAMS
    sidecar = json.loads((tmp_path / "tables" / loading.TRACE_TABLE_SIDECAR_FILE).read_text())
    query_hash = site_database.query_text_hash(site_database.QUERIES_FOLDER, tables.QUERY)
    assert sidecar == {"query": query_hash, "rows": len(FIXTURE_HISTOGRAMS),
                       "trace_rows": fixture_artifact.TOTAL_REQUESTS}
    assert re.search(r"^22 rows from 140 trace rows in \d+ s$", capsys.readouterr().out, re.MULTILINE)


def test_a_rebuild_writes_the_same_bytes(artifact: pathlib.Path, fixture_trace: pathlib.Path,
                                         tmp_path: pathlib.Path) -> None:
    tables.main(command(fixture_trace, artifact, tmp_path / "first"))
    tables.main(command(fixture_trace, artifact, tmp_path / "second"))
    for name in [loading.TRACE_TABLE_FILE, loading.TRACE_TABLE_SIDECAR_FILE]:
        first = (tmp_path / "first" / "tables" / name).read_bytes()
        assert first == (tmp_path / "second" / "tables" / name).read_bytes(), f"{name} differs on a rebuild"


def test_a_missing_trace_stops_naming_it_before_writing(artifact: pathlib.Path, tmp_path: pathlib.Path) -> None:
    missing = tmp_path / "no_trace.parquet"
    with pytest.raises(SystemExit, match=re.escape(f"missing {missing}: {loading.TRACE_HINT}")):
        tables.main(command(missing, artifact, tmp_path))
    assert not (tmp_path / "tables").exists()


def test_the_trace_table_is_tracked(tracked_files: set[str]) -> None:
    for name in [loading.TRACE_TABLE_FILE, loading.TRACE_TABLE_SIDECAR_FILE]:
        path = (loading.TABLES_FOLDER / name).relative_to(ROOT).as_posix()
        assert path in tracked_files, f"{path} is not tracked; run make tables and commit it"


def test_the_tracked_table_comes_from_its_query_s_current_text() -> None:
    sidecar = json.loads((loading.TABLES_FOLDER / loading.TRACE_TABLE_SIDECAR_FILE).read_text())
    query_hash = site_database.query_text_hash(site_database.QUERIES_FOLDER, tables.QUERY)
    assert sidecar["query"] == query_hash, f"{tables.QUERY} was edited since the trace table was built; run make tables"


def test_the_tracked_table_holds_the_rows_its_sidecar_counts() -> None:
    sidecar = json.loads((loading.TABLES_FOLDER / loading.TRACE_TABLE_SIDECAR_FILE).read_text())
    assert pyarrow.parquet.read_metadata(loading.TABLES_FOLDER / loading.TRACE_TABLE_FILE).num_rows == sidecar["rows"]


def test_the_tracked_table_agrees_with_the_artifact_s_rollup(artifact_checkout: pathlib.Path) -> None:
    """Each week's requests per family, kept model and endpoint group, metric by metric, are the daily rollup's
    counted requests over the week's days: the query's family rule places every model where the artifact's does, and
    keeps the chute ids the rollup keeps."""
    table = pyarrow.parquet.read_table(loading.TABLES_FOLDER / loading.TRACE_TABLE_FILE).to_pandas()
    rollup = rollup_counted_by_week(loading.load_artifact(artifact_checkout).daily_rollup)
    requests = table_requests_by_week(table)
    differing = []
    for group in sorted(rollup.keys() | requests.keys(), key=str):  # a key holds None, so it is sorted as text
        if rollup.get(group) != requests.get(group):
            differing.append(group)
    assert differing == [], f"{len(differing)} groups differ from the rollup, the first {differing[:5]}"
