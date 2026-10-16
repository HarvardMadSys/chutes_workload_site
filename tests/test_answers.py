"""The answers over the fixture artifact: one file per Explore query holding its live rows, and the hashes that tell a
query edited since its answer was written."""

import datetime
import json
import pathlib
import shutil

import duckdb
import pytest

from site_data import answers, paths, site_database


@pytest.fixture
def data_directory(connection: duckdb.DuckDBPyConnection, tmp_path: pathlib.Path) -> pathlib.Path:
    """A data folder holding the fixture's answers."""
    answers.write_answers(connection, tmp_path / "data")
    return tmp_path / "data"


def test_every_explore_query_has_its_answer(connection: duckdb.DuckDBPyConnection, tmp_path: pathlib.Path) -> None:
    written = answers.write_answers(connection, tmp_path / "data")
    expected = []
    for name in answers.answered_query_names():
        expected.append(tmp_path / "data" / paths.answer_file(name))
    assert written == expected
    assert len(expected) == 7


@pytest.mark.parametrize("name", answers.answered_query_names())
def test_an_answer_holds_its_query_s_live_rows(connection: duckdb.DuckDBPyConnection, data_directory: pathlib.Path,
                                               name: str) -> None:
    written = json.loads((data_directory / paths.answer_file(name)).read_text())
    assert written, f"{name} has no rows over the fixture"
    assert written == answers.answer_rows(connection, name)
    assert list(written[0]) == site_database.run_query(connection, name).columns


def test_dates_and_nulls_are_written_as_json(data_directory: pathlib.Path) -> None:
    rollup = json.loads((data_directory / paths.answer_file("explore/daily_rollup")).read_text())
    assert rollup[1]["day"] == "2025-04-11"
    assert rollup[1]["ttft_sum"] is None
    assert isinstance(rollup[1]["requests"], int) and isinstance(rollup[1]["input_tokens"], float)


def test_an_answer_value_is_its_json_form() -> None:
    assert answers.json_value(datetime.date(2025, 4, 11)) == "2025-04-11"
    assert answers.json_value(float("nan")) is None
    assert answers.json_value(3) == 3


def test_the_hashes_cover_every_answer_and_the_top_models(data_directory: pathlib.Path) -> None:
    recorded = json.loads((data_directory / paths.ANSWERS_FOLDER / paths.QUERY_HASHES_FILE).read_text())
    assert sorted(recorded) == sorted(answers.answered_query_names() + ["setup/top_models"])
    assert answers.stale_queries(data_directory) == []


@pytest.mark.parametrize("edited", ["explore/model_mix", "setup/top_models"])
def test_an_edited_query_is_stale(data_directory: pathlib.Path, tmp_path: pathlib.Path, edited: str) -> None:
    queries_folder = tmp_path / "queries"
    shutil.copytree(site_database.QUERIES_FOLDER, queries_folder)
    with (queries_folder / f"{edited}.sql").open("a") as query:
        query.write("-- edited\n")
    assert answers.stale_queries(data_directory, queries_folder) == [edited]


def test_a_removed_query_keeps_no_answer(connection: duckdb.DuckDBPyConnection, data_directory: pathlib.Path) -> None:
    left_over = data_directory / paths.answer_file("explore/removed_query")
    left_over.write_text("[]\n")
    answers.write_answers(connection, data_directory)
    assert not left_over.exists()
