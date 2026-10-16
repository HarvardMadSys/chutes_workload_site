import assert from "node:assert/strict";
import { test } from "node:test";

import { dayMonth, monthTicks, renderTiles, tileTexts } from "../site/js/explore/traffic.js";
import { trafficSummary } from "../site/js/explore/traffic_filter.js";
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

// Plot widths, in pixels: a desktop card's, and a phone's at 360 px.
const WIDE_PLOT = 1200;
const PHONE_PLOT = 286;

test("the bars' axis writes the month at each first of a month, and at a quarter's first day", () => {
  const days = ["2025-04-29", "2025-04-30", "2025-05-01", "2025-05-02", "2025-06-01"];
  assert.deepEqual(monthTicks(days, "", WIDE_PLOT), ["2025-05-01", "2025-06-01"]);
  assert.deepEqual(monthTicks(days, "2025-q2", WIDE_PLOT).map(dayMonth), ["2025-04", "2025-05", "2025-06"]);
  const quarter = ["2025-07-01", "2025-07-02", "2025-08-01"];
  assert.deepEqual(monthTicks(quarter, "2025-q3", WIDE_PLOT), ["2025-07-01", "2025-08-01"]);
});

// The first day of each month of the whole trace's days, from 2025-04-11 to 2026-04-12.
const TRACE_MONTH_STARTS = [
  "2025-05-01", "2025-06-01", "2025-07-01", "2025-08-01", "2025-09-01", "2025-10-01", "2025-11-01", "2025-12-01",
  "2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01",
];

test("the whole trace's bars write every month on a wide plot and every other month on a phone's", () => {
  const days = ["2025-04-11", ...TRACE_MONTH_STARTS, "2026-04-12"];
  assert.deepEqual(monthTicks(days, "", WIDE_PLOT), TRACE_MONTH_STARTS);
  assert.deepEqual(monthTicks(days, "", PHONE_PLOT).map(dayMonth), [
    "2025-05", "2025-07", "2025-09", "2025-11", "2026-01", "2026-03",
  ]);
});

test("a quarter's bars write every month on a phone's plot too", () => {
  const days = ["2025-04-11", "2025-05-01", "2025-06-01", "2025-06-30"];
  assert.deepEqual(monthTicks(days, "2025-q2", PHONE_PLOT), ["2025-04-11", "2025-05-01", "2025-06-01"]);
});
