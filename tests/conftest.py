"""Fixtures shared by the tests: the fixture artifact (`fixture_artifact.py`) and its tables; the fixture trace's file
(`fixture_trace.py`) and the trace table's database over it and the artifact's tables; the tables folder holding the
fixture's trace table counted by hand; the site's database over the artifact's tables and that trace table; the
artifact's own checkout, which the environment variable `ARTIFACT` names, as `make test` passes it; and the files git
tracks."""

import os
import pathlib
import subprocess

import duckdb
import pyarrow
import pytest

import fixture_artifact
import fixture_trace
from repository_root import ROOT
from site_data import figure_answers, loading, site_database, tables


@pytest.fixture(scope="session")
def artifact(tmp_path_factory: pytest.TempPathFactory) -> pathlib.Path:
    """The fixture artifact, written once for the run; a test that changes it writes its own instead."""
    return fixture_artifact.write_fixture_artifact(tmp_path_factory.mktemp("artifact"))


@pytest.fixture
def artifact_tables(artifact: pathlib.Path) -> loading.ArtifactTables:
    """The fixture artifact's tables."""
    return loading.load_artifact(artifact)


@pytest.fixture
def weekly_histograms(fixture_tables: pathlib.Path) -> pyarrow.Table:
    """The fixture's trace table counted by hand, loaded as the data step loads the tracked one."""
    return loading.load_trace_table(fixture_tables)


@pytest.fixture
def connection(artifact_tables: loading.ArtifactTables, weekly_histograms: pyarrow.Table) -> duckdb.DuckDBPyConnection:
    """The site's database over the fixture artifact's tables and the fixture's trace table."""
    return site_database.open_database(artifact_tables, weekly_histograms)


@pytest.fixture(scope="session")
def trace_file(tmp_path_factory: pytest.TempPathFactory) -> pathlib.Path:
    """The fixture trace's Parquet file, written once for the run."""
    return fixture_trace.write_fixture_trace(tmp_path_factory.mktemp("trace") / "trace.parquet")


@pytest.fixture(scope="session")
def fixture_tables(tmp_path_factory: pytest.TempPathFactory) -> pathlib.Path:
    """The tables folder holding the fixture's trace table counted by hand (`fixture_trace.WEEKLY_HISTOGRAMS`),
    written once for the run; the builder is not run, so a fault in the trace query fails only its own tests."""
    return fixture_trace.write_trace_table(tmp_path_factory.mktemp("tables"))


@pytest.fixture
def trace_connection(artifact_tables: loading.ArtifactTables,
                     trace_file: pathlib.Path) -> duckdb.DuckDBPyConnection:
    """The trace table's database over the fixture artifact's tables and the fixture trace."""
    return tables.open_trace_database(artifact_tables, trace_file)


@pytest.fixture
def artifact_checkout() -> pathlib.Path:
    """The artifact's checkout `ARTIFACT` names, relative to the repository; skips the test when it names none."""
    named = os.environ.get("ARTIFACT", "")
    if named == "":
        pytest.skip("ARTIFACT is not set; run `make test`, or set it to the artifact's checkout, to compare with it")
    checkout = ROOT / named
    if not (checkout / figure_answers.FIGURE_LIST_FILE).is_file():
        pytest.skip(f"no {figure_answers.FIGURE_LIST_FILE} under ARTIFACT={named}; set it to the artifact's checkout")
    return checkout


@pytest.fixture(scope="session")
def tracked_files() -> set[str]:
    """The path of every file git tracks, relative to the repository."""
    tracked = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True)
    return set(tracked.stdout.splitlines())
