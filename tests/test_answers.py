"""The answers over the fixture artifact: one file per query of `queries/explore/` holding its live rows, a family
query's one per family, the sums that tie a family's answers to the by-family ones, and the hashes that tell a query
edited since its answer was written."""

import datetime
import json
import pathlib
import shutil
import typing

import duckdb
import pytest

import fixture_artifact
from site_data import answers, figure_answers, paths, site_database

# The fixture's families, as the by-family answer orders them: by requests, Other last.
FIXTURE_FAMILIES = [answers.Family("DeepSeek", "deepseek"), answers.Family("gpt-oss", "gpt-oss"),
                    answers.Family("Other", "other")]


@pytest.fixture
def data_directory(connection: duckdb.DuckDBPyConnection, tmp_path: pathlib.Path) -> pathlib.Path:
    """A data folder holding the fixture's answers."""
    answers.write_answers(connection, tmp_path / "data")
    return tmp_path / "data"


def test_every_explore_query_has_its_answer(connection: duckdb.DuckDBPyConnection, tmp_path: pathlib.Path) -> None:
    written = answers.write_answers(connection, tmp_path / "data")
    expected = []
    for name in answers.single_answer_query_names():
        expected.append(tmp_path / "data" / paths.answer_file(name))
    for family in FIXTURE_FAMILIES:
        for name in answers.FAMILY_QUERIES:
            expected.append(tmp_path / "data" / paths.family_answer_file(name, family.slug))
    assert written == expected
    assert len(expected) == 5 + 2 * 3


def test_the_single_answers_are_a_folder_s_queries_but_the_family_ones(tmp_path: pathlib.Path) -> None:
    queries_folder = tmp_path / "queries"
    shutil.copytree(site_database.QUERIES_FOLDER, queries_folder)
    (queries_folder / "explore" / "added.sql").write_text("SELECT 1 AS one;\n")
    names = answers.single_answer_query_names(queries_folder)
    assert "explore/added" in names
    assert "explore/daily_by_family" in names
    assert "explore/daily_by_model" not in names
    assert "explore/histograms_by_model" not in names


def test_the_families_are_ordered_by_requests_with_other_last(connection: duckdb.DuckDBPyConnection) -> None:
    family_rows = answers.answer_rows(connection, answers.FAMILIES_QUERY)
    assert answers.families(family_rows) == FIXTURE_FAMILIES


@pytest.mark.parametrize("name", answers.single_answer_query_names())
def test_an_answer_holds_its_query_s_live_rows(connection: duckdb.DuckDBPyConnection, data_directory: pathlib.Path,
                                               name: str) -> None:
    written = json.loads((data_directory / paths.answer_file(name)).read_text())
    assert written, f"{name} has no rows over the fixture"
    assert written == answers.answer_rows(connection, name)
    assert list(written[0]) == site_database.run_query(connection, name).columns


@pytest.mark.parametrize("name", answers.FAMILY_QUERIES)
@pytest.mark.parametrize("family", FIXTURE_FAMILIES)
def test_a_family_answer_holds_its_query_s_live_rows_for_the_family(connection: duckdb.DuckDBPyConnection,
                                                                    data_directory: pathlib.Path,
                                                                    family: answers.Family, name: str) -> None:
    written = json.loads((data_directory / paths.family_answer_file(name, family.slug)).read_text())
    assert written, f"{name} has no rows for {family.name} over the fixture"
    assert written == answers.answer_rows(connection, name, {"family": family.name})


def test_the_daily_rows_by_family_sum_to_the_trace_totals(data_directory: pathlib.Path) -> None:
    by_family = json.loads((data_directory / paths.answer_file("explore/daily_by_family")).read_text())
    [totals] = json.loads((data_directory / paths.answer_file("explore/trace_totals")).read_text())
    assert sum(row["requests"] for row in by_family) == totals["requests"] == fixture_artifact.TOTAL_REQUESTS


@pytest.mark.parametrize("family", FIXTURE_FAMILIES)
def test_a_family_s_model_rows_sum_to_its_rows_by_family(data_directory: pathlib.Path, family: answers.Family) -> None:
    by_family = json.loads((data_directory / paths.answer_file("explore/daily_by_family")).read_text())
    by_model_file = data_directory / paths.family_answer_file("explore/daily_by_model", family.slug)
    by_model = json.loads(by_model_file.read_text())
    for column in ["requests", "input_counted", "output_counted", "ttft_counted"]:
        family_sum = sum(row[column] for row in by_family if row["family"] == family.name)
        assert sum(row[column] for row in by_model) == family_sum, f"{family.name}'s {column}"


class HistogramBin(typing.NamedTuple):
    """One bin of a trace week's histogram of one endpoint group and metric."""

    week: int
    endpoint_group: str
    metric: str
    bin: int


def histogram_requests(rows: list[dict]) -> dict[HistogramBin, int]:
    """The requests of histogram answer rows per week, endpoint group, metric and bin, summed over the rows."""
    requests = {}
    for row in rows:
        for bin_number, bin_requests in zip(row["bins"], row["requests"], strict=True):
            key = HistogramBin(row["week"], row["endpoint_group"], row["metric"], bin_number)
            requests[key] = requests.get(key, 0) + bin_requests
    return requests


@pytest.mark.parametrize("family", FIXTURE_FAMILIES)
def test_a_family_s_model_histograms_sum_bin_by_bin_to_its_histograms_by_family(data_directory: pathlib.Path,
                                                                                family: answers.Family) -> None:
    by_family = json.loads((data_directory / paths.answer_file("explore/histograms_by_family")).read_text())
    by_model_file = data_directory / paths.family_answer_file("explore/histograms_by_model", family.slug)
    by_model = json.loads(by_model_file.read_text())
    family_rows = [row for row in by_family if row["family"] == family.name]
    assert family_rows, f"{family.name} has no histograms"
    assert histogram_requests(by_model) == histogram_requests(family_rows)


def test_the_input_histograms_count_the_daily_rows_input_requests(data_directory: pathlib.Path) -> None:
    """Each family's requests in its `input_tokens` histograms are the requests that recorded an input count."""
    by_family = json.loads((data_directory / paths.answer_file("explore/histograms_by_family")).read_text())
    daily = json.loads((data_directory / paths.answer_file("explore/daily_by_family")).read_text())
    histogram_counts = {}
    for row in by_family:
        if row["metric"] == "input_tokens":
            histogram_counts[row["family"]] = histogram_counts.get(row["family"], 0) + sum(row["requests"])
    daily_counts = {}
    for row in daily:
        daily_counts[row["family"]] = daily_counts.get(row["family"], 0) + row["input_counted"]
    assert histogram_counts == daily_counts


def test_dates_and_nulls_are_written_as_json(data_directory: pathlib.Path) -> None:
    by_family = json.loads((data_directory / paths.answer_file("explore/daily_by_family")).read_text())
    assert by_family[1]["day"] == "2025-04-11"
    assert by_family[1]["ttft_sum"] is None
    assert isinstance(by_family[1]["requests"], int) and isinstance(by_family[1]["input_tokens"], float)
    deepseek = json.loads((data_directory / paths.family_answer_file("explore/daily_by_model", "deepseek")).read_text())
    assert deepseek[2]["chute_id"] is None and deepseek[2]["model"] == "Other DeepSeek"


def test_an_answer_value_is_its_json_form() -> None:
    assert answers.json_value(datetime.date(2025, 4, 11)) == "2025-04-11"
    assert answers.json_value(float("nan")) is None
    assert answers.json_value(3) == 3
    assert answers.json_value([13, 14, 18]) == [13, 14, 18]


def test_a_list_is_written_as_a_json_array_of_integers(data_directory: pathlib.Path) -> None:
    by_family_file = data_directory / paths.answer_file("explore/histograms_by_family")
    assert '"bins":[22],"requests":[40]}' in by_family_file.read_text()
    first_row = json.loads(by_family_file.read_text())[0]
    assert first_row["first_day"] == "2025-04-11"
    assert all(isinstance(value, int) for value in first_row["bins"] + first_row["requests"])


def test_the_hashes_cover_every_query_once_and_the_setup_query(data_directory: pathlib.Path) -> None:
    recorded = json.loads((data_directory / paths.ANSWERS_FOLDER / paths.QUERY_HASHES_FILE).read_text())
    assert sorted(recorded) == sorted(answers.answered_query_names() + ["setup/family_models"])
    assert "explore/daily_by_model" in recorded
    assert answers.stale_queries(data_directory) == []


@pytest.mark.parametrize("edited", ["explore/family_mix", "explore/daily_by_model", "explore/histograms_by_model",
                                    "setup/family_models"])
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


def test_the_figure_answers_written_first_are_kept(artifact: pathlib.Path, connection: duckdb.DuckDBPyConnection,
                                                   tmp_path: pathlib.Path) -> None:
    """The query answers clear only their own files: figure answers written before them are still there."""
    data_directory = tmp_path / "data"
    figure_files = figure_answers.write_figure_answers(figure_answers.read_figure_tables(artifact), data_directory)
    answer_files = answers.write_answers(connection, data_directory)
    for path in figure_files + answer_files:
        assert path.is_file(), f"{path} is gone"
    assert (data_directory / paths.ANSWERS_FOLDER / paths.FIGURE_INDEX_FILE).is_file()
