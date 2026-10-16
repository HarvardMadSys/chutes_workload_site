# Change: Families in the Traffic Explorer

## Why

The Traffic Explorer's drop-down offers the twenty most requested models
one by one, and its chart stacks them. That is too fine for the first
question a visitor asks, how much of the traffic is DeepSeek, Qwen or
Gemma, and too coarse for the second, which DeepSeek: the twenty include
eleven DeepSeek variants and no Kimi or Llama at all. The explorer should
answer by family first and by model within the chosen family.

## What

- **A family per named model**, defined in the artifact: one small table,
  `data/paper/model_families.csv`, of families and the name patterns that
  place a model in them, the first match winning; a named model that
  matches none, and every unnamed model, is Other. The artifact's daily
  rollup gains the family and keeps the model for the eight most
  requested named models of each family.
- **The explorer chooses a family, then a model.** With no family
  chosen, the chart stacks requests per day by family. Once a family is
  chosen, the model drop-down offers that family's eight and "Other
  <family>", and the chart stacks by model. Once a model is chosen, the
  chart stacks by endpoint group, as today. The endpoint and period
  controls and the four tiles are unchanged. The URL gains `family`.
- **Two answers instead of one.** The page loads the daily rows by
  family and endpoint group; a family's daily rows by model are a
  separate answer per family, fetched when the family is chosen, so no
  visitor downloads models they did not ask for.

## What it moves

- The artifact's `daily_rollup.parquet` is recomputed with a `family`
  column and the top eight per family in place of the top twenty overall;
  the trace is read once here. Its size grows from 781 KB to a few MB
  (measured in design.md).
- The explorer's first answer stays about the size of today's; each
  family's model answer is smaller.
- "Other" in the explorer now means a family (the models in no family)
  and, within a family, the models past its eight; the Overview's Other
  (the models past its eight overall) is unchanged.

## Pushback and open points

1. **The family rule is a name pattern.** A fine-tune carries its base
   family's name, so `DeepHermes-3-Mistral-24B` is Hermes only because
   Hermes is listed before Mistral; `DeepSeek-R1-0528-Qwen3-8B` is
   DeepSeek because DeepSeek is listed before Qwen. The table is the one
   place to argue with. The alternative, the organisation prefix, puts
   Gemma under unsloth and the TNG Chimeras outside DeepSeek.
2. **TEE variants stay separate models.** `DeepSeek-V3-0324` and
   `DeepSeek-V3-0324-TEE` are two chute ids in the trace and two entries
   in the family's drop-down.
3. **The Overview keeps its eight models.** Its donut and trends could
   go by family too, in a later change if wanted.

## Not in this change

- Families anywhere but the Traffic Explorer.
- Any change to the figures (the change `native-figures`).
