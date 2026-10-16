import assert from "node:assert/strict";
import { test } from "node:test";

import { bringIntoRow, markMoreBeyondEdge } from "../site/js/shared/scrolling_row.js";

// A stand-in row that scrolls sideways: `scrollWidth` of content in a box `clientWidth` wide, scrolled `scrollLeft`.
function fakeRow(scrollLeft, clientWidth, scrollWidth) {
  const classes = new Set();
  const classList = { toggle: (name, isOn) => (isOn ? classes.add(name) : classes.delete(name)) };
  return { scrollLeft, clientWidth, scrollWidth, classList, classes };
}

test("a row is marked while content lies beyond its right edge, and not once scrolled to the end or fitting", () => {
  const start = fakeRow(0, 160, 334);
  markMoreBeyondEdge(start);
  assert.ok(start.classes.has("has-more-beyond-edge"));
  const end = fakeRow(174, 160, 334);
  markMoreBeyondEdge(end);
  assert.ok(!end.classes.has("has-more-beyond-edge"));
  const fitting = fakeRow(0, 400, 334);
  markMoreBeyondEdge(fitting);
  assert.ok(!fitting.classes.has("has-more-beyond-edge"));
});

// A stand-in element whose box spans `left` to `right` on the screen.
function fakeBox(left, right) {
  return { getBoundingClientRect: () => ({ left, right }) };
}

test("a row scrolls an item beyond its right edge into view, with room before it, and leaves one in view alone", () => {
  const row = { ...fakeBox(0, 160), scrollLeft: 0 };
  bringIntoRow(row, fakeBox(200, 260));
  assert.equal(row.scrollLeft, 184);
  const scrolled = { ...fakeBox(0, 160), scrollLeft: 184 };
  bringIntoRow(scrolled, fakeBox(-100, -40));
  assert.equal(scrolled.scrollLeft, 68);
  const still = { ...fakeBox(0, 160), scrollLeft: 30 };
  bringIntoRow(still, fakeBox(20, 120));
  assert.equal(still.scrollLeft, 30);
});
