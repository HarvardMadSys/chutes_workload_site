"""A small artifact checkout for the tests, written into a folder: the three caches the site reads, a few rows each,
the model names, the family table, the figure list and the plot-ready table of each figure it lists; and, apart from
it, a small trace whose requests the daily rollup counts.

Its rows, in the artifact's column types:

- eleven named chutes in the model names, `chute-01` to `chute-10` and `chute-idle` (`MODEL_NAMES`), of which the
  daily rollup names `chute-01` to `chute-04`. The artifact's family rule places a name in the family of the first
  pattern of the family table that it contains, case-insensitively, and in `Other` when it contains none; each name
  is chosen so that the rule places its chute where the daily rollup does;
- 140 requests on 1970-01-01, 1970-01-02 and 1970-02-02 in the daily rollup and the daily endpoint counts alike, which
  the totals count too;
- three families in the daily rollup: DeepSeek, 95 requests (`chute-01` 70, `chute-02` 15 and its rest 10), gpt-oss,
  20 (`chute-03`), and Other, 25 (`chute-04` 5 and the unnamed models 20); the family table lists DeepSeek and gpt-oss;
- ten figures, one per chart kind, nine listed under `sections` and one under `external`, each with a plot-ready
  table (`fixture_plotdata.py`);
- the trace (`write_fixture_trace`): the 140 requests, in the released trace's columns and types, that add up to the
  daily rollup row for row (`TRACE_REQUESTS`).
"""

import dataclasses
import datetime
import json
import pathlib

import pyarrow
import pyarrow.parquet

import fixture_plotdata

# The figures the fixture's figure list names under `sections`, by paper section, each with a table of
# `fixture_plotdata.py`.
SECTION_FIGURES = {
    "section2_background": ["fig_seasonality"],
    "section3_global": ["fig_token_length_input_cdf_by_model"],
    "section4_user_models": ["fig_model_raster_qwen3_next_80b", "fig_model_heatmap_fixedxy_scatter_colored_metrics",
                             "fig_top10_model_monthly_share_legend", "fig_top10_model_monthly_request_share"],
    "section5_evolution": ["fig_monthly_input_token_intervals", "fig_per_user_iat_p50_by_model"],
    "section7_casestudy": ["fig_lb_user_zoom_top"],
}
EXTERNAL_FIGURE = "fig_routing_tradeoff.pdf"  # the one figure the list names under `external`
TOTAL_REQUESTS = 140  # every request of the totals, the daily rollup and the daily endpoint counts
# Each named chute but `chute-idle` and its model name. `chute-02`'s holds both of DeepSeek's patterns; `chute-04` and
# the others contain no pattern. `chute-05`, the trace's chute for DeepSeek's rest, is named into DeepSeek, yet the
# daily rollup does not name it: `family_models` ranks the rollup's chutes alone, so it is no kept model here, though
# the artifact, ranking the trace's chutes, would keep it as one of DeepSeek's eight.
MODEL_NAMES = {
    "chute-01": "DeepSeek-model-01", "chute-02": "deepseek-r1t-model-02", "chute-03": "gpt-oss-model-03",
    "chute-04": "model-04", "chute-05": "DeepSeek-model-05", "chute-06": "model-06", "chute-07": "model-07",
    "chute-08": "model-08", "chute-09": "model-09", "chute-10": "model-10",
}
# The released trace's columns and their types.
TRACE_SCHEMA = pyarrow.schema([
    ("invocation_id", pyarrow.int64()), ("function_name", pyarrow.string()), ("chute_id", pyarrow.string()),
    ("user_id", pyarrow.string()), ("rehash_round", pyarrow.int32()), ("instance_id", pyarrow.string()),
    ("started_at", pyarrow.timestamp("us")), ("completed_at", pyarrow.timestamp("us")), ("it", pyarrow.float32()),
    ("ot", pyarrow.float32()), ("ct", pyarrow.float32()), ("ttft", pyarrow.float32()),
])


def trace_time(day: int, month: int = 1, year: int = 1970, hour: int = 0) -> datetime.datetime:
    """A time of the trace, which counts from 1970-01-01."""
    return datetime.datetime(year, month, day, hour)


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


# The fixture trace, one entry per row of `daily_rollup`, in its order. Each recorded value is one plain value, the
# last request's taking what makes the row's sum where the plain value alone does not. A family's rest is one chute:
# DeepSeek's `chute-05`, and Other's `chute-unnamed`, which the model names do not list.
TRACE_REQUESTS = [
    TraceRequests(trace_time(1), "chute-01", "chat", [100.0] * 40, [20.0] * 40, [0.5] * 29 + [6.0] + [None] * 10),
    TraceRequests(trace_time(1), "chute-03", "chat", [100.0] * 20, [20.0] * 20, [0.5] * 20),
    TraceRequests(trace_time(1), "chute-01", "chat_stream", [50.0] * 30, [13.0] * 29 + [23.0], [0.0] * 30),
    TraceRequests(trace_time(1), "chute-05", "chat_stream", [50.0] * 10, [10.0] * 10, [None] * 10),
    TraceRequests(trace_time(2), "chute-04", "chat", [40.0] * 5, [12.0] * 5, [0.5] * 4 + [0.25]),
    TraceRequests(trace_time(2), "chute-unnamed", "chat", [40.0] * 20, [12.0] * 20, [0.5] * 20),
    TraceRequests(trace_time(2, month=2), "chute-02", "completion", [None] * 15, [0.0] * 15, [0.25] * 14 + [0.5]),
]


def write_fixture_artifact(folder: pathlib.Path) -> pathlib.Path:
    """Write the fixture artifact into `folder` and return the folder."""
    cache = folder / "data" / "paper" / "cache"
    cache.mkdir(parents=True)
    pyarrow.parquet.write_table(trace_totals(), cache / "trace_totals.parquet")
    pyarrow.parquet.write_table(daily_rollup(), cache / "daily_rollup.parquet")
    pyarrow.parquet.write_table(function_name_daily_requests(), cache / "function_name_daily_requests.parquet")
    write_model_names(folder / "data" / "paper" / "chute_models.csv")
    write_model_families(folder / "data" / "paper" / "model_families.csv")
    write_figure_list(folder)
    write_plotdata(folder / "data" / "paper" / "plotdata")
    return folder


def trace_totals() -> pyarrow.Table:
    """The totals: one row, 140 requests from 1970-01-01 to 1970-02-02."""
    return pyarrow.table({
        "first_started_at": pyarrow.array([trace_time(1)], pyarrow.timestamp("us")),
        "last_started_at": pyarrow.array([trace_time(2, month=2, hour=18)], pyarrow.timestamp("us")),
        "requests": pyarrow.array([TOTAL_REQUESTS], pyarrow.int64()),
        "input_tokens": pyarrow.array([9000.0], pyarrow.float64()),
        "output_tokens": pyarrow.array([2000.0], pyarrow.float64()),
        "users": pyarrow.array([4], pyarrow.int64()),
        "models": pyarrow.array([3], pyarrow.int64()),
        "instances": pyarrow.array([5], pyarrow.int64()),
    })


def daily_rollup() -> pyarrow.Table:
    """The daily rollup: seven rows over three days and three families, two of them a family's rest (null chute id)."""
    return pyarrow.table({
        "day": pyarrow.array([trace_time(1)] * 4 + [trace_time(2)] * 2 + [trace_time(2, month=2)],
                             pyarrow.timestamp("us")),
        "family": pyarrow.array(["DeepSeek", "gpt-oss", "DeepSeek", "DeepSeek", "Other", "Other", "DeepSeek"],
                                pyarrow.large_string()),
        "chute_id": pyarrow.array(["chute-01", "chute-03", "chute-01", None, "chute-04", None, "chute-02"],
                                  pyarrow.large_string()),
        "function_group": pyarrow.array(["chat", "chat", "chat_stream", "chat_stream", "chat", "chat", "completion"],
                                        pyarrow.large_string()),
        "requests": pyarrow.array([40, 20, 30, 10, 5, 20, 15], pyarrow.int64()),
        "input_tokens": pyarrow.array([4000.0, 2000.0, 1500.0, 500.0, 200.0, 800.0, None], pyarrow.float64()),
        "input_counted": pyarrow.array([40, 20, 30, 10, 5, 20, 0], pyarrow.int64()),
        "output_tokens": pyarrow.array([800.0, 400.0, 400.0, 100.0, 60.0, 240.0, 0.0], pyarrow.float64()),
        "output_counted": pyarrow.array([40, 20, 30, 10, 5, 20, 15], pyarrow.int64()),
        "ttft_sum": pyarrow.array([20.5, 10.0, None, None, 2.25, 10.0, 4.0], pyarrow.float64()),
        "ttft_counted": pyarrow.array([30, 20, 0, 0, 5, 20, 15], pyarrow.int64()),
    })


def function_name_daily_requests() -> pyarrow.Table:
    """The daily endpoint counts: the daily rollup's requests by day and endpoint group."""
    return pyarrow.table({
        "day": pyarrow.array([trace_time(1), trace_time(1), trace_time(2), trace_time(2, month=2)],
                             pyarrow.timestamp("us")),
        "function_group": pyarrow.array(["chat", "chat_stream", "chat", "completion"], pyarrow.large_string()),
        "requests": pyarrow.array([60, 40, 25, 15], pyarrow.int64()),
    })


def write_model_names(path: pathlib.Path) -> None:
    """Write the model names of `MODEL_NAMES` and `chute-idle`, with the artifact's five columns."""
    lines = ["chute_id,name,invocation_count,current_estimated_price,supported_gpus"]
    for number, (chute_id, name) in enumerate(MODEL_NAMES.items(), start=1):
        lines.append(f"{chute_id},{name},{number * 7},1.5,\"['h100', 'h200']\"")
    lines.append("chute-idle,model-idle,0,2.0,['a100']")
    path.write_text("\n".join(lines) + "\n")


def write_model_families(path: pathlib.Path) -> None:
    """Write the family table: DeepSeek's two patterns and gpt-oss's one, with the artifact's three columns."""
    lines = ["match_order,family,pattern", "1,DeepSeek,deepseek", "2,DeepSeek,r1t", "3,gpt-oss,gpt-oss"]
    path.write_text("\n".join(lines) + "\n")


def figure_names() -> list[str]:
    """The name of every figure the fixture lists, in the list's order: each section's, then the external one."""
    names = []
    for section_names in SECTION_FIGURES.values():
        names.extend(section_names)
    names.append(EXTERNAL_FIGURE.removesuffix(".pdf"))
    return names


def write_figure_list(folder: pathlib.Path) -> None:
    """Write the figure list, which names each figure by its PDF's file name."""
    sections = {}
    for section, names in SECTION_FIGURES.items():
        sections[section] = [f"{name}.pdf" for name in names]
    figure_list = {
        "note": "The fixture's figures.",
        "sections": sections,
        "external": {EXTERNAL_FIGURE: {"section": "section7_casestudy", "generator": "plot.py"}},
        "count": len(figure_names()),
    }
    (folder / "config").mkdir()
    (folder / "config" / "figures.json").write_text(json.dumps(figure_list, indent=2))


def write_plotdata(folder: pathlib.Path) -> None:
    """Write each figure's plot-ready table as `<figure>.parquet` into `folder`."""
    folder.mkdir(parents=True)
    for name, table in fixture_plotdata.plotdata_tables().items():
        pyarrow.parquet.write_table(table, folder / f"{name}.parquet")


def write_fixture_trace(path: pathlib.Path) -> pathlib.Path:
    """Write the fixture trace as the Parquet file `path`, in the released trace's columns and types; the path."""
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
