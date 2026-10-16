-- One row per family of the daily rollup: its requests over the whole trace, the sum of its rollup rows; most requested
-- first, then `Other`, the family of every model in no family of the artifact's table, last; a tie by name. The family
-- is the cache's.
SELECT family,
       sum(requests) AS requests
FROM daily_rollup
GROUP BY family
ORDER BY family = 'Other', requests DESC, family;
