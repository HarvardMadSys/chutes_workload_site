import assert from "node:assert/strict";
import { test } from "node:test";

import { trafficSummary } from "../site/js/traffic/traffic_filter.js";
import { NO_PERCENTILES, renderTiles, tileTexts } from "../site/js/traffic/traffic_tiles.js";
import { FakeElement } from "./fake_page.js";

/** Make a stand-in the global document for the test of `context`; node has none of its own. */
function useFakeDocument(context) {
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  context.after(() => delete globalThis.document);
}

// The whole trace's numbers, as the tiles take them.
const SUMMARY = Object.freeze({
  requests: 6_122_413_756, inputAverage: 5846.6, outputAverage: 412.2, ttftAverage: 2.31, ttftShare: 0.49,
});

// Percentiles as `choicePercentiles` gives them: a bin's middle each, the TTFT's p90 of no request.
const PERCENTILES = Object.freeze({
  input: { p50: 1116.7, p90: 4210 },
  output: { p50: 98.7, p90: 1490 },
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

test("each tile shows its value, its label and its notes, each on a line, if any", (context) => {
  useFakeDocument(context);
  const list = new FakeElement("ul");
  const summary = { requests: 1000, inputAverage: 8, outputAverage: 3, ttftAverage: 0.2, ttftShare: 0.49 };
  renderTiles(list, summary, PERCENTILES);
  const texts = list.children.map((tile) => tile.children.map((part) => part.textContent));
  assert.deepEqual(texts, [
    ["1.0k", "Requests"],
    ["8", "Avg input tokens", "≈1,100 p50 · ≈4,200 p90"],
    ["3", "Avg output tokens", "≈99 p50 · ≈1,500 p90"],
    ["0.2 s", "Avg TTFT", "49% record it", "≈0.84 s p50 · — p90"],
  ]);
  assert.deepEqual(list.children[3].children.map((part) => part.className), ["", "", "tile-note", "tile-note"]);
});
