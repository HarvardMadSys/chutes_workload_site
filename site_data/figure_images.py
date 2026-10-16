"""Images of the paper's figures: every PDF the artifact's `config/figures.json` lists, rendered to PNG.

The list names each figure's PDF by its file name: under `sections`, a list of names per paper section, and under
`external`, one key per name; `count` says how many names it holds. A name is looked up anywhere under the artifact's
`figures/`, where a listed name is unique. `listed_figures` finds every listed PDF and checks it is one page, stopping
on the first that is missing, ambiguous or of other than one page; `render_figures` renders each one page at
`RENDER_SCALE` to PNG bytes in memory, stopping on the first that does not render; both before anything is written.
`write_figure_images` writes each image to `<folder>/<name>.png`, `<name>` its PDF's name without `.pdf`, and
`<folder>/index.json`: a list of `{"name", "width", "height"}`, sizes in pixels, sorted by name. Pillow writes each
PNG with no metadata and no time, so the same PDF gives the same bytes on every build.
"""

import dataclasses
import io
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


@dataclasses.dataclass(frozen=True)
class RenderedFigure:
    """A figure rendered in memory, not yet written: its image's name and size, and the PNG's bytes."""

    image: FigureImage
    png: bytes


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


def render_figures(figures: list[pathlib.Path]) -> list[RenderedFigure]:
    """Each figure rendered in memory, in the figures' order; stops, naming it, on the first that does not render."""
    rendered = []
    for figure in figures:
        rendered.append(render_figure(figure))
    return rendered


def render_figure(figure: pathlib.Path) -> RenderedFigure:
    """The first page of the PDF `figure`, which `listed_figures` checked is its only one, rendered at `RENDER_SCALE`
    as PNG bytes with no metadata; stops, naming the PDF, when pdfium cannot render it."""
    try:
        with pypdfium2.PdfDocument(figure) as document:
            image = document[0].render(scale=RENDER_SCALE).to_pil()
    except pypdfium2.PdfiumError as error:
        raise SystemExit(f"{figure} does not render: {error}") from error
    png = io.BytesIO()
    image.save(png, format="PNG", optimize=False)
    return RenderedFigure(FigureImage(name=figure.stem, width=image.width, height=image.height), png.getvalue())


def write_figure_images(rendered: list[RenderedFigure], images_directory: pathlib.Path) -> list[pathlib.Path]:
    """Replace the images folder's PNGs with the rendered figures' images and write their index; the images written,
    in the figures' order."""
    images_directory.mkdir(parents=True, exist_ok=True)
    for old_image in images_directory.glob("*.png"):
        old_image.unlink()  # a figure since removed from the list keeps no image
    written = []
    for figure in rendered:
        image_path = images_directory / f"{figure.image.name}.png"
        image_path.write_bytes(figure.png)
        written.append(image_path)
    (images_directory / INDEX_FILE).write_text(index_text([figure.image for figure in rendered]))
    return written


def index_text(images: list[FigureImage]) -> str:
    """The index of the images: one line of JSON, a list of each image's name, width and height, sorted by name."""
    entries = []
    for image in sorted(images, key=lambda image: image.name):
        entries.append(dataclasses.asdict(image))
    return json.dumps(entries, separators=paths.JSON_SEPARATORS) + "\n"
