import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BY_ENDPOINT, BY_FAMILY, BY_MODEL, ENDPOINT_LABELS, SERIES_COLUMN, seriesLabel, seriesLegend, shownRows,
  shownSeriesRows,
} from "../site/js/shared/series.js";
import { assignColours, endpointColours, familyColours, modelColours } from "../site/js/theme/colours.js";

// Two models' rows, two days each.
const ROWS = [
  { model: "qwen3", day: 1, requests: 3 },
  { model: "qwen3", day: 2, requests: 40 },
  { model: "glm-5", day: 1, requests: 7 },
  { model: "glm-5", day: 2, requests: 12 },
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

test("each breakdown colours its series by its order's rows and names them by its column", () => {
  assert.deepEqual([BY_MODEL.order, BY_MODEL.column, BY_MODEL.colours], ["models", "model", modelColours]);
  assert.deepEqual([BY_ENDPOINT.order, BY_ENDPOINT.column, BY_ENDPOINT.colours],
    ["endpoints", "endpoint_group", endpointColours]);
  assert.deepEqual([BY_FAMILY.order, BY_FAMILY.column, BY_FAMILY.colours],
    ["families", "family", familyColours]);
  assert.equal(BY_MODEL.labels, undefined, "a model is written by its name");
  assert.equal(BY_FAMILY.labels, undefined, "a family is written by its name");
  assert.equal(BY_ENDPOINT.labels, ENDPOINT_LABELS);
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
