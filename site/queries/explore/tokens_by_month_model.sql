-- One row per trace month and model of the mix: the month's tokens of each of the eight most requested named models
-- over the whole trace (`top_models`), and of every other model as `Other`. `month` is the trace month, 1 for the
-- first, and `calendar_month` the calendar month its first day falls in; in each month the eight by tokens, then
-- `Other` last.
SELECT trace_calendar.month,
       trace_calendar.calendar_month,
       coalesce(top_models.name, 'Other') AS model,
       sum(monthly_requests_tokens_by_model.model_tokens) AS tokens
FROM monthly_requests_tokens_by_model
JOIN trace_calendar ON trace_calendar.trace_day = monthly_requests_tokens_by_model.month::DATE
LEFT JOIN top_models ON top_models.chute_id = monthly_requests_tokens_by_model.chute_id
                    AND top_models.rank <= 8  -- the eight series colours a chart of models has
GROUP BY trace_calendar.month, trace_calendar.calendar_month, model
ORDER BY trace_calendar.month, model = 'Other', tokens DESC, model;
