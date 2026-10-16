-- One row per calendar day, model and endpoint group: the day's requests, the sums of their input tokens, output tokens
-- and TTFT, and how many requests recorded each (`input_counted`, `output_counted`, `ttft_counted`), so that an average
-- divides by the requests that have the value. The model is one of the twenty most requested named models over the
-- whole trace (`top_models`), with its `chute_id`, or `Other`, with a null `chute_id`, for every other model.
SELECT trace_calendar.calendar_day AS day,
       top_models.chute_id,
       coalesce(top_models.name, 'Other') AS model,
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
LEFT JOIN top_models ON top_models.chute_id = daily_rollup.chute_id
                    AND top_models.rank <= 20  -- the models the Traffic Explorer's drop-down names
GROUP BY trace_calendar.calendar_day, top_models.chute_id, model, endpoint_group
ORDER BY trace_calendar.calendar_day, model, endpoint_group;
