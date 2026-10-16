-- One row per named model of the daily rollup (a chute `chute_models` names): its family, its chute id, its name, its
-- requests over the whole trace, the sum of its daily rollup rows, and its rank within its family by those requests,
-- 1 for the most requested. A tie is ranked by chute id, so the rank is the same on every run. The rollup keeps the
-- chute id of a family's eight most requested named models alone, so these are a family's eight. The site's database
-- holds the rows as the table `family_models`, from which every answer that names a family's models takes them.
SELECT daily_rollup.family,
       chute_models.chute_id,
       chute_models.name,
       sum(daily_rollup.requests) AS requests,
       row_number() OVER (PARTITION BY daily_rollup.family
                          ORDER BY sum(daily_rollup.requests) DESC, chute_models.chute_id) AS rank
FROM daily_rollup
JOIN chute_models ON chute_models.chute_id = daily_rollup.chute_id
GROUP BY daily_rollup.family, chute_models.chute_id, chute_models.name
ORDER BY daily_rollup.family, rank;
