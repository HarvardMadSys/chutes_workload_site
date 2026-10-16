"""Images of the paper's figures: every PDF the artifact's `config/figures.json` lists, rendered to PNG.

The list names each figure's PDF by its file name: under `sections`, a list of names per paper section, and under
`external`, one key per name; `count` says how many names it holds. A name is looked up anywhere under the artifact's
`figures/`, where a listed name is unique. `listed_figures` finds every listed PDF and checks it is one page, stopping
on the first that is missing, ambiguous or of other than one page, before anything is written.
`write_figure_images` renders each PDF's one page at `RENDER_SCALE` to `<folder>/<name>.png`, `<name>` being its file
name without `.pdf`, and writes `<folder>/index.json`: a list of `{"name", "width", "height"}`, sizes in pixels,
sorted by name. Pillow writes each PNG with no metadata and no time, so the same PDF gives the same bytes on every
build.
"""

import dataclasses
import json
import pathlib

import pypdfium2

from site_data import loading, paths

FIGURE_LIST_FILE = pathlib.Path("config") / "figures.json"  # in the artifact: the figures the paper includes
FIGURES_FOLDER = "figures"  # in the artifact: the figure PDFs, in a folder per section or source
INDEX_FILE = "index.json"  # in the images folder: each image's name, width and height
RENDER_SCALE = 4.4  # 72 pt/in × 4.4 ≈ 317 px/in: a 3.5-inch figure is about 1,100 px wide, twice its width on the page


@dataclasses.dataclass(frozen=True)
class FigureImage:
    """A rendered figure: its name (the PDF's file name without `.pdf`) and its size in pixels."""

    name: str
    width: int
    height: int


def listed_figures(artifact: pathlib.Path) -> list[pathlib.Path]:
    """The PDF of every figure the artifact's figure list names, in the list's order: each section's, then the
    external ones; stops, naming it, on the first that is not under the artifact's `figures/`, that two files there
    share, or that is not one page."""
    files = figure_files_by_name(artifact)
    found = []
    for name in listed_figure_names(artifact):
        if name not in files:
            raise SystemExit(f"missing {name} under {artifact / FIGURES_FOLDER}: {FIGURE_LIST_FILE} lists it")
        if len(files[name]) > 1:
            raise SystemExit(f"two figures are named {name}: {files[name][0]} and {files[name][1]}")
        figure = files[name][0]
        pages = page_count(figure)
        if pages != 1:
            raise SystemExit(f"{figure} has {pages} pages; a figure is one page")
        found.append(figure)
    return found


def listed_figure_names(artifact: pathlib.Path) -> list[str]:
    """The file name of every figure the artifact's figure list names: each section's, then the external ones; stops
    if they are not as many as the list's `count`."""
    figure_list_path = loading.required_file(artifact / FIGURE_LIST_FILE)
    figure_list = json.loads(figure_list_path.read_text())
    names = []
    for section_names in figure_list["sections"].values():
        names.extend(section_names)
    names.extend(figure_list["external"])
    if len(names) != figure_list["count"]:
        raise SystemExit(f"{figure_list_path} names {len(names)} figures but counts {figure_list['count']}")
    return names


def figure_files_by_name(artifact: pathlib.Path) -> dict[str, list[pathlib.Path]]:
    """Every PDF under the artifact's `figures/`, by file name: each name's files, sorted by path."""
    files = {}
    for path in sorted((artifact / FIGURES_FOLDER).rglob("*.pdf")):
        files.setdefault(path.name, []).append(path)
    return files


def page_count(figure: pathlib.Path) -> int:
    """The number of pages of the PDF `figure`."""
    with pypdfium2.PdfDocument(figure) as document:
        return len(document)


def write_figure_images(figures: list[pathlib.Path], images_directory: pathlib.Path) -> list[pathlib.Path]:
    """Replace the images folder's PNGs with each figure's image and write its index; the images written, in the
    figures' order."""
    images_directory.mkdir(parents=True, exist_ok=True)
    for old_image in images_directory.glob("*.png"):
        old_image.unlink()  # a figure since removed from the list keeps no image
    images, written = [], []
    for figure in figures:
        image_path = images_directory / f"{figure.stem}.png"
        images.append(render_figure(figure, image_path))
        written.append(image_path)
    (images_directory / INDEX_FILE).write_text(index_text(images))
    return written


def render_figure(figure: pathlib.Path, image_path: pathlib.Path) -> FigureImage:
    """Render the first page of the PDF `figure`, which `listed_figures` checked is its only one, at `RENDER_SCALE` to
    the PNG `image_path`, with no metadata."""
    with pypdfium2.PdfDocument(figure) as document:
        bitmap = document[0].render(scale=RENDER_SCALE)
        image = bitmap.to_pil()
        image.save(image_path, format="PNG", optimize=False)
    return FigureImage(name=figure.stem, width=image.width, height=image.height)


def index_text(images: list[FigureImage]) -> str:
    """The index of the images: one line of JSON, a list of each image's name, width and height, sorted by name."""
    entries = []
    for image in sorted(images, key=lambda image: image.name):
        entries.append(dataclasses.asdict(image))
    return json.dumps(entries, separators=paths.JSON_SEPARATORS) + "\n"
