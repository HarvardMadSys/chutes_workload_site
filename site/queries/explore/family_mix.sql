-- One row per family of the daily rollup: its slug and its requests over the whole trace, the sum of its rollup rows;
-- most requested first, then `Other`, the family of every model in no family of the artifact's table, last; a tie by
-- name. The family is the cache's. `family_slug` is the family's name in lower case with each run of characters other
-- than letters and digits as one `-` (`DeepSeek` → `deepseek`), which names the family's answers
-- `explore/<family query>/<family_slug>` and the family in the page's URL. These rows are the families' one home:
-- their names, slugs and order, which the data step runs the family queries for and the page lists them in.
SELECT family,
       regexp_replace(lower(family), '[^a-z0-9]+', '-', 'g') AS family_slug,
       sum(requests) AS requests
FROM daily_rollup
GROUP BY family
ORDER BY family = 'Other', requests DESC, family;
