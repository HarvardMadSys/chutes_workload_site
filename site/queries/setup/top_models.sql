-- One row per named model that served requests (a chute `chute_models` names): its chute id, its name and its rank by
-- its requests over the whole trace, the sum of its monthly requests, 1 for the most requested. A tie is ranked by
-- chute id, so the rank is the same on every run. The site's database holds the rows as the table `top_models`, from
-- which every answer that names the most requested models takes them: the eight of the mixes and trends.
SELECT chute_models.chute_id,
       chute_models.name,
       row_number() OVER (ORDER BY sum(monthly_requests_tokens_by_model.model_requests) DESC,
                                   chute_models.chute_id) AS rank
FROM monthly_requests_tokens_by_model
JOIN chute_models ON chute_models.chute_id = monthly_requests_tokens_by_model.chute_id
GROUP BY chute_models.chute_id, chute_models.name
ORDER BY rank;
