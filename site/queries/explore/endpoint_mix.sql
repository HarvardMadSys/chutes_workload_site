-- One row per endpoint group (`chat`, `chat_stream`, `completion`, `completion_stream`, `other`): its requests over
-- the whole trace, most requested first.
SELECT function_group AS endpoint_group,
       sum(requests) AS requests
FROM function_name_daily_requests
GROUP BY endpoint_group
ORDER BY requests DESC, endpoint_group;
