"""Fixtures shared by the tests: the fixture artifact (`fixture_artifact.py`), its frames and the site's database over
them."""

import pathlib

import duckdb
import pytest

import fixture_artifact
from site_data import loading, site_database


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
