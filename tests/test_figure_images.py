"""The figure images over the fixture artifact: every listed PDF is found and rendered at the render scale, a rebuild
writes the same bytes, the index names each image's size, and a missing PDF, or one that does not render, stops the
step naming it."""

import hashlib
import json
import pathlib
import re

import pytest

import fixture_artifact
from site_data import figure_images


def file_hashes(folder: pathlib.Path) -> dict[str, str]:
    """Each file of the folder, by name, to the SHA-256 of its bytes."""
    hashes = {}
    for path in sorted(folder.iterdir()):
        hashes[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
    return hashes


def test_every_listed_figure_is_found_in_the_list_s_order(artifact: pathlib.Path) -> None:
    expected = [artifact / figure for figure in fixture_artifact.figure_files()]
    assert figure_images.listed_figures(artifact) == expected
    assert expected[0] == artifact / fixture_artifact.SECTION_FIGURE
    assert expected[-1] == artifact / fixture_artifact.EXTERNAL_FIGURE


def test_a_figure_renders_at_the_render_scale(artifact: pathlib.Path) -> None:
    rendered = figure_images.render_figure(artifact / fixture_artifact.SECTION_FIGURE)
    assert rendered.image == figure_images.FigureImage(
        name="fig_seasonality",
        width=round(fixture_artifact.FIGURE_WIDTH_POINTS * figure_images.RENDER_SCALE),
        height=round(fixture_artifact.FIGURE_HEIGHT_POINTS * figure_images.RENDER_SCALE),
    )
    assert rendered.png.startswith(b"\x89PNG")


def test_a_figure_that_does_not_render_stops_naming_it(tmp_path: pathlib.Path) -> None:
    figure = tmp_path / "fig_broken.pdf"
    figure.write_bytes(fixture_artifact.unrenderable_pdf_bytes())
    assert figure_images.page_count(figure) == 1
    with pytest.raises(SystemExit, match=re.escape(f"{figure} does not render")):
        figure_images.render_figure(figure)


def test_a_rebuild_writes_the_same_bytes(artifact: pathlib.Path, tmp_path: pathlib.Path) -> None:
    figures = figure_images.listed_figures(artifact)
    figure_images.write_figure_images(figure_images.render_figures(figures), tmp_path / "first")
    figure_images.write_figure_images(figure_images.render_figures(figures), tmp_path / "second")
    assert file_hashes(tmp_path / "first") == file_hashes(tmp_path / "second")


def test_the_index_lists_each_image_s_size_by_name(artifact: pathlib.Path, tmp_path: pathlib.Path) -> None:
    rendered = figure_images.render_figures(figure_images.listed_figures(artifact))
    written = figure_images.write_figure_images(rendered, tmp_path)
    names = [figure.stem for figure in fixture_artifact.figure_files()]
    assert written == [tmp_path / f"{name}.png" for name in names]
    index = json.loads((tmp_path / figure_images.INDEX_FILE).read_text())
    assert index == [{"name": name, "width": 1100, "height": 550} for name in sorted(names)]


def test_an_image_no_longer_listed_is_removed(artifact: pathlib.Path, tmp_path: pathlib.Path) -> None:
    (tmp_path / "fig_removed.png").write_bytes(b"")
    figure_images.write_figure_images(figure_images.render_figures(figure_images.listed_figures(artifact)), tmp_path)
    assert not (tmp_path / "fig_removed.png").exists()


@pytest.mark.parametrize("missing", [fixture_artifact.SECTION_FIGURE, fixture_artifact.EXTERNAL_FIGURE])
def test_a_missing_figure_stops_naming_it(tmp_path: pathlib.Path, missing: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path)
    (artifact / missing).unlink()
    with pytest.raises(SystemExit, match=re.escape(missing.name)):
        figure_images.listed_figures(artifact)


def test_a_missing_figure_list_stops_naming_it(tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path)
    (artifact / "config" / "figures.json").unlink()
    with pytest.raises(SystemExit, match=re.escape(str(artifact / "config" / "figures.json"))):
        figure_images.listed_figures(artifact)


def test_a_listed_figure_of_two_pages_stops_naming_it(tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path / "artifact")
    two_pages = fixture_artifact.pdf_bytes(fixture_artifact.FIGURE_WIDTH_POINTS, fixture_artifact.FIGURE_HEIGHT_POINTS,
                                           pages=2)
    (artifact / fixture_artifact.EXTERNAL_FIGURE).write_bytes(two_pages)
    with pytest.raises(SystemExit, match=re.escape(f"{fixture_artifact.EXTERNAL_FIGURE.name} has 2 pages")):
        figure_images.listed_figures(artifact)


def test_a_listed_name_two_files_share_stops_naming_both(tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path)
    copy = artifact / "figures" / "caching" / fixture_artifact.SECTION_FIGURE.name
    copy.parent.mkdir()
    copy.write_bytes((artifact / fixture_artifact.SECTION_FIGURE).read_bytes())
    with pytest.raises(SystemExit, match=re.escape(f"two figures are named {fixture_artifact.SECTION_FIGURE.name}")):
        figure_images.listed_figures(artifact)


def test_an_unlisted_name_two_files_share_is_ignored(tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path)
    figure_bytes = (artifact / fixture_artifact.SECTION_FIGURE).read_bytes()
    for folder in ["caching", "extra"]:
        (artifact / "figures" / folder).mkdir()
        (artifact / "figures" / folder / "fig_unlisted.pdf").write_bytes(figure_bytes)
    assert len(figure_images.listed_figures(artifact)) == len(fixture_artifact.figure_files())


def test_a_list_whose_count_disagrees_stops_naming_both_numbers(tmp_path: pathlib.Path) -> None:
    artifact = fixture_artifact.write_fixture_artifact(tmp_path)
    figure_list_path = artifact / "config" / "figures.json"
    figure_list = json.loads(figure_list_path.read_text())
    figure_list["count"] = 11
    figure_list_path.write_text(json.dumps(figure_list))
    with pytest.raises(SystemExit, match="names 10 figures but counts 11"):
        figure_images.listed_figures(artifact)
