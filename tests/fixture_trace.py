"""The fixture's part of the released trace, apart from the artifact: a small trace whose requests add up to the
fixture's daily rollup row for row (`TRACE_REQUESTS`, written by `write_fixture_trace` in the released trace's columns
and types), and its trace table counted by hand (`WEEKLY_HISTOGRAMS`, written by `write_trace_table` in the types the
builder writes), which the tests' site database is opened over."""

import dataclasses
import datetime
import pathlib
import typing

import pyarrow
import pyarrow.parquet

import fixture_artifact
from site_data import loading

# The released trace's columns and their types.
TRACE_SCHEMA = pyarrow.schema([
    ("invocation_id", pyarrow.int64()), ("function_name", pyarrow.string()), ("chute_id", pyarrow.string()),
    ("user_id", pyarrow.string()), ("rehash_round", pyarrow.int32()), ("instance_id", pyarrow.string()),
    ("started_at", pyarrow.timestamp("us")), ("completed_at", pyarrow.timestamp("us")), ("it", pyarrow.float32()),
    ("ot", pyarrow.float32()), ("ct", pyarrow.float32()), ("ttft", pyarrow.float32()),
])
# The trace table's columns and their types, as the builder writes them.
TRACE_TABLE_SCHEMA = pyarrow.schema([
    ("week", pyarrow.int32()), ("family", pyarrow.string()), ("chute_id", pyarrow.string()),
    ("endpoint_group", pyarrow.string()), ("metric", pyarrow.string()), ("bin", pyarrow.int32()),
    ("requests", pyarrow.int64()),
])


@dataclasses.dataclass(frozen=True)
class TraceRequests:
    """The fixture trace's requests that one row of the daily rollup counts, one per position of the three lists:
    their day, chute and function name, and each request's input tokens (`it`), output tokens (`ot`) and TTFT
    (`ttft`). None is a value not recorded; a TTFT of 0 is recorded, and not counted."""

    day: datetime.datetime
    chute_id: str
    function_name: str
    input_tokens: list[float | None]
    output_tokens: list[float | None]
    ttfts: list[float | None]


# The fixture trace, one entry per row of the daily rollup, in its order. Each recorded value is one plain value, the
# last request's taking what makes the row's sum where the plain value alone does not. A family's rest is one chute:
# DeepSeek's `chute-05`, and Other's `chute-unnamed`, which the model names do not list.
TRACE_REQUESTS = [
    TraceRequests(fixture_artifact.trace_time(1), "chute-01", "chat",
                  [100.0] * 40, [20.0] * 40, [0.5] * 29 + [6.0] + [None] * 10),
    TraceRequests(fixture_artifact.trace_time(1), "chute-03", "chat",
                  [100.0] * 20, [20.0] * 20, [0.5] * 20),
    TraceRequests(fixture_artifact.trace_time(1), "chute-01", "chat_stream",
                  [50.0] * 30, [13.0] * 29 + [23.0], [0.0] * 30),
    TraceRequests(fixture_artifact.trace_time(1), "chute-05", "chat_stream",
                  [50.0] * 10, [10.0] * 10, [None] * 10),
    TraceRequests(fixture_artifact.trace_time(2), "chute-04", "chat",
                  [40.0] * 5, [12.0] * 5, [0.5] * 4 + [0.25]),
    TraceRequests(fixture_artifact.trace_time(2), "chute-unnamed", "chat",
                  [40.0] * 20, [12.0] * 20, [0.5] * 20),
    TraceRequests(fixture_artifact.trace_time(2, month=2), "chute-02", "completion",
                  [None] * 15, [0.0] * 15, [0.25] * 14 + [0.5]),
]


class HistogramRow(typing.NamedTuple):
    """A row of the trace table: the requests of one trace week, family, kept model (None for the family's other
    models) and endpoint group whose value of one metric fell in one bin."""

    week: int
    family: str
    chute_id: str | None
    endpoint_group: str
    metric: str
    bin: int
    requests: int


# The fixture's trace table, counted by hand from `TRACE_REQUESTS`, in the trace query's order. An input of 100 tokens
# is in bin 26, 50 in 22 and 40 in 21; an output of 20 in 17, 13 in 14, 23 in 18, 10 in 13, 12 in 14 and 0 in 0; a
# TTFT of 6 s in bin 10, 0.5 s in -4 and 0.25 s in -8.
WEEKLY_HISTOGRAMS = [
    HistogramRow(0, "DeepSeek", "chute-01", "chat", "input_tokens", 26, 40),
    HistogramRow(0, "DeepSeek", "chute-01", "chat", "output_tokens", 17, 40),
    HistogramRow(0, "DeepSeek", "chute-01", "chat", "ttft", -4, 29),
    HistogramRow(0, "DeepSeek", "chute-01", "chat", "ttft", 10, 1),
    HistogramRow(0, "DeepSeek", "chute-01", "chat_stream", "input_tokens", 22, 30),
    HistogramRow(0, "DeepSeek", "chute-01", "chat_stream", "output_tokens", 14, 29),
    HistogramRow(0, "DeepSeek", "chute-01", "chat_stream", "output_tokens", 18, 1),
    HistogramRow(0, "DeepSeek", None, "chat_stream", "input_tokens", 22, 10),
    HistogramRow(0, "DeepSeek", None, "chat_stream", "output_tokens", 13, 10),
    HistogramRow(0, "Other", "chute-04", "chat", "input_tokens", 21, 5),
    HistogramRow(0, "Other", "chute-04", "chat", "output_tokens", 14, 5),
    HistogramRow(0, "Other", "chute-04", "chat", "ttft", -8, 1),
    HistogramRow(0, "Other", "chute-04", "chat", "ttft", -4, 4),
    HistogramRow(0, "Other", None, "chat", "input_tokens", 21, 20),
    HistogramRow(0, "Other", None, "chat", "output_tokens", 14, 20),
    HistogramRow(0, "Other", None, "chat", "ttft", -4, 20),
    HistogramRow(0, "gpt-oss", "chute-03", "chat", "input_tokens", 26, 20),
    HistogramRow(0, "gpt-oss", "chute-03", "chat", "output_tokens", 17, 20),
    HistogramRow(0, "gpt-oss", "chute-03", "chat", "ttft", -4, 20),
    HistogramRow(4, "DeepSeek", "chute-02", "completion", "output_tokens", 0, 15),
    HistogramRow(4, "DeepSeek", "chute-02", "completion", "ttft", -8, 14),
    HistogramRow(4, "DeepSeek", "chute-02", "completion", "ttft", -4, 1),
]


def write_fixture_trace(path: pathlib.Path) -> pathlib.Path:
    """Write the fixture trace as the Parquet file `path`, in the released trace's columns and types. Returns the
    path."""
    pyarrow.parquet.write_table(pyarrow.Table.from_pylist(fixture_trace_records(), schema=TRACE_SCHEMA), path)
    return path


def fixture_trace_records() -> list[dict]:
    """One row per request of `TRACE_REQUESTS`, in its order: numbered from 1, a second apart from the day's start
    within an entry, each completed a second after it started, all of one user on one instance."""
    rows = []
    for requests in TRACE_REQUESTS:
        values = zip(requests.input_tokens, requests.output_tokens, requests.ttfts, strict=True)
        for position, (input_tokens, output_tokens, ttft) in enumerate(values):
            started_at = requests.day + datetime.timedelta(seconds=position)
            rows.append({
                "invocation_id": len(rows) + 1,
                "function_name": requests.function_name,
                "chute_id": requests.chute_id,
                "user_id": "user-1",
                "rehash_round": 0,
                "instance_id": "instance-1",
                "started_at": started_at,
                "completed_at": started_at + datetime.timedelta(seconds=1),
                "it": input_tokens,
                "ot": output_tokens,
                "ct": None,
                "ttft": ttft,
            })
    return rows


def write_trace_table(folder: pathlib.Path) -> pathlib.Path:
    """Write `WEEKLY_HISTOGRAMS` as the trace table into `folder`, in `TRACE_TABLE_SCHEMA`'s types. Returns the
    folder."""
    rows = []
    for row in WEEKLY_HISTOGRAMS:
        rows.append(row._asdict())
    table = pyarrow.Table.from_pylist(rows, schema=TRACE_TABLE_SCHEMA)
    pyarrow.parquet.write_table(table, folder / loading.TRACE_TABLE_FILE)
    return folder
