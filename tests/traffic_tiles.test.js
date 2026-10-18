import assert from "node:assert/strict";
import { test } from "node:test";

import { trafficSummary } from "../site/js/traffic/traffic_filter.js";
import { NO_PERCENTILES, renderTiles, tileTexts } from "../site/js/traffic/traffic_tiles.js";
import { FakeElement, useFakePage } from "./fake_page.js";

// The whole trace's numbers, as the tiles take them.
const SUMMARY = Object.freeze({
  requests: 6_122_413_756, inputAverage: 5846.6, outputAverage: 412.2, ttftAverage: 2.31, ttftShare: 0.49,
});

// Percentiles as `choicePercentiles` gives them, by metric: a bin's middle each, the TTFT's p90 of no request.
const PERCENTILES = Object.freeze({
  input_tokens: { p50: 1116.7, p90: 4210 },
  output_tokens: { p50: 98.7, p90: 1490 },
  ttft: { p50: 0.8374, p90: null },
});

test("the tiles write the requests as the stats strip does and each average over the requests that record it", () => {
  assert.deepEqual(tileTexts(SUMMARY, NO_PERCENTILES), [
    { label: "Requests", value: "6.12B", notes: [] },
    { label: "Avg input tokens", value: "5,847", notes: [] },
    { label: "Avg output tokens", value: "412", notes: [] },
    { label: "Avg TTFT", value: "2.3 s", notes: ["49% record it"] },
  ]);
});

test("under each average its percentiles to two significant figures, the TTFT's after its share", () => {
  const notes = tileTexts(SUMMARY, PERCENTILES).map((tile) => tile.notes);
  assert.deepEqual(notes, [
    [],
    ["≈1,100 p50 · ≈4,200 p90"],
    ["≈99 p50 · ≈1,500 p90"],
    ["49% record it", "≈0.84 s p50 · — p90"],
  ]);
});

test("while the percentiles have not arrived, each average's note is the loading text", () => {
  const notes = tileTexts(SUMMARY, null).map((tile) => tile.notes);
  assert.deepEqual(notes, [[], ["…"], ["…"], ["49% record it", "…"]]);
});

test("the tiles of a choice with no requests write no average and no share", () => {
  const texts = tileTexts(trafficSummary([]), NO_PERCENTILES);
  assert.deepEqual(texts.map((tile) => tile.value), ["0", "—", "—", "—"]);
  assert.deepEqual(texts[3].notes, ["— record it"]);
});

// A choice's numbers, small enough to read.
const SMALL_SUMMARY = Object.freeze({
  requests: 1000, inputAverage: 8, outputAverage: 3, ttftAverage: 0.2, ttftShare: 0.49,
});

// The parts of each tile of `list`, in order, each `[tag, class, text]`: its value, its label and its notes.
function tileParts(list) {
  const tiles = [];
  for (const tile of list.querySelectorAll("li")) {
    tiles.push(tile.children.map((part) => [part.tag, part.className, part.textContent]));
  }
  return tiles;
}

test("each tile shows its value, its label and its notes, each on a line, and nothing else", (context) => {
  useFakePage(context);
  const list = new FakeElement("ul");
  renderTiles(list, SMALL_SUMMARY, PERCENTILES);
  assert.deepEqual(list.querySelectorAll("strong").map((value) => value.textContent), ["1.0k", "8", "3", "0.2 s"]);
  assert.equal(list.querySelector(".figure-body"), null, "no chart's place");
  assert.deepEqual(tileParts(list), [
    [["strong", "", "1.0k"], ["span", "", "Requests"]],
    [["strong", "", "8"], ["span", "", "Avg input tokens"], ["span", "tile-note", "≈1,100 p50 · ≈4,200 p90"]],
    [["strong", "", "3"], ["span", "", "Avg output tokens"], ["span", "tile-note", "≈99 p50 · ≈1,500 p90"]],
    [
      ["strong", "", "0.2 s"], ["span", "", "Avg TTFT"], ["span", "tile-note", "49% record it"],
      ["span", "tile-note", "≈0.84 s p50 · — p90"],
    ],
  ]);
});

test("writing the tiles again replaces them, the latest notes once", (context) => {
  useFakePage(context);
  const list = new FakeElement("ul");
  renderTiles(list, SMALL_SUMMARY, null);
  renderTiles(list, SMALL_SUMMARY, PERCENTILES);
  const tiles = list.querySelectorAll("li");
  assert.equal(tiles.length, 4);
  const [, inputTile] = tiles;
  const inputNotes = inputTile.querySelectorAll(".tile-note");
  assert.deepEqual(inputNotes.map((note) => note.textContent), ["≈1,100 p50 · ≈4,200 p90"]);
});
