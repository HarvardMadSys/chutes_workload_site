"""The fixture artifact's plot-ready tables: one per chart kind, a few rows each, under a real figure's name and with
its kind's columns in the artifact's column types (integers as int64, numbers as double, text as large_string).

`cells`' second value is NaN and `lines`' third `y` null, which an answer writes as null; `lines` and `bars` carry the
optional `panel`, first as the artifact writes it.
"""

import math

import pyarrow


def text(values: list[str]) -> pyarrow.Array:
    """A column of text, typed as the artifact's tables type it."""
    return pyarrow.array(values, pyarrow.large_string())


def plotdata_tables() -> dict[str, pyarrow.Table]:
    """Each fixture figure's plot-ready table, by the figure's name, one figure per chart kind."""
    return {
        "fig_seasonality": cells(),
        "fig_token_length_input_cdf_by_model": cdf(),
        "fig_model_raster_qwen3_next_80b": raster(),
        "fig_model_heatmap_fixedxy_scatter_colored_metrics": scatter(),
        "fig_top10_model_monthly_share_legend": legend(),
        "fig_top10_model_monthly_request_share": stacked_bars(),
        "fig_monthly_input_token_intervals": bands(),
        "fig_per_user_iat_p50_by_model": boxes(),
        "fig_lb_user_zoom_top": bars(),
        "fig_routing_tradeoff": lines(),
    }


def cells() -> pyarrow.Table:
    """Two cells of one row, the second with no value."""
    return pyarrow.table({"x_low": [0, 1], "x_high": [1, 2], "y_low": [0, 0], "y_high": [1, 1],
                          "value": [0.5, math.nan]})


def cdf() -> pyarrow.Table:
    """Two steps for each of two series."""
    return pyarrow.table({"series": text(["Global", "Global", "DeepSeek V3.2", "DeepSeek V3.2"]),
                          "x": [1.0, 10.0, 2.0, 20.0], "cdf": [0.0, 1.0, 0.0, 1.0]})


def raster() -> pyarrow.Table:
    """Three request counts at integer grid positions."""
    return pyarrow.table({"x": [0, 1, 0], "y": [0, 0, 1], "value": [3, 1, 2]})


def scatter() -> pyarrow.Table:
    """Two points, one value below zero."""
    return pyarrow.table({"x": [1.5, 2.5], "y": [3.0, 4.0], "value": [-0.25, 0.75]})


def legend() -> pyarrow.Table:
    """Three series in their order."""
    return pyarrow.table({"series": text(["model-01", "model-02", "Other"]), "rank": [1, 2, 3]})


def stacked_bars() -> pyarrow.Table:
    """Two series' shares over two months, each month summing to 1."""
    return pyarrow.table({"series": text(["model-01", "Other", "model-01", "Other"]), "x": [0, 0, 1, 1],
                          "value": [0.625, 0.375, 0.75, 0.25]})


def bands() -> pyarrow.Table:
    """Two months' five quantiles."""
    return pyarrow.table({"x": [0, 1], "p10": [1.0, 2.0], "p25": [2.0, 3.0], "p50": [3.0, 4.0], "p75": [4.0, 5.0],
                          "p90": [5.0, 6.0]})


def boxes() -> pyarrow.Table:
    """Two series' five statistics and how many values each holds."""
    return pyarrow.table({"series": text(["DeepSeek R1", "MiniMax M2.5"]), "low": [0.5, 1.0], "q1": [1.0, 2.0],
                          "median": [2.0, 3.0], "q3": [4.0, 5.0], "high": [8.0, 9.0], "count": [12, 7]})


def bars() -> pyarrow.Table:
    """Two series over two x values, in two panels."""
    return pyarrow.table({"panel": text(["request_share", "request_share", "token_hit", "token_hit"]),
                          "series": text(["user-a", "user-b", "user-a", "user-b"]), "x": [0, 1, 0, 1],
                          "value": [0.5, 0.25, 0.875, 0.125]})


def lines() -> pyarrow.Table:
    """One series in each of two panels, one point with no y."""
    return pyarrow.table({"panel": text(["a", "a", "b", "b"]), "series": text(["Global"] * 4), "x": [0, 1, 0, 1],
                          "y": [1.0, 2.0, None, 4.0]})
