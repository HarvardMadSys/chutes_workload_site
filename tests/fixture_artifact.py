"""A small artifact checkout for the tests, written into a folder: the four caches the site reads, a few rows each, the
model names, the family table, the figure list and two figure PDFs.

Its rows, in the artifact's column types:

- ten named models, `chute-01` to `chute-10` (`model-01` to `model-10`), with 100, 90, ..., 10 requests in the first
  trace month; `chute-unnamed`, which the model names do not list, with 3 then 7; `chute-01` again with 5 in the
  second month; and `chute-idle`, named but with no requests;
- 140 requests on 1970-01-01, 1970-01-02 and 1970-02-02 in the daily rollup and the daily endpoint counts alike, which
  the totals count too; the monthly cache's counts are its own;
- three families in the daily rollup: DeepSeek, 95 requests (`chute-01` 70, `chute-02` 15 and its rest 10), gpt-oss,
  20 (`chute-03`), and Other, 25 (`chute-04` 5 and the unnamed models 20); the family table lists DeepSeek and gpt-oss;
- one PDF page `FIGURE_WIDTH_POINTS` wide, listed once under `sections` and once under `external`.
"""

import datetime
import json
import pathlib

import pyarrow
import pyarrow.parquet

FIGURE_WIDTH_POINTS = 250  # the fixture figure's page width: 1,100 px at the render scale
FIGURE_HEIGHT_POINTS = 125  # 550 px at the render scale
SECTION_FIGURE = pathlib.Path("figures") / "paper" / "01_workload_overview" / "fig_panel.pdf"
EXTERNAL_FIGURE = pathlib.Path("figures") / "routing" / "fig_tradeoff.pdf"
TOTAL_REQUESTS = 140  # every request of the totals, the daily rollup and the daily endpoint counts


def trace_time(day: int, month: int = 1, year: int = 1970, hour: int = 0) -> datetime.datetime:
    """A time of the trace, which counts from 1970-01-01."""
    return datetime.datetime(year, month, day, hour)


def write_fixture_artifact(folder: pathlib.Path) -> pathlib.Path:
    """Write the fixture artifact into `folder` and return the folder."""
    cache = folder / "data" / "paper" / "cache"
    cache.mkdir(parents=True)
    pyarrow.parquet.write_table(trace_totals(), cache / "trace_totals.parquet")
    pyarrow.parquet.write_table(daily_rollup(), cache / "daily_rollup.parquet")
    pyarrow.parquet.write_table(monthly_requests_tokens_by_model(), cache / "monthly_requests_tokens_by_model.parquet")
    pyarrow.parquet.write_table(function_name_daily_requests(), cache / "function_name_daily_requests.parquet")
    write_model_names(folder / "data" / "paper" / "chute_models.csv")
    write_model_families(folder / "data" / "paper" / "model_families.csv")
    write_figures(folder)
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


def monthly_requests_tokens_by_model() -> pyarrow.Table:
    """The monthly cache: each model's requests per trace month, and as many tokens times 1,000.5."""
    months, chute_ids, requests = [], [], []
    for number in range(1, 11):
        months.append(trace_time(1))
        chute_ids.append(f"chute-{number:02d}")
        requests.append((11 - number) * 10)
    months += [trace_time(1), trace_time(1, month=2), trace_time(1, month=2)]
    chute_ids += ["chute-unnamed", "chute-unnamed", "chute-01"]
    requests += [3, 7, 5]
    tokens = []
    for count in requests:
        tokens.append(count * 1000.5)
    return pyarrow.table({
        "month": pyarrow.array(months, pyarrow.timestamp("us")),
        "chute_id": pyarrow.array(chute_ids, pyarrow.large_string()),
        "model_requests": pyarrow.array(requests, pyarrow.int64()),
        "model_tokens": pyarrow.array(tokens, pyarrow.float64()),
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
    """Write the model names of `chute-01` to `chute-10` and `chute-idle`, with the artifact's five columns."""
    lines = ["chute_id,name,invocation_count,current_estimated_price,supported_gpus"]
    for number in range(1, 11):
        lines.append(f"chute-{number:02d},model-{number:02d},{number * 7},1.5,\"['h100', 'h200']\"")
    lines.append("chute-idle,model-idle,0,2.0,['a100']")
    path.write_text("\n".join(lines) + "\n")


def write_model_families(path: pathlib.Path) -> None:
    """Write the family table: DeepSeek's two patterns and gpt-oss's one, with the artifact's three columns."""
    lines = ["match_order,family,pattern", "1,DeepSeek,deepseek", "2,DeepSeek,r1t", "3,gpt-oss,gpt-oss"]
    path.write_text("\n".join(lines) + "\n")


def write_figures(folder: pathlib.Path) -> None:
    """Write the figure list and its two PDFs."""
    figure_list = {
        "note": "The fixture's figures.",
        "sections": {"section2_background": [SECTION_FIGURE.name]},
        "external": {EXTERNAL_FIGURE.name: {"section": "section7_casestudy", "generator": "plot.py"}},
        "count": 2,
    }
    (folder / "config").mkdir()
    (folder / "config" / "figures.json").write_text(json.dumps(figure_list, indent=2))
    for figure in [SECTION_FIGURE, EXTERNAL_FIGURE]:
        (folder / figure).parent.mkdir(parents=True)
        (folder / figure).write_bytes(pdf_bytes(FIGURE_WIDTH_POINTS, FIGURE_HEIGHT_POINTS))


def pdf_bytes(width: int, height: int, pages: int = 1) -> bytes:
    """A PDF of `pages` pages, each `width` by `height` points holding one filled rectangle, with a correct
    cross-reference table."""
    content = b"0 0.4 0.8 rg 10 10 80 40 re f"
    first_page = 4  # the object number of the first page, after the catalog, the page tree and the content
    kids = []
    for number in range(first_page, first_page + pages):
        kids.append(b"%d 0 R" % number)
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [%s] /Count %d >>" % (b" ".join(kids), pages),
        b"<< /Length %d >>\nstream\n%s\nendstream" % (len(content), content),
    ]
    for _ in range(pages):
        objects.append(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %d %d] /Contents 3 0 R >>" % (width, height))
    document = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(document))
        document += b"%d 0 obj\n%s\nendobj\n" % (number, body)
    cross_reference_start = len(document)
    document += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    for offset in offsets:
        document += b"%010d 00000 n \n" % offset
    document += b"trailer\n<< /Size %d /Root 1 0 R >>\n" % (len(objects) + 1)
    document += b"startxref\n%d\n%%%%EOF\n" % cross_reference_start
    return bytes(document)


def unrenderable_pdf_bytes() -> bytes:
    """A PDF that counts one page but cannot render it: its page tree names a page object the file does not hold."""
    missing_page = b"9 0 R"  # no object 9: the fixture's PDF holds four
    return pdf_bytes(FIGURE_WIDTH_POINTS, FIGURE_HEIGHT_POINTS).replace(b"/Kids [4 0 R]", b"/Kids [%s]" % missing_page)
