import assert from "node:assert/strict";
import { test } from "node:test";

import {
  endpointFigureColours, ENDPOINT_LABELS, ENDPOINT_SERIES, FAMILY_SERIES, figureColours, FIXED_SERIES_COLOURS, HIGHLIGHTED_LABELS,
  HIGHLIGHTED_SERIES, MODEL_SERIES, SERIES_COLUMN, seriesLabel, seriesLegend, shownRows, shownSeriesRows,
} from "../site/js/shared/series.js";
import { assignColours, FAMILY_SLOTS, OTHER_SERIES, SERIES_SLOTS } from "../site/js/theme/colours.js";
import { endpointColours, familyColours, modelColours } from "../site/js/theme/colours.js";

// Two models of a monthly answer, two months each.
const ROWS = [
  { model: "qwen3", calendar_month: "2025-04", requests: 3 },
  { model: "qwen3", calendar_month: "2025-05", requests: 40 },
  { model: "glm-5", calendar_month: "2025-04", requests: 7 },
  { model: "glm-5", calendar_month: "2025-05", requests: 12 },
];

test("a long-format figure keeps the rows of the series not hidden, in their order", () => {
  const rows = [{ model: "a", x: 1 }, { model: "b", x: 2 }, { model: "a", x: 3 }];
  assert.deepEqual(shownRows(rows, "model", new Set(["b"])), [{ model: "a", x: 1 }, { model: "a", x: 3 }]);
  assert.deepEqual(shownRows(rows, "model", new Set()), rows);
});

test("a legend lists the series the rows hold, in the colours' order, each labelled where it has a label", () => {
  const colours = new Map([["qwen3", "red"], ["kimi-k2", "blue"], ["glm-5", "green"]]);
  const legend = seriesLegend(ROWS, "model", colours, { "glm-5": "GLM 5" });
  assert.deepEqual(legend.series, [{ name: "qwen3", label: "qwen3" }, { name: "glm-5", label: "GLM 5" }]);
  assert.equal(legend.colours, colours);
});

test("the models and the endpoint groups are each coloured by their order's rows and named by their column", () => {
  assert.deepEqual([MODEL_SERIES.order, MODEL_SERIES.column, MODEL_SERIES.colours], ["models", "model", modelColours]);
  assert.deepEqual([ENDPOINT_SERIES.order, ENDPOINT_SERIES.column, ENDPOINT_SERIES.colours],
    ["endpoints", "endpoint_group", endpointColours]);
  assert.deepEqual([FAMILY_SERIES.order, FAMILY_SERIES.column, FAMILY_SERIES.colours],
    ["families", "family", familyColours]);
  assert.equal(MODEL_SERIES.labels, undefined, "a model is written by its name");
  assert.equal(FAMILY_SERIES.labels, undefined, "a family is written by its name");
  assert.equal(ENDPOINT_SERIES.labels, ENDPOINT_LABELS);
});

test("each endpoint group is labelled in words", () => {
  assert.deepEqual(ENDPOINT_LABELS, {
    chat: "Chat",
    chat_stream: "Chat stream",
    completion: "Completion",
    completion_stream: "Completion stream",
    other: "Other",
  });
});

test("a series is labelled by its label where it has one, else by its name", () => {
  assert.equal(seriesLabel({ "deepseek-r1": "DeepSeek R1" }, "deepseek-r1"), "DeepSeek R1");
  assert.equal(seriesLabel({}, "Global"), "Global");
});

test("a figure's shown rows are its panel's, of the coloured series not hidden, in their order", () => {
  const colours = assignColours(["Global", "DeepSeek R1"]);
  const rows = [
    { series: "Global", x: 1, panel: "a" },
    { series: "DeepSeek R1", x: 1, panel: "a" },
    { series: "Unlisted", x: 1, panel: "a" },
    { series: "Global", x: 1, panel: "b" },
  ];
  assert.equal(SERIES_COLUMN, "series");
  assert.deepEqual(shownSeriesRows(rows, colours, "a", new Set(["DeepSeek R1"])), [rows[0]]);
  assert.deepEqual(shownSeriesRows(rows, colours, undefined, new Set()), [rows[0], rows[1], rows[3]]);
});

test("a figure card's global series and highlighted models keep their fixed colours, the others the free slots", () => {
  const colours = figureColours(["Global", "Minimax M2.5", "Other A", "DeepSeek V3.2", "Other B"]);
  assert.deepEqual([...colours], [
    ["Global", "var(--color-text)"],
    ["Minimax M2.5", SERIES_SLOTS[2]],
    ["Other A", SERIES_SLOTS[1]],
    ["DeepSeek V3.2", SERIES_SLOTS[0]],
    ["Other B", SERIES_SLOTS[3]],
  ]);
  assert.equal(FIXED_SERIES_COLOURS["Deepseek R1"], SERIES_SLOTS[1]);
});

test("a figure card's series past the free slots are drawn in the Other grey", () => {
  const names = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9"];
  const colours = figureColours(names);
  assert.deepEqual([...colours.values()], [...SERIES_SLOTS, OTHER_SERIES]);
});

test("a figure card given the families' slots colours ten series before the Other grey", () => {
  const names = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "Others"];
  const colours = figureColours(names, FAMILY_SLOTS);
  assert.deepEqual([...colours.values()], [...FAMILY_SLOTS, OTHER_SERIES]);
});

test("the highlighted series and the oracle are the fixed ones, the global series first, and only their names are relabelled", () => {
  assert.deepEqual([...HIGHLIGHTED_SERIES, "Belady (size-aware)"].sort(), Object.keys(FIXED_SERIES_COLOURS).sort());
  assert.equal(FIXED_SERIES_COLOURS["Belady (size-aware)"], FIXED_SERIES_COLOURS.Global);
  assert.equal(HIGHLIGHTED_SERIES[0], "Global");
  assert.ok(Object.keys(HIGHLIGHTED_LABELS).every((name) => HIGHLIGHTED_SERIES.includes(name)));
});

// The rows of `explore/endpoint_mix`, most requested first, as the page reads them.
const ENDPOINT_MIX_ROWS = [
  { endpoint_group: "chat", requests: 50 },
  { endpoint_group: "chat_stream", requests: 40 },
  { endpoint_group: "other", requests: 30 },
  { endpoint_group: "completion", requests: 20 },
];

test("a figure's endpoint groups, written by their labels, take the endpoint groups' colours, Other its grey", () => {
  const groupColours = endpointColours(ENDPOINT_MIX_ROWS);
  const names = ["Chat Stream", "Completion", "Chat", "Other"];
  const colours = endpointFigureColours(names, { "Chat Stream": "Chat stream" }, ENDPOINT_MIX_ROWS);
  assert.deepEqual([...colours], [
    ["Chat Stream", groupColours.get("chat_stream")],
    ["Completion", groupColours.get("completion")],
    ["Chat", groupColours.get("chat")],
    ["Other", OTHER_SERIES],
  ]);
  assert.throws(() => endpointFigureColours(["Batch"], {}, ENDPOINT_MIX_ROWS), /"Batch"/);
});
