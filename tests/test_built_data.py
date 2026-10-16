"""The built data, as `make data` wrote it and git tracks it: every file of it tracked, the images the figure index
lists exactly the images tracked, none too large, every query's answer there and written from its current text, and
the answers, the images and their index the same as a rebuild from the artifact's checkout (`ARTIFACT`; skipped,
saying so, without one)."""

import json
import pathlib

from repository_root import ROOT
from site_data import answers, figure_images, loading, paths, site_database

DATA_FOLDER = ROOT / "site" / "data"  # the answers make data writes
FIGURES_FOLDER = ROOT / "site" / "figures"  # the figure images make data writes, with their index
MAX_IMAGE_BYTES = 4 * 1024 * 1024  # an image larger than this is rendered at too high a resolution for its card


def test_the_built_data_is_tracked(tracked_files: set[str]) -> None:
    """Every file make data wrote is committed, so a clone serves what the maintainer built."""
    for folder in [DATA_FOLDER, FIGURES_FOLDER]:
        for path in sorted(folder.rglob("*")):
            if path.is_file():
                assert path.relative_to(ROOT).as_posix() in tracked_files, f"{path.relative_to(ROOT)} is not tracked"


def test_the_tracked_images_are_the_ones_the_index_lists(tracked_files: set[str]) -> None:
    listed = listed_image_files((FIGURES_FOLDER / figure_images.INDEX_FILE).read_text())
    assert listed, "the figure index lists no image"
    mismatches = image_mismatches(listed, tracked_files)
    assert mismatches == [], "the figure index and the tracked images differ:\n" + "\n".join(mismatches)


def test_a_listed_image_that_is_not_tracked_is_named(tracked_files: set[str]) -> None:
    index = json.loads((FIGURES_FOLDER / figure_images.INDEX_FILE).read_text())
    index.append({"name": "fig_planted", "width": 1, "height": 1})
    mismatches = image_mismatches(listed_image_files(json.dumps(index)), tracked_files)
    assert mismatches == ["listed in the index but not tracked: site/figures/fig_planted.png"]


def listed_image_files(index_text: str) -> set[str]:
    """The image file of every entry of the figure index `index_text`, as a path relative to the repository."""
    listed = set()
    for image in json.loads(index_text):
        listed.add((FIGURES_FOLDER / f"{image['name']}.png").relative_to(ROOT).as_posix())
    return listed


def image_mismatches(listed: set[str], tracked: set[str]) -> list[str]:
    """Each image of `listed` that git does not track, then each image git tracks in the figures folder that is not
    `listed`; empty when the two agree."""
    figures_folder = FIGURES_FOLDER.relative_to(ROOT).as_posix()
    tracked_images = {name for name in tracked if name.startswith(f"{figures_folder}/") and name.endswith(".png")}
    mismatches = [f"listed in the index but not tracked: {name}" for name in sorted(listed - tracked_images)]
    mismatches.extend(f"tracked but not in the index: {name}" for name in sorted(tracked_images - listed))
    return mismatches


def test_no_image_is_too_large() -> None:
    for path in sorted(FIGURES_FOLDER.glob("*.png")):
        assert path.stat().st_size <= MAX_IMAGE_BYTES, f"{path.relative_to(ROOT)} is {path.stat().st_size:,} bytes"


def test_every_query_has_its_answer() -> None:
    for name in answers.answered_query_names():
        assert (DATA_FOLDER / paths.answer_file(name)).is_file(), f"{name} has no answer; run make data"


def test_every_answer_comes_from_its_query_s_current_text() -> None:
    assert answers.stale_queries(DATA_FOLDER) == [], "queries edited since make data last ran; run make data"


def test_the_answers_are_the_ones_the_artifact_gives(artifact_checkout: pathlib.Path, tmp_path: pathlib.Path) -> None:
    """The answers rebuilt from the artifact's checkout are the committed ones, file for file and byte for byte."""
    connection = site_database.open_database(loading.load_artifact(artifact_checkout))
    answers.write_answers(connection, tmp_path)
    rebuilt = files_by_name(tmp_path / paths.ANSWERS_FOLDER)
    committed = files_by_name(DATA_FOLDER / paths.ANSWERS_FOLDER)
    assert sorted(rebuilt) == sorted(committed), "the answers' files differ from a rebuild; run make data"
    for name, path in rebuilt.items():
        assert path.read_bytes() == committed[name].read_bytes(), f"{name} differs from a rebuild; run make data"


def test_the_figure_images_are_the_ones_the_artifact_gives(artifact_checkout: pathlib.Path,
                                                          tmp_path: pathlib.Path) -> None:
    """The images and their index rebuilt from the artifact's checkout are the committed ones, file for file and byte
    for byte."""
    figures = figure_images.listed_figures(artifact_checkout)
    figure_images.write_figure_images(figure_images.render_figures(figures), tmp_path)
    rebuilt = files_by_name(tmp_path)
    committed = files_by_name(FIGURES_FOLDER)
    assert sorted(rebuilt) == sorted(committed), "the figure images' files differ from a rebuild; run make data"
    for name, path in rebuilt.items():
        assert path.read_bytes() == committed[name].read_bytes(), f"{name} differs from a rebuild; run make data"


def files_by_name(folder: pathlib.Path) -> dict[str, pathlib.Path]:
    """Every file under `folder`, by its path relative to `folder`."""
    return {path.relative_to(folder).as_posix(): path for path in folder.rglob("*") if path.is_file()}
