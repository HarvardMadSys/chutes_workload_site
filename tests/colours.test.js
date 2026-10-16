import assert from "node:assert/strict";
import { test } from "node:test";

import { assignColours, barColours, OTHER_SERIES, SERIES_SLOTS, slottedColours } from "../site/js/theme/colours.js";

const NINE_MODELS = ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9"];

test("the eight series slots are the series tokens in order, and cannot be changed", () => {
  assert.equal(SERIES_SLOTS.length, 8);
  assert.equal(SERIES_SLOTS[0], "var(--series-1)");
  assert.equal(SERIES_SLOTS[7], "var(--series-8)");
  assert.ok(Object.isFrozen(SERIES_SLOTS));
});

test("names get the slots in the order given", () => {
  const colours = assignColours(["qwen3", "deepseek-v3", "glm-4.5"]);
  assert.deepEqual([...colours.entries()], [
    ["qwen3", "var(--series-1)"],
    ["deepseek-v3", "var(--series-2)"],
    ["glm-4.5", "var(--series-3)"],
  ]);
});

test("a repeated name keeps its first slot and takes no other", () => {
  const colours = assignColours(["deepseek-v3", "glm-4.5", "deepseek-v3", "kimi-k2"]);
  assert.deepEqual([...colours.entries()], [
    ["deepseek-v3", "var(--series-1)"],
    ["glm-4.5", "var(--series-2)"],
    ["kimi-k2", "var(--series-3)"],
  ]);
});

test("the same order gives the same colours on every call", () => {
  assert.deepEqual(assignColours(NINE_MODELS), assignColours(NINE_MODELS));
});

test("the ninth name and beyond take the other colour", () => {
  const colours = assignColours([...NINE_MODELS, "m10"]);
  assert.equal(colours.get("m8"), "var(--series-8)");
  assert.equal(colours.get("m9"), OTHER_SERIES);
  assert.equal(colours.get("m10"), "var(--series-other)");
});

test("names may start from a later slot, going round to the first, and the ninth still takes the other colour", () => {
  const colours = assignColours(NINE_MODELS, 4);
  assert.deepEqual([...colours.values()].slice(0, 5), [
    "var(--series-5)", "var(--series-6)", "var(--series-7)", "var(--series-8)", "var(--series-1)",
  ]);
  assert.equal(new Set([...colours.values()].slice(0, 8)).size, 8);
  assert.equal(colours.get("m9"), OTHER_SERIES);
});

test("a bar chart's colours are the first eight names' series colours and Other's", () => {
  const colours = barColours(NINE_MODELS);
  assert.deepEqual([...colours.keys()], ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "Other"]);
  assert.equal(colours.get("m8"), SERIES_SLOTS[7]);
  assert.equal(colours.get("Other"), OTHER_SERIES);
});

test("the slotted colours are the first eight names in their order, none in the Other grey", () => {
  const slotted = slottedColours(assignColours(NINE_MODELS));
  assert.deepEqual([...slotted.keys()], NINE_MODELS.slice(0, 8));
  assert.ok(![...slotted.values()].includes(OTHER_SERIES));
});
