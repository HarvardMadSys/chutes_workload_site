"""Reading the paper's artifact into frames: the four caches the site's queries read and the model names.

The artifact is a checkout of the paper's artifact repository. Each cache is the Parquet file
`data/paper/cache/<name>.parquet`, read whole into a frame of its columns; the model names are the
`chute_id` and `name` columns of `data/paper/chute_models.csv`. A file that is not there stops the step with a
message naming it, before anything is read or written.

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
# The caches the site's queries read, each the file `<name>.parquet` and the table of its name.
CACHE_NAMES = ["trace_totals", "daily_rollup", "monthly_requests_tokens_by_model", "function_name_daily_requests"]


@dataclasses.dataclass(frozen=True)
class ArtifactFrames:
    """The artifact's rows the site's queries read, each frame named as its table is.

    `trace_totals`: one row, the whole trace's first and last request time, requests, input and output tokens, users
    (distinct anonymised user ids), models and serving instances. `daily_rollup`: one row per trace day, chute id (null
    for every model outside the twenty most requested named ones) and endpoint group, with requests, token sums, TTFT
    sum and how many requests recorded each. `monthly_requests_tokens_by_model`: one row per trace month and chute id,
    with its requests and tokens. `function_name_daily_requests`: one row per trace day and endpoint group, with its
    requests. `chute_models`: one row per named chute, its `chute_id` and model `name`.
    """

    trace_totals: pandas.DataFrame
    daily_rollup: pandas.DataFrame
    monthly_requests_tokens_by_model: pandas.DataFrame
    function_name_daily_requests: pandas.DataFrame
    chute_models: pandas.DataFrame


def load_artifact(artifact: pathlib.Path) -> ArtifactFrames:
    """The frames of the artifact checkout `artifact`; stops naming the first of its files that is missing."""
    paths = {}
    for name in CACHE_NAMES:
        paths[name] = required_file(artifact / CACHE_FOLDER / f"{name}.parquet")
    model_names_path = required_file(artifact / MODEL_NAMES_FILE)
    return ArtifactFrames(
        trace_totals=read_cache(paths["trace_totals"]),
        daily_rollup=read_cache(paths["daily_rollup"]),
        monthly_requests_tokens_by_model=read_cache(paths["monthly_requests_tokens_by_model"]),
        function_name_daily_requests=read_cache(paths["function_name_daily_requests"]),
        chute_models=read_model_names(model_names_path),
    )


def required_file(path: pathlib.Path) -> pathlib.Path:
    """The path, if a file is there; otherwise stops the step with exit status 1, naming it."""
    if not path.is_file():
        raise SystemExit(f"missing {path}: pass a checkout of the paper's artifact repository as --artifact")
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
