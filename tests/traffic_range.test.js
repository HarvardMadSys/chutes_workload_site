import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  clippedFrom, clippedRange, clippedTo, mountRange, PERIODS, periodRange, pressedPeriod, pushedIndices,
  rangeOfIndices, sliderIndices,
} from "../site/js/traffic/traffic_range.js";
import { FakeElement } from "./fake_page.js";

// The shipped daily answer by family, and the trace's days, its days in order.
const FAMILY_ANSWER = new URL("../site/data/all/explore/daily_by_family.json", import.meta.url);
const TRACE_DAYS = [...new Set(JSON.parse(readFileSync(FAMILY_ANSWER, "utf8")).map((row) => row.day))];

// Five days with gaps, as a trace with a day of no rows would have them.
const GAPPED_DAYS = ["2025-07-01", "2025-07-03", "2025-07-05", "2025-07-07", "2025-07-09"];

// The period labelled `label`.
function periodNamed(label) {
  return PERIODS.find((period) => period.label === label);
}

test("the periods are All and the four calendar quarters the trace spans, by their labels", () => {
  assert.deepEqual(PERIODS.map((period) => period.label), ["All", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26"]);
});

test("a period's range is its quarter's days within the trace's; Q2 '25 starts with the trace, All is all", () => {
  assert.deepEqual(periodRange(periodNamed("All"), TRACE_DAYS), { from: "", to: "" });
  assert.deepEqual(periodRange(periodNamed("Q2 '25"), TRACE_DAYS), { from: "", to: "2025-06-30" });
  assert.deepEqual(periodRange(periodNamed("Q3 '25"), TRACE_DAYS), { from: "2025-07-01", to: "2025-09-30" });
  assert.deepEqual(periodRange(periodNamed("Q1 '26"), TRACE_DAYS), { from: "2026-01-01", to: "2026-03-31" });
});

test("the period pressed is the one whose range is the choice's, none for another range", () => {
  assert.equal(pressedPeriod({ from: "", to: "" }, TRACE_DAYS).label, "All");
  assert.equal(pressedPeriod({ from: "", to: "2025-06-30" }, TRACE_DAYS).label, "Q2 '25");
  assert.equal(pressedPeriod({ from: "2026-01-01", to: "2026-03-31" }, TRACE_DAYS).label, "Q1 '26");
  assert.equal(pressedPeriod({ from: "2025-11-03", to: "2025-11-30" }, TRACE_DAYS), null);
  assert.equal(pressedPeriod({ from: "2025-04-12", to: "2025-06-30" }, TRACE_DAYS), null);
});

test("an empty day, a day at the trace's end on its side or beyond it, is that end, written \"\"", () => {
  for (const day of ["", "2025-06-30", "2025-07-01"]) {
    assert.equal(clippedFrom(day, GAPPED_DAYS), "", day);
  }
  for (const day of ["", "2025-07-10", "2025-07-09"]) {
    assert.equal(clippedTo(day, GAPPED_DAYS), "", day);
  }
});

test("a day beyond the trace's other end is clamped to that end; one between two trace days the nearer inside", () => {
  assert.equal(clippedFrom("2025-07-10", GAPPED_DAYS), "2025-07-09");
  assert.equal(clippedTo("2025-06-30", GAPPED_DAYS), "2025-07-01");
  assert.equal(clippedFrom("2025-07-04", GAPPED_DAYS), "2025-07-05");
  assert.equal(clippedTo("2025-07-04", GAPPED_DAYS), "2025-07-03");
  assert.equal(clippedFrom("2025-07-03", GAPPED_DAYS), "2025-07-03");
});

test("a day that is not YYYY-MM-DD is placed among the days by its order as text", () => {
  assert.equal(clippedFrom("2025-07-04 noon", GAPPED_DAYS), "2025-07-05");
  assert.equal(clippedTo("2025-07-04 noon", GAPPED_DAYS), "2025-07-03");
  assert.equal(clippedFrom("next week", GAPPED_DAYS), "2025-07-09");
  assert.equal(clippedTo("2025-07", GAPPED_DAYS), "2025-07-01");
});

test("a range whose from is after its to once clipped is the whole trace", () => {
  assert.deepEqual(clippedRange("2025-07-07", "2025-07-03", GAPPED_DAYS), { from: "", to: "" });
  assert.deepEqual(clippedRange("2025-07-04", "2025-07-04", GAPPED_DAYS), { from: "", to: "" });
  assert.deepEqual(clippedRange("2025-07-03", "2025-07-03", GAPPED_DAYS), { from: "2025-07-03", to: "2025-07-03" });
  assert.deepEqual(clippedRange("2024-01-01", "2025-07-05", GAPPED_DAYS), { from: "", to: "2025-07-05" });
  assert.deepEqual(clippedRange("2027-01-01", "", GAPPED_DAYS), { from: "2025-07-09", to: "" });
  assert.deepEqual(clippedRange("2027-01-01", "2024-01-01", GAPPED_DAYS), { from: "", to: "" });
});

test("the sliders stand on the indices of the range's days, the trace's ends for an empty day", () => {
  assert.deepEqual(sliderIndices(GAPPED_DAYS, { from: "", to: "" }), { fromIndex: 0, toIndex: 4 });
  assert.deepEqual(sliderIndices(GAPPED_DAYS, { from: "2025-07-03", to: "2025-07-07" }), { fromIndex: 1, toIndex: 3 });
  assert.deepEqual(rangeOfIndices(GAPPED_DAYS, 0, 4), { from: "", to: "" });
  assert.deepEqual(rangeOfIndices(GAPPED_DAYS, 1, 3), { from: "2025-07-03", to: "2025-07-07" });
  assert.deepEqual(rangeOfIndices(GAPPED_DAYS, 2, 2), { from: "2025-07-05", to: "2025-07-05" });
});

test("a slider moved past the other pushes it along to its own index", () => {
  assert.deepEqual(pushedIndices(1, 3, "from"), { fromIndex: 1, toIndex: 3 });
  assert.deepEqual(pushedIndices(3, 3, "to"), { fromIndex: 3, toIndex: 3 });
  assert.deepEqual(pushedIndices(4, 2, "from"), { fromIndex: 4, toIndex: 4 });
  assert.deepEqual(pushedIndices(4, 2, "to"), { fromIndex: 2, toIndex: 2 });
});

/**
 * Mount the sliders over `GAPPED_DAYS` standing on `choice` in a fake page for the test of `context`:
 * `{ container, from, to, handle, inputs, changes, frames }`, the sliders' row, each slider's `{ label, input, day }`,
 * the handle `mountRange` returns, the ranges handed to `onInput` and to `onChange`, and the animation frames asked for
 * and not yet run.
 */
function mountSliders(context, choice) {
  const frames = [];
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  globalThis.requestAnimationFrame = (callback) => frames.push(callback);
  context.after(() => {
    delete globalThis.document;
    delete globalThis.requestAnimationFrame;
  });
  const page = { container: new FakeElement("div"), inputs: [], changes: [], frames };
  page.handle = mountRange(page.container, GAPPED_DAYS, choice, {
    onInput: (range) => page.inputs.push(range),
    onChange: (range) => page.changes.push(range),
  });
  const [from, to] = page.container.children.map(sliderParts);
  return { ...page, from, to };
}

// A slider's field as `{ label, input, day }`: its name, the slider and its day's text.
function sliderParts(field) {
  const [label, input, day] = field.children;
  return { label, input, day };
}

// Run the animation frames asked for, as the browser does before it paints.
function runFrames(frames) {
  for (const frame of frames.splice(0)) {
    frame();
  }
}

test("the two sliders run over the days' indices, each named and writing its day for all to read", (context) => {
  const page = mountSliders(context, { from: "2025-07-03", to: "" });
  const expected = [[page.from, "From", "1", "2025-07-03"], [page.to, "To", "4", "2025-07-09"]];
  for (const [slider, name, value, day] of expected) {
    assert.equal(slider.label.textContent, name);
    assert.equal(slider.label.htmlFor, slider.input.id);
    assert.equal(slider.input.type, "range");
    assert.deepEqual(["min", "max", "step"].map((name) => slider.input.getAttribute(name)), ["0", "4", "1"]);
    assert.equal(slider.input.value, value);
    assert.equal(slider.input.getAttribute("aria-valuetext"), day);
    assert.equal(slider.day.textContent, day);
  }
});

test("a slider moved past the other pushes it, and the moves of a frame hand on its last range once", (context) => {
  const page = mountSliders(context, { from: "", to: "2025-07-05" });
  page.from.input.value = "3";
  page.from.input.dispatch("input");
  assert.deepEqual([page.to.input.value, page.to.day.textContent], ["3", "2025-07-07"]);
  page.from.input.value = "4";
  page.from.input.dispatch("input");
  assert.equal(page.frames.length, 1, "one frame is asked for however often the slider moves before it");
  assert.deepEqual(page.inputs, []);
  runFrames(page.frames);
  assert.deepEqual(page.inputs, [{ from: "2025-07-09", to: "" }]);
  page.to.input.value = "0";
  page.to.input.dispatch("input");
  runFrames(page.frames);
  assert.deepEqual(page.inputs.at(-1), { from: "", to: "2025-07-01" });
  assert.equal(page.from.day.textContent, "2025-07-01");
  assert.deepEqual(page.changes, []);
});

test("a slider released hands on its range; one shown from elsewhere moves them and hands on nothing", (context) => {
  const page = mountSliders(context, { from: "", to: "" });
  page.to.input.value = "2";
  page.to.input.dispatch("change");
  assert.deepEqual(page.changes, [{ from: "", to: "2025-07-05" }]);
  page.handle.show({ from: "2025-07-03", to: "2025-07-07" });
  assert.deepEqual([page.from.input.value, page.to.input.value], ["1", "3"]);
  assert.equal(page.from.day.textContent, "2025-07-03");
  assert.equal(page.to.input.getAttribute("aria-valuetext"), "2025-07-07");
  assert.equal(page.changes.length, 1);
  assert.deepEqual([page.inputs, page.frames], [[], []]);
});
