-- One row per model of the mix: the requests over the whole trace of each of the eight most requested named models
-- (`top_models`), and of every other model, named or not, as `Other`; the eight by requests, then `Other` last.
SELECT coalesce(top_models.name, 'Other') AS model,
       sum(monthly_requests_tokens_by_model.model_requests) AS requests
FROM monthly_requests_tokens_by_model
LEFT JOIN top_models ON top_models.chute_id = monthly_requests_tokens_by_model.chute_id
                    AND top_models.rank <= 8  -- the eight series colours a chart of models has
GROUP BY model
ORDER BY model = 'Other', requests DESC, model;
