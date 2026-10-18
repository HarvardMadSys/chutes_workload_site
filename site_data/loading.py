"""Reading the paper's artifact into frames: the three caches the site's queries read, the model names and the family
table; and reading the site's trace table, which this repository holds, into a frame.

The artifact is a checkout of the paper's artifact repository. Each cache is the Parquet file
`data/paper/cache/<name>.parquet`, read whole into a frame of its columns; the model names are the
`chute_id` and `name` columns of `data/paper/chute_models.csv`, and the family table is
`data/paper/model_families.csv` whole. The trace table is `weekly_histograms.parquet` of the tables folder, by default
this repository's `tables/`, read whole. A file that is not there stops the step with a message naming it and saying
how to supply it, before anything is read or written.

pandas reads an integer column that holds nulls as float; `with_nullable_integers` gives such a column back its
integer type, with the nulls kept, so that an answer writes its counts as integers.
"""

import dataclasses
import pathlib

import pandas
import pyarrow
import pyarrow.csv
import pyarrow.parquet

CACHE_FOLDER = pathlib.Path("data") / "paper" / "cache"  # in the artifact: the paper's committed caches
MODEL_NAMES_FILE = pathlib.Path("data") / "paper" / "chute_models.csv"  # in the artifact: each chute's model name
MODEL_NAME_COLUMNS = ["chute_id", "name"]  # the columns of the model names the queries read
MODEL_FAMILIES_FILE = pathlib.Path("data") / "paper" / "model_families.csv"  # in the artifact: the family table
# The caches the site's queries read, each the file `<name>.parquet` and the table of its name.
CACHE_NAMES = ["trace_totals", "daily_rollup", "function_name_daily_requests"]
# This repository's tables folder, where `make tables` writes the trace table: the data step's default `--tables`.
TABLES_FOLDER = pathlib.Path(__file__).resolve().parent.parent / "tables"
TRACE_TABLE_FILE = "weekly_histograms.parquet"  # in the tables folder: the trace table, built once from the trace
TRACE_TABLE_SIDECAR_FILE = "weekly_histograms.json"  # in the tables folder: the trace table's query hash and row counts
# What the message of a missing file tells the reader to do: for a file of the artifact, and for the trace table.
ARTIFACT_FILE_HINT = "pass a checkout of the paper's artifact repository as --artifact"
TRACE_TABLE_HINT = "run make tables to build it from the released trace"


@dataclasses.dataclass(frozen=True)
class ArtifactFrames:
    """The artifact's rows the site's queries read, each frame named as its table is.

    `trace_totals`: one row, the whole trace's first and last request time, requests, input and output tokens, users
    (distinct anonymised user ids), models and serving instances. `daily_rollup`: one row per trace day, family, chute
    id (null for every model of the family outside its eight most requested named ones) and endpoint group, with
    requests, token sums, TTFT sum and how many requests recorded each; the family is one of the family table's, or
    `Other`. `function_name_daily_requests`: one row per trace day and endpoint group, with its requests.
    `chute_models`: one row per named chute, its `chute_id` and model `name`. `model_families`: one row per pattern of
    the family table, its `match_order`, `family` and `pattern`.
    """

    trace_totals: pandas.DataFrame
    daily_rollup: pandas.DataFrame
    function_name_daily_requests: pandas.DataFrame
    chute_models: pandas.DataFrame
    model_families: pandas.DataFrame


def load_artifact(artifact: pathlib.Path) -> ArtifactFrames:
    """The frames of the artifact checkout `artifact`; stops naming the first of its files that is missing."""
    cache_paths = {}
    for name in CACHE_NAMES:
        cache_paths[name] = required_file(artifact / CACHE_FOLDER / f"{name}.parquet")
    model_names_path = required_file(artifact / MODEL_NAMES_FILE)
    model_families_path = required_file(artifact / MODEL_FAMILIES_FILE)
    return ArtifactFrames(
        trace_totals=read_cache(cache_paths["trace_totals"]),
        daily_rollup=read_cache(cache_paths["daily_rollup"]),
        function_name_daily_requests=read_cache(cache_paths["function_name_daily_requests"]),
        chute_models=read_model_names(model_names_path),
        model_families=pyarrow.csv.read_csv(model_families_path).to_pandas(),
    )


def load_trace_table(tables_folder: pathlib.Path) -> pandas.DataFrame:
    """The trace table of the tables folder `tables_folder`, `weekly_histograms.parquet`; stops naming it if missing.

    One row per trace week (`week`, seven trace days, week 0 the trace's first seven), `family`, `chute_id` (null for
    every model of the family outside its eight most requested named ones), `endpoint_group`, `metric`
    (`input_tokens`, `output_tokens` or `ttft`) and `bin` (a value v is in bin floor(4 * log2(v))), with the `requests`
    whose value fell in the bin. `site/queries/trace/weekly_histograms.sql` states each column's definition.
    """
    return read_cache(required_file(tables_folder / TRACE_TABLE_FILE, TRACE_TABLE_HINT))


def required_file(path: pathlib.Path, hint: str = ARTIFACT_FILE_HINT) -> pathlib.Path:
    """The path, if a file is there; otherwise stops the step with exit status 1, naming it and saying, by `hint`, how
    to supply it."""
    if not path.is_file():
        raise SystemExit(f"missing {path}: {hint}")
    return path


def read_cache(path: pathlib.Path) -> pandas.DataFrame:
    """The rows of the Parquet file at `path`, its integer columns kept as integers."""
    table = pyarrow.parquet.read_table(path)
    return with_nullable_integers(table.to_pandas(), table.schema)


def read_model_names(path: pathlib.Path) -> pandas.DataFrame:
    """The `chute_id` and `name` of every row of the model names file at `path`."""
    return pyarrow.csv.read_csv(path).select(MODEL_NAME_COLUMNS).to_pandas()


def with_nullable_integers(frame: pandas.DataFrame, table_schema: pyarrow.Schema) -> pandas.DataFrame:
    """The frame with each integer column of the Parquet table that arrived as float, because it holds nulls, as
    `Int64`."""
    restored = {}
    for field in table_schema:
        if pyarrow.types.is_integer(field.type) and pandas.api.types.is_float_dtype(frame[field.name]):
            restored[field.name] = "Int64"
    return frame.astype(restored)
