"""Trace months and weeks: each trace day's calendar day, its trace month and the calendar month that month is
labelled with; each trace week's first and last calendar day."""

import datetime

import duckdb
import pyarrow

from site_data import months


def calendar_row(calendar: pyarrow.Table, trace_day: datetime.date) -> dict:
    """The calendar's row of `trace_day`, as a dict from column to value."""
    for row in calendar.to_pylist():
        if row["trace_day"] == trace_day:
            return row
    raise AssertionError(f"the calendar has no row for {trace_day}")


def test_the_first_trace_day_is_the_trace_s_start() -> None:
    calendar = months.trace_calendar(datetime.date(1970, 1, 31))
    assert calendar_row(calendar, datetime.date(1970, 1, 1)) == {
        "trace_day": datetime.date(1970, 1, 1), "calendar_day": datetime.date(2025, 4, 11), "month": 1,
        "calendar_month": "2025-04",
    }


def test_a_trace_month_is_labelled_with_its_first_day_s_calendar_month() -> None:
    calendar = months.trace_calendar(datetime.date(1971, 1, 2))
    fifth_month_start = calendar_row(calendar, datetime.date(1970, 5, 1))
    assert fifth_month_start["calendar_day"] == datetime.date(2025, 8, 9)
    assert fifth_month_start["month"] == 5
    assert fifth_month_start["calendar_month"] == "2025-08"
    # The fifth month's last day falls in September, and keeps its month's label.
    fifth_month_end = calendar_row(calendar, datetime.date(1970, 5, 31))
    assert fifth_month_end["calendar_day"] == datetime.date(2025, 9, 8)
    assert fifth_month_end["calendar_month"] == "2025-08"
    thirteenth = calendar_row(calendar, datetime.date(1971, 1, 2))
    assert (thirteenth["month"], thirteenth["calendar_month"]) == (13, "2026-04")


def test_the_calendar_holds_every_day_to_the_last() -> None:
    calendar = months.trace_calendar(datetime.date(1971, 1, 2))
    assert calendar.column_names == ["trace_day", "calendar_day", "month", "calendar_month"]
    assert calendar.num_rows == 367
    assert calendar["trace_day"].to_pylist()[-1] == datetime.date(1971, 1, 2)
    assert len(set(calendar["month"].to_pylist())) == 13


def test_the_calendar_s_days_are_dates_in_the_database() -> None:
    connection = duckdb.connect()
    connection.register("trace_calendar", months.trace_calendar(datetime.date(1970, 1, 3)))
    assert connection.table("trace_calendar").types == ["DATE", "DATE", "BIGINT", "VARCHAR"]


def test_a_trace_week_is_seven_trace_days_from_the_trace_s_first() -> None:
    weeks = months.trace_weeks(datetime.date(1970, 1, 15)).to_pylist()
    assert weeks == [
        {"week": 0, "first_day": datetime.date(2025, 4, 11), "last_day": datetime.date(2025, 4, 17)},
        {"week": 1, "first_day": datetime.date(2025, 4, 18), "last_day": datetime.date(2025, 4, 24)},
        {"week": 2, "first_day": datetime.date(2025, 4, 25), "last_day": datetime.date(2025, 4, 25)},
    ]


def test_the_last_week_ends_on_the_last_trace_day() -> None:
    weeks = months.trace_weeks(datetime.date(1971, 1, 2))
    assert weeks.num_rows == 53
    assert weeks.to_pylist()[-1] == {"week": 52, "first_day": datetime.date(2026, 4, 10),
                                     "last_day": datetime.date(2026, 4, 12)}


def test_the_weeks_are_integers_and_dates_in_the_database() -> None:
    connection = duckdb.connect()
    connection.register("trace_weeks", months.trace_weeks(datetime.date(1970, 1, 3)))
    assert connection.table("trace_weeks").types == ["INTEGER", "DATE", "DATE"]
