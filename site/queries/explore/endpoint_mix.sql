-- One row per endpoint group (chat, chat stream, completion, completion stream, other): its requests over the whole
-- trace, most requested first.
SELECT function_group AS endpoint_group,
       sum(requests) AS requests
FROM function_name_daily_requests
GROUP BY endpoint_group
ORDER BY requests DESC, endpoint_group;
