"""The data step's command: it writes the answers and the figure answers from an artifact and the trace table, and
writes nothing when the artifact, one of its files or the trace table is missing."""

import pathlib
import re

import pytest

import fixture_artifact
from repository_root import ROOT
from site_data import __main__, answer_files, answers, figure_answers, loading


def command(artifact: pathlib.Path, tables_folder: pathlib.Path, output: pathlib.Path) -> list[str]:
    """The command line of a build from `artifact` and the trace table of `tables_folder` into `output`'s data
    folder."""
    return ["--artifact", str(artifact), "--tables", str(tables_folder), "--out", str(output / "data")]


def test_the_step_writes_every_answer_and_prints_its_size(artifact: pathlib.Path, fixture_tables: pathlib.Path,
                                                           tmp_path: pathlib.Path,
                                                           capsys: pytest.CaptureFixture) -> None:
    """The query answers and the figure answers with their index, each printed with its size."""
    __main__.main(command(artifact, fixture_tables, tmp_path))
    printed = capsys.readouterr().out
    for name in answers.single_answer_query_names():
        answer = tmp_path / "data" / answer_files.answer_path(name)
        assert f"{answer}  {answer.stat().st_size:,} bytes" in printed
    for name in answers.FAMILY_QUERIES:
        family_answer = tmp_path / "data" / answer_files.answer_path(name, "gpt-oss")
        assert f"{family_answer}  {family_answer.stat().st_size:,} bytes" in printed
    # Five, and one per family of three for each of the two family queries.
    assert re.search(r"^11 answers, [\d,]+ bytes$", printed, re.MULTILINE)
    figure_answer = tmp_path / "data" / answer_files.figure_answer_path("fig_seasonality")
    assert f"{figure_answer}  {figure_answer.stat().st_size:,} bytes" in printed
    assert re.search(r"^10 figure answers, [\d,]+ bytes$", printed, re.MULTILINE)  # one per chart kind
    assert (tmp_path / "data" / answer_files.ANSWERS_FOLDER / answer_files.FIGURE_INDEX_FILE).is_file()


def test_a_missing_artifact_folder_stops_before_writing(fixture_tables: pathlib.Path, tmp_path: pathlib.Path) -> None:
    """The step stops naming the first file it misses, the first cache, and how to supply it."""
    first_cache = tmp_path / "no_artifact" / loading.CACHE_FOLDER / f"{loading.CACHE_NAMES[0]}.parquet"
    with pytest.raises(SystemExit, match=re.escape(f"missing {first_cache}: {loading.ARTIFACT_FILE_HINT}")):
        __main__.main(command(tmp_path / "no_artifact", fixture_tables, tmp_path))
    assert not (tmp_path / "data").exists()


def test_a_missing_cache_stops_before_writing(fixture_tables: pathlib.Path, tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path / "artifact")
    (artifact / "data" / "paper" / "cache" / "daily_rollup.parquet").unlink()
    with pytest.raises(SystemExit, match="daily_rollup.parquet"):
        __main__.main(command(artifact, fixture_tables, tmp_path))
    assert not (tmp_path / "data").exists()


def test_a_missing_trace_table_stops_before_writing(artifact: pathlib.Path, tmp_path: pathlib.Path) -> None:
    missing = tmp_path / "no_tables" / loading.TRACE_TABLE_FILE
    with pytest.raises(SystemExit, match=re.escape(f"missing {missing}: run make tables")):
        __main__.main(command(artifact, tmp_path / "no_tables", tmp_path))
    assert not (tmp_path / "data").exists()


def test_the_tables_folder_is_by_default_the_repository_s() -> None:
    options = __main__.parsed_arguments(["--artifact", "artifact", "--out", "data"])
    assert options.tables == ROOT / "tables"


def test_a_missing_plotdata_stops_before_writing(fixture_tables: pathlib.Path, tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path / "artifact")
    missing = artifact / figure_answers.PLOTDATA_FOLDER / "fig_routing_tradeoff.parquet"
    missing.unlink()
    with pytest.raises(SystemExit, match=re.escape(str(missing))):
        __main__.main(command(artifact, fixture_tables, tmp_path))
    assert not (tmp_path / "data").exists()

