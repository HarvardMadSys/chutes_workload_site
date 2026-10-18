"""The trace table: the fixture trace adds up to the fixture's daily rollup; the trace query over it gives the weekly
histograms counted by hand in `fixture_trace.py`, which add up to the rollup's counted requests; the builder writes the
table and its sidecar, the same bytes on a rebuild, and stops on a missing trace; and the tracked table is current with
its query and, with the artifact's checkout (`ARTIFACT`; skipped, saying so, without one), agrees with the artifact's
rollup."""

import json
import pathlib
import re
import typing

import duckdb
import pandas
import pyarrow.parquet
import pytest

import counted_requests
import fixture_artifact
import fixture_trace
from repository_root import ROOT
from site_data import loading, months, site_database, tables


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
    weeks = (daily_rollup["day"] - pandas.Timestamp(months.TRACE_EPOCH)).dt.days // months.DAYS_PER_TRACE_WEEK
    counted = {}
    for metric, column in counted_requests.COUNTED_COLUMNS.items():
        sums = daily_rollup.groupby([weeks, "family", "chute_id", "function_group"], dropna=False)[column].sum()
        for (week, family, chute_id, endpoint_group), value in sums.items():
            if value > 0:
                counted[WeekGroup(int(week), family, kept_chute(chute_id), endpoint_group, metric)] = int(value)
    return counted


def rollup_sum(value: float) -> float:
    """A sum of the daily rollup as a number: a sum over no recorded value, written as null, is 0."""
    return 0.0 if pandas.isna(value) else value


def test_each_entry_of_the_fixture_trace_adds_up_to_its_rollup_row(artifact_tables: loading.ArtifactTables) -> None:
    rollup_rows = artifact_tables.daily_rollup.to_pylist()
    for row, requests in zip(rollup_rows, fixture_trace.TRACE_REQUESTS, strict=True):
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
    result = site_database.run_query(trace_connection, tables.QUERY, tables.TRACE_QUERY_PARAMETERS)
    assert [tuple(row) for row in result.rows] == fixture_trace.WEEKLY_HISTOGRAMS


def test_the_fixture_s_histograms_add_up_to_the_rollup_s_counted_requests(
        artifact_tables: loading.ArtifactTables) -> None:
    table = pandas.DataFrame(fixture_trace.WEEKLY_HISTOGRAMS)
    assert table_requests_by_week(table) == rollup_counted_by_week(artifact_tables.daily_rollup.to_pandas())


def command(trace: pathlib.Path, artifact: pathlib.Path, output: pathlib.Path) -> list[str]:
    """The command line of a build from `trace` and `artifact` into `output`'s tables folder."""
    return ["--trace", str(trace), "--artifact", str(artifact), "--out", str(output / "tables")]


def test_the_builder_writes_the_table_and_its_sidecar(artifact: pathlib.Path, trace_file: pathlib.Path,
                                                      tmp_path: pathlib.Path, capsys: pytest.CaptureFixture) -> None:
    tables.main(command(trace_file, artifact, tmp_path))
    table = pyarrow.parquet.read_table(tmp_path / "tables" / loading.TRACE_TABLE_FILE)
    assert table.schema.names == ["week", "family", "chute_id", "endpoint_group", "metric", "bin", "requests"]
    assert [str(field.type) for field in table.schema] == ["int32", "string", "string", "string", "string", "int32",
                                                           "int64"]
    assert [tuple(row.values()) for row in table.to_pylist()] == fixture_trace.WEEKLY_HISTOGRAMS
    sidecar = json.loads((tmp_path / "tables" / loading.TRACE_TABLE_SIDECAR_FILE).read_text())
    query_hash = site_database.query_text_hash(site_database.QUERIES_FOLDER, tables.QUERY)
    assert sidecar == {"query": query_hash, "rows": len(fixture_trace.WEEKLY_HISTOGRAMS),
                       "trace_rows": fixture_artifact.TOTAL_REQUESTS}
    assert re.search(r"^22 rows from 140 trace rows in \d+ s$", capsys.readouterr().out, re.MULTILINE)


def test_a_rebuild_writes_the_same_bytes(artifact: pathlib.Path, trace_file: pathlib.Path,
                                         tmp_path: pathlib.Path) -> None:
    tables.main(command(trace_file, artifact, tmp_path / "first"))
    tables.main(command(trace_file, artifact, tmp_path / "second"))
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
    rollup = rollup_counted_by_week(loading.load_artifact(artifact_checkout).daily_rollup.to_pandas())
    requests = table_requests_by_week(table)
    differing = []
    for group in sorted(rollup.keys() | requests.keys(), key=str):  # a key holds None, so it is sorted as text
        if rollup.get(group) != requests.get(group):
            differing.append(group)
    assert differing == [], f"{len(differing)} groups differ from the rollup, the first {differing[:5]}"
