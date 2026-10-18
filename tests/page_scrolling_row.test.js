// The scrolling row (`page/scrolling_row.js`): its mark while content lies beyond its right edge, and an item brought
// into view.
import assert from "node:assert/strict";
import { test } from "node:test";

import { bringIntoRow, markMoreBeyondEdge } from "../site/js/page/scrolling_row.js";
import { FakeElement } from "./fake_page.js";

// A row that scrolls sideways: `scrollWidth` of content in a box `clientWidth` wide, scrolled `scrollLeft`.
function scrollingRow(scrollLeft, clientWidth, scrollWidth) {
  return Object.assign(new FakeElement("div"), { scrollLeft, clientWidth, scrollWidth });
}

test("a row is marked while content lies beyond its right edge, and not once scrolled to the end or fitting", () => {
  const start = scrollingRow(0, 160, 334);
  markMoreBeyondEdge(start);
  assert.ok(start.classes.has("has-more-beyond-edge"));
  const end = scrollingRow(174, 160, 334);
  markMoreBeyondEdge(end);
  assert.ok(!end.classes.has("has-more-beyond-edge"));
  const fitting = scrollingRow(0, 400, 334);
  markMoreBeyondEdge(fitting);
  assert.ok(!fitting.classes.has("has-more-beyond-edge"));
});

// An element whose box spans `left` to `right` on the screen, scrolled `scrollLeft`: the fake page lays nothing out, so
// the test gives the element its box.
function elementSpanning(left, right, scrollLeft = 0) {
  const element = new FakeElement("div");
  element.getBoundingClientRect = () => ({ left, right });
  element.scrollLeft = scrollLeft;
  return element;
}

test("a row scrolls an item beyond its right edge into view, with room before it, and leaves one in view alone", () => {
  const row = elementSpanning(0, 160, 0);
  bringIntoRow(row, elementSpanning(200, 260));
  assert.equal(row.scrollLeft, 184);
  const scrolled = elementSpanning(0, 160, 184);
  bringIntoRow(scrolled, elementSpanning(-100, -40));
  assert.equal(scrolled.scrollLeft, 68);
  const still = elementSpanning(0, 160, 30);
  bringIntoRow(still, elementSpanning(20, 120));
  assert.equal(still.scrollLeft, 30);
});
