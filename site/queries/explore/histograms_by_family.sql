-- One row per trace week, family, endpoint group and metric (`input_tokens`, `output_tokens`, `ttft`) of the trace
-- table: the week, the calendar day of its first trace day (`first_day`), and two lists in bin order, the bins that
-- hold a request (`bins`) and the requests in each (`requests`), the family's kept models and its other models summed
-- together. A trace week is seven trace days, week 0 the trace's first seven; the trace counts its days from
-- 1970-01-01. The family is the trace table's, the artifact's rule applied to the model's name.
WITH bin_requests AS (
    SELECT week, family, endpoint_group, metric, bin, sum(requests) AS requests
    FROM weekly_histograms
    GROUP BY week, family, endpoint_group, metric, bin
)
SELECT bin_requests.week,
       trace_calendar.calendar_day AS first_day,
       bin_requests.family,
       bin_requests.endpoint_group,
       bin_requests.metric,
       list(bin_requests.bin ORDER BY bin_requests.bin) AS bins,
       list(bin_requests.requests ORDER BY bin_requests.bin) AS requests
FROM bin_requests
JOIN trace_calendar ON trace_calendar.trace_day = DATE '1970-01-01' + bin_requests.week * 7  -- seven days a week
GROUP BY bin_requests.week, trace_calendar.calendar_day, bin_requests.family, bin_requests.endpoint_group,
         bin_requests.metric
ORDER BY bin_requests.week, bin_requests.family, bin_requests.endpoint_group, bin_requests.metric;
