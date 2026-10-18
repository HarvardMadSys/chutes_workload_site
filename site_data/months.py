"""Trace days, trace weeks and trace months, and the calendar dates they stand for: all the data step's date arithmetic.

The caches count the trace's timestamps from its first day, written 1970-01-01, so a cache's day is a trace day, and:
- a trace month is `date_trunc('month')` in that 1970 time, month 1 being 1970-01 and month 13 1971-01: a month-long
  stretch of days from the trace's first, not a calendar month;
- a trace week is `DAYS_PER_TRACE_WEEK` trace days, week 0 the trace's first seven.
`trace_calendar` gives each trace day its calendar day, and each trace month the calendar month its first day falls
in, which labels it as the paper's axes do; `trace_weeks` gives each week the calendar days of its first and last trace
day within the trace. The queries join the two; the trace query is bound `TRACE_EPOCH` and `DAYS_PER_TRACE_WEEK`
(`tables.TRACE_QUERY_PARAMETERS`). The browser's copies, `TRACE_FIRST_DAY` (`site/js/shared/format.js`) and
`TRACE_MONTH_NAMES` (`site/js/plot/trace_axes.js`), are tied to this calendar by the node tests.
"""

import datetime

import pyarrow

TRACE_START = datetime.date(2025, 4, 11)  # the trace's first day, 2025-04-11, as the artifact's `trace_totals` gives it
TRACE_EPOCH = datetime.date(1970, 1, 1)  # the trace's first day as the caches write it
DAYS_PER_TRACE_WEEK = 7  # a trace week is seven trace days, week 0 the trace's first seven
# The calendar's columns and their types: days as dates, the trace month as a 64-bit integer.
TRACE_CALENDAR_SCHEMA = pyarrow.schema([
    ("trace_day", pyarrow.date32()),
    ("calendar_day", pyarrow.date32()),
    ("month", pyarrow.int64()),
    ("calendar_month", pyarrow.string()),
])
# The weeks' columns and their types: the week as a 32-bit integer, the trace table's type, and its days as dates.
TRACE_WEEKS_SCHEMA = pyarrow.schema([
    ("week", pyarrow.int32()),
    ("first_day", pyarrow.date32()),
    ("last_day", pyarrow.date32()),
])


def trace_calendar(last_trace_day: datetime.date) -> pyarrow.Table:
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
    return pyarrow.Table.from_pylist(rows, schema=TRACE_CALENDAR_SCHEMA)


def trace_weeks(last_trace_day: datetime.date) -> pyarrow.Table:
    """One row per trace week from week 0 to the week of `last_trace_day`: `week`, and the calendar days of its first
    and last trace day within the trace (`first_day`, `last_day`), so the last week ends on `last_trace_day`'s."""
    rows = []
    week = 0
    first_trace_day = TRACE_EPOCH
    while first_trace_day <= last_trace_day:
        last_day_of_week = first_trace_day + datetime.timedelta(days=DAYS_PER_TRACE_WEEK - 1)
        rows.append({
            "week": week,
            "first_day": calendar_day(first_trace_day),
            "last_day": calendar_day(min(last_day_of_week, last_trace_day)),
        })
        week += 1
        first_trace_day += datetime.timedelta(days=DAYS_PER_TRACE_WEEK)
    return pyarrow.Table.from_pylist(rows, schema=TRACE_WEEKS_SCHEMA)


def calendar_day(trace_day: datetime.date) -> datetime.date:
    """The calendar day the trace day stands for: as many days after `TRACE_START` as it is after 1970-01-01."""
    return TRACE_START + (trace_day - TRACE_EPOCH)


def trace_month(trace_day: datetime.date) -> int:
    """The trace month the trace day falls in, 1 for 1970-01, 13 for 1971-01."""
    return (trace_day.year - TRACE_EPOCH.year) * 12 + trace_day.month


def calendar_month(trace_day: datetime.date) -> str:
    """The label of the trace day's trace month: `YYYY-MM` of the calendar day of that month's first day."""
    return calendar_day(trace_day.replace(day=1)).strftime("%Y-%m")
