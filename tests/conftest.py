"""Fixtures shared by the tests: the fixture artifact (`fixture_artifact.py`), its frames and the site's database over
them; the artifact's own checkout, which the environment variable `ARTIFACT` names, as `make test` passes it; and the
files git tracks."""

import os
import pathlib
import subprocess

import duckdb
import pytest

import fixture_artifact
from repository_root import ROOT
from site_data import figure_answers, loading, site_database


@pytest.fixture(scope="session")
def artifact(tmp_path_factory: pytest.TempPathFactory) -> pathlib.Path:
    """The fixture artifact, written once for the run; a test that changes it writes its own instead."""
    return fixture_artifact.write_fixture_artifact(tmp_path_factory.mktemp("artifact"))


@pytest.fixture
def frames(artifact: pathlib.Path) -> loading.ArtifactFrames:
    """The fixture artifact's frames."""
    return loading.load_artifact(artifact)


@pytest.fixture
def connection(frames: loading.ArtifactFrames) -> duckdb.DuckDBPyConnection:
    """The site's database over the fixture artifact's frames."""
    return site_database.open_database(frames)


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
