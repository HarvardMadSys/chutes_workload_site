import assert from "node:assert/strict";
import { test } from "node:test";

import { boxTipText, drawnBoxes } from "../site/js/charts/boxes.js";
import { assignColours } from "../site/js/theme/colours.js";

const SERIES_COLOURS = assignColours(["DeepSeek V3.2", "DeepSeek R1", "MiniMax M2.5"]);
// One row per series, not in the colours' order; R1's low whisker is at zero.
const ROWS = [
  { series: "MiniMax M2.5", low: 3, q1: 20, median: 70, q3: 300, high: 2000, count: 980 },
  { series: "DeepSeek R1", low: 0, q1: 8, median: 25, q3: 90, high: 400, count: 2210 },
  { series: "DeepSeek V3.2", low: 2, q1: 12, median: 40, q3: 180, high: 900, count: 5120 },
  { series: "Unlisted", low: 1, q1: 2, median: 3, q3: 4, high: 5, count: 6 },
];

test("one box per coloured series, in the colours' order, a hidden series left out", () => {
  const boxes = drawnBoxes(ROWS, SERIES_COLOURS, {}, new Set(["MiniMax M2.5"]));
  assert.deepEqual(boxes.map((box) => box.series), ["DeepSeek V3.2", "DeepSeek R1"]);
  assert.equal(boxes[0].median, 40);
});

test("on a log y axis a box with a statistic at zero is not drawn", () => {
  const boxes = drawnBoxes(ROWS, SERIES_COLOURS, { y: { log: true } }, new Set());
  assert.deepEqual(boxes.map((box) => box.series), ["DeepSeek V3.2", "MiniMax M2.5"]);
});

test("a box's tooltip gives its series, what a value is, its five statistics and its count", () => {
  const parameters = { valueLabel: "Per-user IAT p50", valueFormat: (seconds) => `${seconds} s` };
  assert.equal(boxTipText(ROWS[2], parameters),
    "DeepSeek V3.2\nPer-user IAT p50\nHigh: 900 s\n75th: 180 s\nMedian: 40 s\n25th: 12 s\nLow: 2 s\nCount: 5,120");
});
