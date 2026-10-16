"""Trace days and trace months, and the calendar dates they stand for.

The trace's timestamps count from its first day, which the caches write as 1970-01-01, so a cache's day is a trace
day and its month a trace month: `date_trunc('month')` in that 1970 time, month 1 being 1970-01 and month 13 1971-01.
A trace month is a month-long stretch of days from the trace's first day, not a calendar month. `trace_calendar`
gives each trace day its calendar day and each trace month the calendar month its first day falls in, which labels
the whole trace month, as the paper's axes do. All the site's date arithmetic is here; the queries join the calendar.
"""

import datetime

import pandas

TRACE_START = datetime.date(2025, 4, 11)  # the trace's first day: the paper's Table 2 span, 2025-04-11 to 2026-04-12
TRACE_EPOCH = datetime.date(1970, 1, 1)  # the trace's first day as the caches write it


def trace_calendar(last_trace_day: datetime.date) -> pandas.DataFrame:
    """One row per trace day from the first to `last_trace_day`, inclusive: `trace_day` (in 1970 time),
    `calendar_day`, `month` (the trace month, 1 for the first) and `calendar_month` (`YYYY-MM` of the trace month's
    first day's calendar day)."""
    rows = []
    trace_day = TRACE_EPOCH
    while trace_day <= last_trace_day:
        rows.append({
            "trace_day": trace_day,
            "calendar_day": calendar_day(trace_day),
            "month": trace_month(trace_day),
            "calendar_month": calendar_month(trace_day),
        })
        trace_day += datetime.timedelta(days=1)
    return pandas.DataFrame(rows, columns=["trace_day", "calendar_day", "month", "calendar_month"])


def calendar_day(trace_day: datetime.date) -> datetime.date:
    """The calendar day the trace day stands for: as many days after `TRACE_START` as it is after 1970-01-01."""
    return TRACE_START + (trace_day - TRACE_EPOCH)


def trace_month(trace_day: datetime.date) -> int:
    """The trace month the trace day falls in, 1 for 1970-01, 13 for 1971-01."""
    return (trace_day.year - TRACE_EPOCH.year) * 12 + trace_day.month


def calendar_month(trace_day: datetime.date) -> str:
    """The label of the trace day's trace month: `YYYY-MM` of the calendar day of that month's first day."""
    return calendar_day(trace_day.replace(day=1)).strftime("%Y-%m")
