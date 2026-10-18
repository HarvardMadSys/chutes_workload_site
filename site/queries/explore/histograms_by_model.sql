-- One row per trace week, model, endpoint group and metric (`input_tokens`, `output_tokens`, `ttft`) of the family
-- `$family`, the query's one parameter, bound by name: the week, the calendar days of its first and last trace day
-- within the trace (`first_day`, `last_day`, from `trace_weeks`), and two lists in bin order, the bins that hold a
-- request (`bins`) and the requests in each (`requests`), as in `histograms_by_family`. The model is one of the
-- family's eight most requested named models (`family_models`), with its `chute_id`, or `Other <family>`, with a null
-- `chute_id`, for the family's other models, as `daily_by_model` names it. The data step runs the query once per
-- family of `family_mix`.
WITH bin_requests AS (
    SELECT weekly_histograms.week,
           family_models.chute_id,
           coalesce(family_models.name, 'Other ' || $family) AS model,
           weekly_histograms.endpoint_group,
           weekly_histograms.metric,
           weekly_histograms.bin,
           sum(weekly_histograms.requests) AS requests
    FROM weekly_histograms
    LEFT JOIN family_models ON family_models.chute_id = weekly_histograms.chute_id
    WHERE weekly_histograms.family = $family
    GROUP BY weekly_histograms.week, family_models.chute_id, model, weekly_histograms.endpoint_group,
             weekly_histograms.metric, weekly_histograms.bin
)
SELECT bin_requests.week,
       trace_weeks.first_day,
       trace_weeks.last_day,
       bin_requests.chute_id,
       bin_requests.model,
       bin_requests.endpoint_group,
       bin_requests.metric,
       list(bin_requests.bin ORDER BY bin_requests.bin) AS bins,
       list(bin_requests.requests ORDER BY bin_requests.bin) AS requests
FROM bin_requests
JOIN trace_weeks ON trace_weeks.week = bin_requests.week
GROUP BY bin_requests.week, trace_weeks.first_day, trace_weeks.last_day, bin_requests.chute_id, bin_requests.model,
         bin_requests.endpoint_group, bin_requests.metric
ORDER BY bin_requests.week, bin_requests.model, bin_requests.endpoint_group, bin_requests.metric;
