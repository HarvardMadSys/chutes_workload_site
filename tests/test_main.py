"""The data step's command: it writes the answers and the figure images from an artifact, and writes nothing when the
artifact or one of its files is missing."""

import pathlib
import re

import pytest

import fixture_artifact
from site_data import __main__, answers, paths


def command(artifact: pathlib.Path, output: pathlib.Path) -> list[str]:
    """The command line of a build from `artifact` into `output`'s data and figures folders."""
    return ["--artifact", str(artifact), "--out", str(output / "data"), "--figures", str(output / "figures")]


def test_the_step_writes_every_answer_and_image_and_prints_its_size(artifact: pathlib.Path, tmp_path: pathlib.Path,
                                                           capsys: pytest.CaptureFixture) -> None:
    __main__.main(command(artifact, tmp_path))
    printed = capsys.readouterr().out
    for name in answers.answered_query_names():
        answer = tmp_path / "data" / paths.answer_file(name)
        assert f"{answer}  {answer.stat().st_size:,} bytes" in printed
    assert re.search(r"^7 answers, [\d,]+ bytes$", printed, re.MULTILINE)
    image = tmp_path / "figures" / "fig_panel.png"
    assert f"{image}  {image.stat().st_size:,} bytes" in printed
    assert re.search(r"^2 figure images, [\d,]+ bytes$", printed, re.MULTILINE)


def test_a_missing_artifact_folder_stops_before_writing(tmp_path: pathlib.Path, capsys: pytest.CaptureFixture) -> None:
    with pytest.raises(SystemExit) as stop:
        __main__.main(command(tmp_path / "no_artifact", tmp_path))
    assert stop.value.code == 1
    assert "no_artifact does not exist" in capsys.readouterr().err
    assert not (tmp_path / "data").exists()


def test_a_missing_cache_stops_before_writing(tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path / "artifact")
    (artifact / "data" / "paper" / "cache" / "daily_rollup.parquet").unlink()
    with pytest.raises(SystemExit, match="daily_rollup.parquet"):
        __main__.main(command(artifact, tmp_path))
    assert not (tmp_path / "data").exists()


def test_a_missing_figure_stops_before_writing(tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path / "artifact")
    (artifact / fixture_artifact.EXTERNAL_FIGURE).unlink()
    with pytest.raises(SystemExit, match=fixture_artifact.EXTERNAL_FIGURE.name):
        __main__.main(command(artifact, tmp_path))
    assert not (tmp_path / "data").exists()
    assert not (tmp_path / "figures").exists()
