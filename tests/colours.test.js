import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assignColours, barColours, ENDPOINT_FIRST_SLOT, endpointColours, FAMILY_SLOTS, familyColours, modelColours,
  OTHER_SERIES, SERIES_SLOTS,
} from "../site/js/theme/colours.js";

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

test("a family's models take the series colours in their order from the first slot, and Other its grey", () => {
  const modelRows = [
    { model: "deepseek-v3", requests: 30 },
    { model: "qwen3", requests: 20 },
    { model: "Other", requests: 50 },
  ];
  assert.deepEqual([...modelColours(modelRows).entries()], [
    ["deepseek-v3", "var(--series-1)"],
    ["qwen3", "var(--series-2)"],
    ["Other", OTHER_SERIES],
  ]);
});

test("the endpoint groups take the series colours from their own first slot, and the group other folds into Other", () => {
  const endpointMixRows = [
    { endpoint_group: "chat", requests: 50 },
    { endpoint_group: "chat_stream", requests: 40 },
    { endpoint_group: "completion_stream", requests: 9 },
    { endpoint_group: "other", requests: 2 },
    { endpoint_group: "completion", requests: 1 },
  ];
  assert.deepEqual([...endpointColours(endpointMixRows).entries()], [
    ["chat", SERIES_SLOTS[ENDPOINT_FIRST_SLOT]],
    ["chat_stream", SERIES_SLOTS[ENDPOINT_FIRST_SLOT + 1]],
    ["completion_stream", SERIES_SLOTS[ENDPOINT_FIRST_SLOT + 2]],
    ["completion", SERIES_SLOTS[ENDPOINT_FIRST_SLOT + 3]],
    ["Other", OTHER_SERIES],
  ]);
  assert.notEqual(ENDPOINT_FIRST_SLOT, 0, "the endpoint donut opens on another colour than the family donut");
});

test("the ten family slots are the eight series slots, then the ninth and tenth series tokens", () => {
  assert.deepEqual(FAMILY_SLOTS, [...SERIES_SLOTS, "var(--series-9)", "var(--series-10)"]);
  assert.ok(Object.isFrozen(FAMILY_SLOTS));
});

test("the families take the ten family slots in their order, and Other its grey, last, wherever it is listed", () => {
  const families = ["DeepSeek", "Qwen", "Other", "Gemma", "Mistral", "GLM", "Hermes", "gpt-oss", "Kimi", "Llama",
    "MiniMax"];
  const colours = familyColours(families.map((family) => ({ family })));
  assert.deepEqual([...colours.keys()], [
    "DeepSeek", "Qwen", "Gemma", "Mistral", "GLM", "Hermes", "gpt-oss", "Kimi", "Llama", "MiniMax", "Other",
  ]);
  assert.deepEqual([...colours.values()], [...FAMILY_SLOTS, OTHER_SERIES]);
});

test("an eleventh named family takes no colour, and so folds into Other", () => {
  const families = ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11"];
  const colours = familyColours(families.map((family) => ({ family })));
  assert.equal(colours.has("f11"), false);
  assert.equal(colours.size, 11);
});
