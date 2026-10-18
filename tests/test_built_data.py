"""The built data, as `make data` wrote it and git tracks it: every file of it tracked, the figure answers' index
listing exactly the figure answers tracked, every query's answer there (a family query's one per family) and written
from its current text, the by-family histograms counting the requests the daily answer counts, and the answers and the
figure answers with their index the same as a rebuild from the artifact's checkout (`ARTIFACT`; skipped, saying so,
without one) and the tracked trace table."""

import json
import pathlib

import counted_requests
from repository_root import ROOT
from site_data import answer_files, answers, figure_answers, loading, site_database

DATA_FOLDER = ROOT / "site" / "data"  # the answers make data writes
# One answer per figure.
FIGURE_ANSWERS_FOLDER = DATA_FOLDER / answer_files.ANSWERS_FOLDER / answer_files.FIGURE_ANSWERS_FOLDER
FIGURE_INDEX = DATA_FOLDER / answer_files.ANSWERS_FOLDER / answer_files.FIGURE_INDEX_FILE  # each answer's row count


def test_the_built_data_is_tracked(tracked_files: set[str]) -> None:
    """Every file make data wrote is committed, so a clone serves what the maintainer built."""
    for path in sorted(DATA_FOLDER.rglob("*")):
        if path.is_file():
            assert path.relative_to(ROOT).as_posix() in tracked_files, f"{path.relative_to(ROOT)} is not tracked"


def test_the_tracked_figure_answers_are_the_ones_their_index_lists(tracked_files: set[str]) -> None:
    listed = listed_figure_answer_files(FIGURE_INDEX.read_text())
    assert listed, "the figure answers' index lists no figure"
    mismatches = figure_answer_mismatches(listed, tracked_files)
    assert mismatches == [], "the figure answers' index and the tracked answers differ:\n" + "\n".join(mismatches)


def test_a_listed_figure_answer_that_is_not_tracked_is_named(tracked_files: set[str]) -> None:
    index = json.loads(FIGURE_INDEX.read_text())
    index["fig_planted"] = 1
    mismatches = figure_answer_mismatches(listed_figure_answer_files(json.dumps(index)), tracked_files)
    assert mismatches == ["listed in the index but not tracked: site/data/all/figures/fig_planted.json"]


def listed_figure_answer_files(index_text: str) -> set[str]:
    """The answer file of every figure of the figure answers' index `index_text`, as a path relative to the
    repository."""
    listed = set()
    for name in json.loads(index_text):
        listed.add((DATA_FOLDER / answer_files.figure_answer_path(name)).relative_to(ROOT).as_posix())
    return listed


def figure_answer_mismatches(listed: set[str], tracked: set[str]) -> list[str]:
    """Each figure answer of `listed` that git does not track, then each one git tracks that is not `listed`; empty
    when the two agree."""
    answers_folder = FIGURE_ANSWERS_FOLDER.relative_to(ROOT).as_posix()
    tracked_answers = {name for name in tracked if name.startswith(f"{answers_folder}/")}
    mismatches = [f"listed in the index but not tracked: {name}" for name in sorted(listed - tracked_answers)]
    mismatches.extend(f"tracked but not in the index: {name}" for name in sorted(tracked_answers - listed))
    return mismatches


def test_every_query_has_its_answer() -> None:
    for name in answers.single_answer_query_names():
        assert (DATA_FOLDER / answer_files.answer_path(name)).is_file(), f"{name} has no answer; run make data"


def test_a_family_query_has_one_answer_per_family_and_no_other() -> None:
    """Each family query's folder holds one file per family of the family mix, named by its slug."""
    family_rows = json.loads((DATA_FOLDER / answer_files.answer_path(answers.FAMILIES_QUERY)).read_text())
    families = answers.families(family_rows)
    slugs = {family.slug for family in families}
    assert len(slugs) == len(families), "two families share a slug, and so one answer file"
    for name in answers.FAMILY_QUERIES:
        written = {path.stem for path in (DATA_FOLDER / answer_files.ANSWERS_FOLDER / name).glob("*.json")}
        assert written == slugs, f"{name}'s answers are not one per family; run make data"


def test_every_answer_comes_from_its_query_s_current_text() -> None:
    assert answers.stale_queries(DATA_FOLDER) == [], "queries edited since make data last ran; run make data"


def test_the_histograms_by_family_count_the_requests_the_daily_answer_counts() -> None:
    """Each family's requests in its histograms of a metric are the daily answer's requests that record the metric, so
    the trace table and the daily rollup the bars are drawn from agree on every family."""
    histograms = json.loads((DATA_FOLDER / answer_files.answer_path("explore/histograms_by_family")).read_text())
    daily = json.loads((DATA_FOLDER / answer_files.answer_path("explore/daily_by_family")).read_text())
    in_histograms = counted_requests.histogram_requests(histograms)
    assert in_histograms == counted_requests.daily_counted_requests(daily), "the histograms and the daily answer differ"


def test_the_answers_are_the_ones_the_artifact_gives(artifact_checkout: pathlib.Path, tmp_path: pathlib.Path) -> None:
    """The query answers and the figure answers, with their hashes and index, rebuilt from the artifact's checkout are
    the committed ones, file for file and byte for byte."""
    weekly_histograms = loading.load_trace_table(loading.TABLES_FOLDER)
    connection = site_database.open_database(loading.load_artifact(artifact_checkout), weekly_histograms)
    answers.write_answers(connection, tmp_path)
    figure_answers.write_figure_answers(figure_answers.read_figure_tables(artifact_checkout), tmp_path)
    rebuilt = files_by_name(tmp_path / answer_files.ANSWERS_FOLDER)
    committed = files_by_name(DATA_FOLDER / answer_files.ANSWERS_FOLDER)
    assert sorted(rebuilt) == sorted(committed), "the answers' files differ from a rebuild; run make data"
    for name, path in rebuilt.items():
        assert path.read_bytes() == committed[name].read_bytes(), f"{name} differs from a rebuild; run make data"


def files_by_name(folder: pathlib.Path) -> dict[str, pathlib.Path]:
    """Every file under `folder`, by its path relative to `folder`."""
    return {path.relative_to(folder).as_posix(): path for path in folder.rglob("*") if path.is_file()}
