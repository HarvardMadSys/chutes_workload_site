-- The trace table: one row per trace week, family, kept model, endpoint group, metric and bin of the trace's requests
-- that have a start time, with the requests in the bin. A request's week is the days from `$trace_epoch`, the trace's
-- first day as its timestamps write it, to its start, divided by `$days_per_trace_week`, the two parameters bound by
-- name from the data step's one definition of the week; week 0 is the trace's first seven days. A request's family is
-- the artifact's rule: the family of the first pattern of `model_families` (lowest `match_order`) that its model's
-- name in `chute_models` contains, case-insensitively, and `Other` for a named model matching none and for a chute
-- `chute_models` does not name. Its chute id is kept for the models of `family_models`, a family's eight most
-- requested named models, as the daily rollup keeps it, and is null for the family's other models. Its endpoint group
-- is its function name for the four the rollup names, else `other`. The metrics are `input_tokens` (`it`),
-- `output_tokens` (`ot`) and `ttft`. A bin is a quarter of a doubling, four bins per doubling: a value v is in bin
-- floor(4 * log2(v)). A recorded token count is binned, one at or below 1 in bin 0; a TTFT is binned only where it is
-- positive, as the rollup counts it, and may fall in a negative bin (0.5 s is bin -4). The rows are sorted by every
-- key, so a rebuild writes the same bytes.
-- The query reads the trace once and never holds its rows whole: one projection gives each request its three bins,
-- and UNPIVOT turns them into one row per metric.
WITH named_model_families AS (
    SELECT chute_models.chute_id,
           arg_min(model_families.family, model_families.match_order) AS family
    FROM chute_models
    JOIN model_families ON contains(lower(chute_models.name), lower(model_families.pattern))
    GROUP BY chute_models.chute_id
),
binned AS (
    SELECT (date_diff('day', $trace_epoch, trace.started_at::DATE) // $days_per_trace_week)::INTEGER AS week,
           coalesce(named_model_families.family, 'Other') AS family,
           family_models.chute_id,
           CASE
               WHEN trace.function_name IN ('completion_stream', 'chat_stream', 'chat', 'completion')
                   THEN trace.function_name
               ELSE 'other'
           END AS endpoint_group,
           -- Each bin is null where the value is not binned. The CASE keeps a token count that is not recorded null:
           -- DuckDB's greatest(NULL, 1) is 1, which would put it in bin 0.
           CASE WHEN trace.it IS NOT NULL THEN floor(4 * log2(greatest(trace.it, 1)))::INTEGER END AS input_tokens,
           CASE WHEN trace.ot IS NOT NULL THEN floor(4 * log2(greatest(trace.ot, 1)))::INTEGER END AS output_tokens,
           CASE WHEN trace.ttft > 0 THEN floor(4 * log2(trace.ttft))::INTEGER END AS ttft
    FROM trace
    LEFT JOIN named_model_families ON named_model_families.chute_id = trace.chute_id
    LEFT JOIN family_models ON family_models.chute_id = trace.chute_id
    WHERE trace.started_at IS NOT NULL
),
unpivoted AS (
    -- One row per request and metric, the metric named by its bin column's name.
    UNPIVOT binned ON input_tokens, output_tokens, ttft INTO NAME metric VALUE bin
)
SELECT week, family, chute_id, endpoint_group, metric, bin, count(*) AS requests
FROM unpivoted
WHERE bin IS NOT NULL
GROUP BY week, family, chute_id, endpoint_group, metric, bin
ORDER BY week, family, chute_id NULLS LAST, endpoint_group, metric, bin;
