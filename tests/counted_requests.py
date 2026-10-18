"""The requests per family and metric that the daily answer and the histogram answer each count, so that a test can
check that the trace table's histograms and the daily rollup agree: the daily rows' requests that recorded each metric
(`daily_counted_requests`) and the histogram rows' requests (`histogram_requests`)."""

import typing

# Each metric of the trace table and the daily rollup's column counting the requests that recorded it.
COUNTED_COLUMNS = {"input_tokens": "input_counted", "output_tokens": "output_counted", "ttft": "ttft_counted"}


class FamilyMetric(typing.NamedTuple):
    """The requests of one family that record one metric."""

    family: str
    metric: str


def daily_counted_requests(rows: list[dict]) -> dict[FamilyMetric, int]:
    """The requests of daily answer rows by family (`explore/daily_by_family`) that recorded each metric, per family
    and metric, summed over days and endpoint groups; a family none of whose requests recorded a metric is left out,
    as the histograms have no row for it."""
    counts = {}
    for row in rows:
        for metric, column in COUNTED_COLUMNS.items():
            key = FamilyMetric(row["family"], metric)
            counts[key] = counts.get(key, 0) + row[column]
    return {key: count for key, count in counts.items() if count > 0}


def histogram_requests(rows: list[dict]) -> dict[FamilyMetric, int]:
    """The requests of histogram answer rows by family (`explore/histograms_by_family`) per family and metric, summed
    over weeks, endpoint groups and bins."""
    counts = {}
    for row in rows:
        key = FamilyMetric(row["family"], row["metric"])
        counts[key] = counts.get(key, 0) + sum(row["requests"])
    return counts
