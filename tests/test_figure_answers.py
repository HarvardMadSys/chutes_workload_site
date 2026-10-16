"""The figure answers over the fixture artifact: every listed figure is answered, in the list's order, each answer
holds its plot-ready table's rows column for column, the index holds each answer's row count, a missing table stops
the step naming it before anything is written, and a rebuild writes the same bytes."""

import hashlib
import json
import pathlib
import re

import pandas
import pandas.testing
import pytest

import fixture_artifact
import fixture_plotdata
from site_data import figure_answers, paths


def figures_folder(data_directory: pathlib.Path) -> pathlib.Path:
    """The folder of the figure answers in the data folder `data_directory`."""
    return data_directory / paths.ANSWERS_FOLDER / paths.FIGURE_ANSWERS_FOLDER


def file_hashes(folder: pathlib.Path) -> dict[str, str]:
    """Each file under the folder, by its path relative to it, to the SHA-256 of its bytes."""
    hashes = {}
    for path in sorted(folder.rglob("*")):
        if path.is_file():
            hashes[path.relative_to(folder).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return hashes


def test_every_listed_figure_is_named_in_the_list_s_order(artifact: pathlib.Path) -> None:
    expected = [figure.stem for figure in fixture_artifact.figure_files()]
    assert figure_answers.listed_figures(artifact) == expected
    assert sorted(expected) == sorted(fixture_plotdata.plotdata_tables())


def test_every_listed_figure_is_answered(artifact: pathlib.Path, tmp_path: pathlib.Path) -> None:
    written = figure_answers.write_figure_answers(figure_answers.read_figure_tables(artifact), tmp_path)
    expected = [figures_folder(tmp_path) / f"{name}.json" for name in figure_answers.listed_figures(artifact)]
    assert written == expected
    assert sorted(figures_folder(tmp_path).iterdir()) == sorted(expected)


@pytest.mark.parametrize("figure", sorted(fixture_plotdata.plotdata_tables()))
def test_an_answer_equals_its_plotdata_column_for_column(artifact: pathlib.Path, tmp_path: pathlib.Path,
                                                         figure: str) -> None:
    """The answer, read back as a frame, is the table as pandas reads it: the same columns in the same order, the same
    values, integers as integers and a NaN or a null as a missing value."""
    figure_answers.write_figure_answers(figure_answers.read_figure_tables(artifact), tmp_path)
    answer = json.loads((figures_folder(tmp_path) / f"{figure}.json").read_text())
    plotdata = pandas.read_parquet(artifact / figure_answers.PLOTDATA_FOLDER / f"{figure}.parquet")
    pandas.testing.assert_frame_equal(pandas.DataFrame(answer), plotdata)


def test_an_answer_writes_a_missing_value_as_null(artifact: pathlib.Path, tmp_path: pathlib.Path) -> None:
    figure_answers.write_figure_answers(figure_answers.read_figure_tables(artifact), tmp_path)
    cells = json.loads((figures_folder(tmp_path) / "fig_seasonality.json").read_text())
    assert cells[1] == {"x_low": 1, "x_high": 2, "y_low": 0, "y_high": 1, "value": None}  # a NaN in the table
    lines = json.loads((figures_folder(tmp_path) / "fig_routing_tradeoff.json").read_text())
    assert lines[2] == {"panel": "b", "series": "Global", "x": 0, "y": None}  # a null in the table


def test_the_index_holds_each_figure_s_row_count_in_the_list_s_order(artifact: pathlib.Path,
                                                                    tmp_path: pathlib.Path) -> None:
    figure_answers.write_figure_answers(figure_answers.read_figure_tables(artifact), tmp_path)
    index = json.loads((tmp_path / paths.ANSWERS_FOLDER / paths.FIGURE_INDEX_FILE).read_text())
    assert list(index) == figure_answers.listed_figures(artifact)
    for name, table in fixture_plotdata.plotdata_tables().items():
        assert index[name] == table.num_rows, name


def test_a_missing_plotdata_stops_naming_it(tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path / "artifact")
    missing = artifact / figure_answers.PLOTDATA_FOLDER / "fig_lb_user_zoom_top.parquet"
    missing.unlink()
    with pytest.raises(SystemExit, match=re.escape(str(missing))):
        figure_answers.read_figure_tables(artifact)


def test_an_answer_no_longer_listed_is_removed(artifact: pathlib.Path, tmp_path: pathlib.Path) -> None:
    figures_folder(tmp_path).mkdir(parents=True)
    (figures_folder(tmp_path) / "fig_removed.json").write_text("[]\n")
    figure_answers.write_figure_answers(figure_answers.read_figure_tables(artifact), tmp_path)
    assert not (figures_folder(tmp_path) / "fig_removed.json").exists()


def test_a_rebuild_writes_the_same_bytes(artifact: pathlib.Path, tmp_path: pathlib.Path) -> None:
    figure_answers.write_figure_answers(figure_answers.read_figure_tables(artifact), tmp_path / "first")
    figure_answers.write_figure_answers(figure_answers.read_figure_tables(artifact), tmp_path / "second")
    assert file_hashes(tmp_path / "first") == file_hashes(tmp_path / "second")
    assert len(file_hashes(tmp_path / "first")) == len(fixture_artifact.figure_files()) + 1  # and the index
