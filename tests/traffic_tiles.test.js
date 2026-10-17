import assert from "node:assert/strict";
import { test } from "node:test";

import { trafficSummary } from "../site/js/traffic/traffic_filter.js";
import { renderTiles, tileTexts } from "../site/js/traffic/traffic_tiles.js";
import { FakeElement } from "./fake_page.js";

/** Make a stand-in the global document for the test of `context`; node has none of its own. */
function useFakeDocument(context) {
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  context.after(() => delete globalThis.document);
}

test("the tiles write the requests as the stats strip does and each average over the requests that record it", () => {
  const summary = {
    requests: 6_122_413_756, inputAverage: 5846.6, outputAverage: 412.2, ttftAverage: 2.31, ttftShare: 0.49,
  };
  assert.deepEqual(tileTexts(summary), [
    { label: "Requests", value: "6.12B", note: "" },
    { label: "Avg input tokens", value: "5,847", note: "" },
    { label: "Avg output tokens", value: "412", note: "" },
    { label: "Avg TTFT", value: "2.3 s", note: "49% record it" },
  ]);
});

test("the tiles of a choice with no requests write no average and no share", () => {
  const texts = tileTexts(trafficSummary([]));
  assert.deepEqual(texts.map((tile) => tile.value), ["0", "—", "—", "—"]);
  assert.equal(texts[3].note, "— record it");
});

test("each tile shows its value, its label and its note, if any", (context) => {
  useFakeDocument(context);
  const list = new FakeElement("ul");
  renderTiles(list, { requests: 1000, inputAverage: 8, outputAverage: 3, ttftAverage: 0.2, ttftShare: 0.49 });
  const texts = list.children.map((tile) => tile.children.map((part) => part.textContent));
  assert.deepEqual(texts, [
    ["1.0k", "Requests"],
    ["8", "Avg input tokens"],
    ["3", "Avg output tokens"],
    ["0.2 s", "Avg TTFT", "49% record it"],
  ]);
});
