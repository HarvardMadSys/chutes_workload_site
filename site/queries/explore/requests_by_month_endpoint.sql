-- One row per trace month and endpoint group: the month's requests to the group. `month` is the trace month, 1 for
-- the first, and `calendar_month` the calendar month its first day falls in; in each month the most requested first.
SELECT trace_calendar.month,
       trace_calendar.calendar_month,
       function_name_daily_requests.function_group AS endpoint_group,
       sum(function_name_daily_requests.requests) AS requests
FROM function_name_daily_requests
JOIN trace_calendar ON trace_calendar.trace_day = function_name_daily_requests.day::DATE
GROUP BY trace_calendar.month, trace_calendar.calendar_month, endpoint_group
ORDER BY trace_calendar.month, requests DESC, endpoint_group;
