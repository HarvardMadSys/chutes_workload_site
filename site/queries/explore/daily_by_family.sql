-- One row per calendar day, family and endpoint group: the day's requests, the sums of their input tokens, output tokens
-- and TTFT, and how many requests recorded each (`input_counted`, `output_counted`, `ttft_counted`), so that an average
-- divides by the requests that have the value. The family is the cache's: a family of the artifact's family table, or
-- `Other` for every model in none. `family_slug` is the family's slug as `family_mix`, the families' one home, makes
-- it, by the same expression.
SELECT trace_calendar.calendar_day AS day,
       daily_rollup.family,
       regexp_replace(lower(daily_rollup.family), '[^a-z0-9]+', '-', 'g') AS family_slug,
       daily_rollup.function_group AS endpoint_group,
       sum(daily_rollup.requests) AS requests,
       sum(daily_rollup.input_tokens) AS input_tokens,
       sum(daily_rollup.input_counted) AS input_counted,
       sum(daily_rollup.output_tokens) AS output_tokens,
       sum(daily_rollup.output_counted) AS output_counted,
       sum(daily_rollup.ttft_sum) AS ttft_sum,
       sum(daily_rollup.ttft_counted) AS ttft_counted
FROM daily_rollup
JOIN trace_calendar ON trace_calendar.trace_day = daily_rollup.day::DATE
GROUP BY trace_calendar.calendar_day, daily_rollup.family, endpoint_group
ORDER BY trace_calendar.calendar_day, daily_rollup.family, endpoint_group;
