-- One row: the whole trace as the paper's summary table counts it. `first_day` and `last_day` are the calendar days of
-- its first and last request, `months` the trace months from the first day to the last, and the rest the artifact's
-- totals; `users` counts distinct anonymised user ids, which is not the paper's count of people.
SELECT first_day_calendar.calendar_day AS first_day,
       last_day_calendar.calendar_day AS last_day,
       (SELECT count(DISTINCT trace_calendar.month)
        FROM trace_calendar
        WHERE trace_calendar.trace_day <= last_day_calendar.trace_day) AS months,
       trace_totals.requests,
       trace_totals.input_tokens,
       trace_totals.output_tokens,
       trace_totals.users,
       trace_totals.models,
       trace_totals.instances
FROM trace_totals
JOIN trace_calendar AS first_day_calendar ON first_day_calendar.trace_day = trace_totals.first_started_at::DATE
JOIN trace_calendar AS last_day_calendar ON last_day_calendar.trace_day = trace_totals.last_started_at::DATE;
