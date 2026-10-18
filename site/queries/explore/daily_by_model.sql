-- One row per calendar day, model and endpoint group of the family `$family`, the query's one parameter, bound by name:
-- the day's requests, the sums of their input tokens, output tokens and TTFT, and how many requests recorded each, as
-- in `daily_by_family`. The model is one of the family's eight most requested named models (`family_models`), with its
-- `chute_id`, or `Other <family>`, with a null `chute_id`, for the family's other models. The data step runs the query
-- once per family of `family_mix`.
SELECT trace_calendar.calendar_day AS day,
       family_models.chute_id,
       coalesce(family_models.name, 'Other ' || $family) AS model,
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
LEFT JOIN family_models ON family_models.chute_id = daily_rollup.chute_id
WHERE daily_rollup.family = $family
GROUP BY trace_calendar.calendar_day, family_models.chute_id, model, endpoint_group
ORDER BY trace_calendar.calendar_day, model, endpoint_group;
