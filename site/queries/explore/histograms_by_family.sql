-- One row per trace week, family, endpoint group and metric (`input_tokens`, `output_tokens`, `ttft`) of the trace
-- table: the week, the calendar days of its first and last trace day within the trace (`first_day`, `last_day`, from
-- `trace_weeks`), and two lists in bin order, the bins that hold a request (`bins`) and the requests in each
-- (`requests`), the family's kept models and its other models summed together. The family is the trace table's, the
-- artifact's rule applied to the model's name.
WITH bin_requests AS (
    SELECT week, family, endpoint_group, metric, bin, sum(requests) AS requests
    FROM weekly_histograms
    GROUP BY week, family, endpoint_group, metric, bin
)
SELECT bin_requests.week,
       trace_weeks.first_day,
       trace_weeks.last_day,
       bin_requests.family,
       bin_requests.endpoint_group,
       bin_requests.metric,
       list(bin_requests.bin ORDER BY bin_requests.bin) AS bins,
       list(bin_requests.requests ORDER BY bin_requests.bin) AS requests
FROM bin_requests
JOIN trace_weeks ON trace_weeks.week = bin_requests.week
GROUP BY bin_requests.week, trace_weeks.first_day, trace_weeks.last_day, bin_requests.family,
         bin_requests.endpoint_group, bin_requests.metric
ORDER BY bin_requests.week, bin_requests.family, bin_requests.endpoint_group, bin_requests.metric;
