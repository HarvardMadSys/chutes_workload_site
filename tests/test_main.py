"""The data step's command: it writes the answers, the figure answers and the figure images from an artifact, and
writes nothing when the artifact or one of its files is missing, or a figure does not render."""

import pathlib
import re

import pytest

import fixture_artifact
from site_data import __main__, answers, figure_answers, paths


def command(artifact: pathlib.Path, output: pathlib.Path) -> list[str]:
    """The command line of a build from `artifact` into `output`'s data and figures folders."""
    return ["--artifact", str(artifact), "--out", str(output / "data"), "--figures", str(output / "figures")]


def test_the_step_writes_every_answer_and_image_and_prints_its_size(artifact: pathlib.Path, tmp_path: pathlib.Path,
                                                                    capsys: pytest.CaptureFixture) -> None:
    """The query answers, the figure answers with their index, and the images, each printed with its size."""
    __main__.main(command(artifact, tmp_path))
    printed = capsys.readouterr().out
    for name in answers.single_answer_query_names():
        answer = tmp_path / "data" / paths.answer_file(name)
        assert f"{answer}  {answer.stat().st_size:,} bytes" in printed
    family_answer = tmp_path / "data" / paths.family_answer_file("explore/daily_by_model", "gpt-oss")
    assert f"{family_answer}  {family_answer.stat().st_size:,} bytes" in printed
    assert re.search(r"^10 answers, [\d,]+ bytes$", printed, re.MULTILINE)  # seven, and one per family of three
    figure_answer = tmp_path / "data" / paths.ANSWERS_FOLDER / paths.FIGURE_ANSWERS_FOLDER / "fig_seasonality.json"
    assert f"{figure_answer}  {figure_answer.stat().st_size:,} bytes" in printed
    assert re.search(r"^10 figure answers, [\d,]+ bytes$", printed, re.MULTILINE)  # one per chart kind
    assert (tmp_path / "data" / paths.ANSWERS_FOLDER / paths.FIGURE_INDEX_FILE).is_file()
    image = tmp_path / "figures" / "fig_seasonality.png"
    assert f"{image}  {image.stat().st_size:,} bytes" in printed
    assert re.search(r"^10 figure images, [\d,]+ bytes$", printed, re.MULTILINE)


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


def test_a_missing_plotdata_stops_before_writing(tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path / "artifact")
    missing = artifact / figure_answers.PLOTDATA_FOLDER / "fig_routing_tradeoff.parquet"
    missing.unlink()
    with pytest.raises(SystemExit, match=re.escape(str(missing))):
        __main__.main(command(artifact, tmp_path))
    assert not (tmp_path / "data").exists()
    assert not (tmp_path / "figures").exists()


def test_a_missing_figure_stops_before_writing(tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path / "artifact")
    (artifact / fixture_artifact.EXTERNAL_FIGURE).unlink()
    with pytest.raises(SystemExit, match=fixture_artifact.EXTERNAL_FIGURE.name):
        __main__.main(command(artifact, tmp_path))
    assert not (tmp_path / "data").exists()
    assert not (tmp_path / "figures").exists()


def test_a_figure_of_two_pages_stops_before_writing(tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path / "artifact")
    two_pages = fixture_artifact.pdf_bytes(fixture_artifact.FIGURE_WIDTH_POINTS, fixture_artifact.FIGURE_HEIGHT_POINTS,
                                           pages=2)
    (artifact / fixture_artifact.SECTION_FIGURE).write_bytes(two_pages)
    with pytest.raises(SystemExit, match="has 2 pages"):
        __main__.main(command(artifact, tmp_path))
    assert not (tmp_path / "data").exists()
    assert not (tmp_path / "figures").exists()


def test_a_figure_that_does_not_render_stops_before_writing(tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path / "artifact")
    (artifact / fixture_artifact.EXTERNAL_FIGURE).write_bytes(fixture_artifact.unrenderable_pdf_bytes())
    with pytest.raises(SystemExit, match=re.escape(f"{fixture_artifact.EXTERNAL_FIGURE.name} does not render")):
        __main__.main(command(artifact, tmp_path))
    assert not (tmp_path / "data").exists()
    assert not (tmp_path / "figures").exists()
