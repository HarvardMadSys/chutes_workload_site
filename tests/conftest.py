"""Fixtures shared by the tests: the fixture artifact (`fixture_artifact.py`) and its frames; the fixture trace, the
trace table's database over it and the frames, and the tables folder the builder writes from them; the site's database
over the frames and that folder's trace table; the artifact's own checkout, which the environment variable `ARTIFACT`
names, as `make test` passes it; and the files git tracks."""

import os
import pathlib
import subprocess

import duckdb
import pandas
import pytest

import fixture_artifact
from repository_root import ROOT
from site_data import figure_answers, loading, site_database, tables


@pytest.fixture(scope="session")
def artifact(tmp_path_factory: pytest.TempPathFactory) -> pathlib.Path:
    """The fixture artifact, written once for the run; a test that changes it writes its own instead."""
    return fixture_artifact.write_fixture_artifact(tmp_path_factory.mktemp("artifact"))


@pytest.fixture
def frames(artifact: pathlib.Path) -> loading.ArtifactFrames:
    """The fixture artifact's frames."""
    return loading.load_artifact(artifact)


@pytest.fixture
def weekly_histograms(fixture_tables: pathlib.Path) -> pandas.DataFrame:
    """The fixture's trace table."""
    return loading.load_trace_table(fixture_tables)


@pytest.fixture
def connection(frames: loading.ArtifactFrames, weekly_histograms: pandas.DataFrame) -> duckdb.DuckDBPyConnection:
    """The site's database over the fixture artifact's frames and the fixture's trace table."""
    return site_database.open_database(frames, weekly_histograms)


@pytest.fixture(scope="session")
def fixture_trace(tmp_path_factory: pytest.TempPathFactory) -> pathlib.Path:
    """The fixture trace's Parquet file, written once for the run."""
    return fixture_artifact.write_fixture_trace(tmp_path_factory.mktemp("trace") / "trace.parquet")


@pytest.fixture(scope="session")
def fixture_tables(artifact: pathlib.Path, fixture_trace: pathlib.Path,
                   tmp_path_factory: pytest.TempPathFactory) -> pathlib.Path:
    """The tables folder the trace table's builder writes from the fixture trace and artifact, once for the run."""
    folder = tmp_path_factory.mktemp("tables")
    tables.main(["--trace", str(fixture_trace), "--artifact", str(artifact), "--out", str(folder)])
    return folder


@pytest.fixture
def trace_connection(frames: loading.ArtifactFrames, fixture_trace: pathlib.Path) -> duckdb.DuckDBPyConnection:
    """The trace table's database over the fixture artifact's frames and the fixture trace."""
    return tables.open_trace_database(frames, fixture_trace)


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
