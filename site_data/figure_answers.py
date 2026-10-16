"""The answers of the paper's figures: for every figure the artifact's `config/figures.json` lists, the rows of its
plot-ready table, `data/paper/plotdata/<figure>.parquet` in the artifact, written as `all/figures/<figure>.json`, and
`all/figures.json`, `{"<figure>": <row count>, ...}` in the list's order.

A figure is named by its file name in the list without `.pdf`. A plot-ready table's columns are those of one chart
kind (`lines`: `series`, `x`, `y` and an optional `panel`; `cdf`: `series`, `x`, `cdf`; `bands`, `cells`, `raster`,
`scatter`, `boxes`, `bars`, `stacked_bars`, `legend`); the step copies them as they are, with no query, rounding or
renaming, and does not check the kind. An answer is written as a query's answer is (`answers.answer_text`): a JSON
list with one object per row, its keys the table's columns in the table's order, its values through
`answers.json_value`.

`read_figure_tables` reads every table in memory, stopping on the first that is missing before anything is written;
`write_figure_answers` then writes them.
"""

import dataclasses
import json
import pathlib
import shutil

import pyarrow.parquet

from site_data import answers, figure_images, loading, paths

PLOTDATA_FOLDER = pathlib.Path("data") / "paper" / "plotdata"  # in the artifact: one plot-ready table per figure


@dataclasses.dataclass(frozen=True)
class FigureTable:
    """A figure's plot-ready table, read and not yet written: the figure's name and its rows, each a dict from the
    table's column names, in its order, to the row's JSON values."""

    name: str
    rows: list[dict]


def listed_figures(artifact: pathlib.Path) -> list[str]:
    """The name of every figure the artifact's figure list names, without `.pdf`: each section's, in the file's order,
    then the external ones."""
    names = []
    for file_name in figure_images.listed_figure_names(artifact):
        names.append(file_name.removesuffix(".pdf"))
    return names


def read_figure_tables(artifact: pathlib.Path) -> list[FigureTable]:
    """The plot-ready table of every listed figure, in the list's order; stops, naming it, on the first table that is
    missing, before any is read."""
    table_paths = {}
    for name in listed_figures(artifact):
        table_paths[name] = loading.required_file(artifact / PLOTDATA_FOLDER / f"{name}.parquet")
    tables = []
    for name, path in table_paths.items():
        tables.append(FigureTable(name=name, rows=table_rows(path)))
    return tables


def table_rows(path: pathlib.Path) -> list[dict]:
    """The rows of the Parquet file at `path`, each a dict from its column names, in its order, to the row's JSON
    values."""
    rows = []
    for row in pyarrow.parquet.read_table(path).to_pylist():
        values = {}
        for column, value in row.items():
            values[column] = answers.json_value(value)
        rows.append(values)
    return rows


def write_figure_answers(tables: list[FigureTable], data_directory: pathlib.Path) -> list[pathlib.Path]:
    """Replace the data folder's figure answers with one answer per table and write their index; the answer files
    written, in the tables' order."""
    answers_directory = data_directory / paths.ANSWERS_FOLDER
    figures_directory = answers_directory / paths.FIGURE_ANSWERS_FOLDER
    if figures_directory.exists():
        shutil.rmtree(figures_directory)  # a figure since removed from the list keeps no answer
    figures_directory.mkdir(parents=True)
    written = []
    row_counts = {}
    for table in tables:
        written.append(answers.write_answer(figures_directory / f"{table.name}.json", table.rows))
        row_counts[table.name] = len(table.rows)
    (answers_directory / paths.FIGURE_INDEX_FILE).write_text(json.dumps(row_counts, indent=1) + "\n")
    return written
