"""The answers of the paper's figures: for every figure the artifact's `config/figures.json` lists, the rows of its
plot-ready table, `data/paper/plotdata/<figure>.parquet` in the artifact, written as `all/figures/<figure>.json`, and
`all/figures.json`, `{"<figure>": <row count>, ...}` in the list's order.

The list names each figure by its PDF's file name: under `sections`, a list of names per paper section, and under
`external`, one key per name; `count` says how many names it holds. A figure is named by its file name without
`.pdf`. A plot-ready table's columns are those of one chart
kind (`lines`: `series`, `x`, `y` and an optional `panel`; `cdf`: `series`, `x`, `cdf`; `bands`, `cells`, `raster`,
`scatter`, `boxes`, `bars`, `stacked_bars`, `legend`); the step copies them as they are, with no query, rounding or
renaming, and does not check the kind. An answer is written as a query's answer is (`answer_files.answer_text`): a JSON
list with one object per row, its keys the table's columns in the table's order, its values through
`answer_files.json_value`.

`read_figure_tables` reads every table in memory, stopping on the first that is missing before anything is written;
`write_figure_answers` then writes them.
"""

import dataclasses
import json
import pathlib
import shutil

import pyarrow.parquet

from site_data import answer_files, loading

FIGURE_LIST_FILE = pathlib.Path("config") / "figures.json"  # in the artifact: the figures the paper includes
PLOTDATA_FOLDER = pathlib.Path("data") / "paper" / "plotdata"  # in the artifact: one plot-ready table per figure


@dataclasses.dataclass(frozen=True)
class FigureTable:
    """A figure's plot-ready table, read and not yet written: the figure's name and its rows, each a dict from the
    table's column names, in its order, to the row's JSON values."""

    name: str
    rows: list[dict]


def listed_figures(artifact: pathlib.Path) -> list[str]:
    """The name of every figure the artifact's figure list names, without `.pdf`: each section's, in the file's order,
    then the external ones; stops if they are not as many as the list's `count`."""
    figure_list_path = loading.required_file(artifact / FIGURE_LIST_FILE)
    figure_list = json.loads(figure_list_path.read_text())
    file_names = []
    for section_names in figure_list["sections"].values():
        file_names.extend(section_names)
    file_names.extend(figure_list["external"])
    if len(file_names) != figure_list["count"]:
        raise SystemExit(f"{figure_list_path} names {len(file_names)} figures but counts {figure_list['count']}")
    names = []
    for file_name in file_names:
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
            values[column] = answer_files.json_value(value)
        rows.append(values)
    return rows


def write_figure_answers(tables: list[FigureTable], data_directory: pathlib.Path) -> list[pathlib.Path]:
    """Replace the data folder's figure answers with one answer per table and write their index; the answer files
    written, in the tables' order."""
    answers_directory = data_directory / answer_files.ANSWERS_FOLDER
    figures_directory = answers_directory / answer_files.FIGURE_ANSWERS_FOLDER
    if figures_directory.exists():
        shutil.rmtree(figures_directory)  # a figure since removed from the list keeps no answer
    figures_directory.mkdir(parents=True)
    written = []
    row_counts = {}
    for table in tables:
        path = data_directory / answer_files.figure_answer_path(table.name)
        written.append(answer_files.write_answer(path, table.rows))
        row_counts[table.name] = len(table.rows)
    (answers_directory / answer_files.FIGURE_INDEX_FILE).write_text(json.dumps(row_counts, indent=1) + "\n")
    return written
