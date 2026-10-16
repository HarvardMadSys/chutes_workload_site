import assert from "node:assert/strict";
import { test } from "node:test";

import {
  afterAxisTitle, axisMark, axisScale, axisText, axisTicks, axisWithTicks, bandAxisMark, decadeTicks, extent, gridMark,
  logAxisTicks, MAX_LOG_TICKS, TICK_COUNT,
} from "../site/js/axes/ticks.js";

test("an axis given its ticks writes each as its text, so a log axis blanks none; without ticks Plot chooses them", () => {
  const makeAxis = (...args) => args;
  const format = (seconds) => `${seconds} s`;
  const [ticks, options] = axisWithTicks(makeAxis, [1, 60], { stroke: "grey", tickFormat: format });
  assert.deepEqual(ticks, [1, 60]);
  assert.equal(options.text(60), "60 s");
  assert.equal(options.tickFormat, undefined);
  assert.deepEqual(axisWithTicks(makeAxis, undefined, { stroke: "grey", tickFormat: format }), [
    { stroke: "grey", tickFormat: format },
  ]);
  assert.deepEqual(axisWithTicks(makeAxis, [1, 10], { stroke: "grey" }), [[1, 10], { stroke: "grey" }]);
});

// A stand-in for Plot's axis and grid marks, each returning its name and the arguments it was given.
const FAKE_PLOT = {
  axisX: (...args) => ["axisX", ...args],
  axisY: (...args) => ["axisY", ...args],
  gridX: (...args) => ["gridX", ...args],
  gridY: (...args) => ["gridY", ...args],
};

test("a log axis is ticked at the powers of ten within its range, its ends included where they are powers", () => {
  assert.deepEqual(decadeTicks([1, 400000]), [1, 10, 100, 1000, 10000, 100000]);
  assert.deepEqual(decadeTicks([0.33, 95]), [1, 10]);
  assert.deepEqual(decadeTicks([2, 9]), []);
});

test("a log axis over many powers of ten labels every second or third, and leaves a narrow range to Plot", () => {
  assert.deepEqual(logAxisTicks([1, 1e5]), [1, 10, 100, 1000, 10000, 100000]);
  assert.deepEqual(logAxisTicks([1, 1e9]), [1, 100, 10000, 1e6, 1e8]);
  assert.equal(logAxisTicks([3, 40]), undefined); // one power of ten: Plot's own ticks
  assert.ok(logAxisTicks([1e-6, 1e12]).length <= MAX_LOG_TICKS);
});

test("the extent of values is their smallest and largest", () => {
  assert.deepEqual(extent([30, 2, 400, 7]), [2, 400]);
});

test("an axis's ticks are the card's where given, else a log axis's powers of ten over its domain or its values", () => {
  assert.deepEqual(axisTicks({ ticks: [0, 6, 12] }, [1, 2]), [0, 6, 12]);
  assert.deepEqual(axisTicks({ log: true, domain: [1, 400000] }, [5, 50]), [1, 10, 100, 1000, 10000, 100000]);
  assert.deepEqual(axisTicks({ log: true }, [5, 50, 2000]), [10, 100, 1000]);
  assert.equal(axisTicks({}, [5, 50]), undefined);
});

test("an axis's scale is a log one only where the card asks, with the card's domain where given", () => {
  assert.deepEqual(axisScale({ log: true, domain: [1, 400000] }), { type: "log", domain: [1, 400000] });
  assert.deepEqual(axisScale({ label: "Day" }), {});
  assert.deepEqual(axisScale({ domain: [0, 1] }), { domain: [0, 1] });
  assert.deepEqual(axisScale({}, ["2025-06", "2025-07"]), { type: "point" }); // a month is a label, not a date
  assert.deepEqual(axisScale({}, [1, 2]), {});
});

test("a value is written by its axis's tick format where given, else with separators", () => {
  assert.equal(axisText({ tickFormat: (hour) => `${hour}:00` }, 7), "7:00");
  assert.equal(axisText({}, 12345), "12,345");
});

test("an axis mark is titled by the card's label, none without it, and asks for the tick count without ticks", () => {
  const [name, options] = axisMark(FAKE_PLOT, "y", { label: "Requests" }, undefined);
  assert.equal(name, "axisY");
  assert.equal(options.label, "Requests");
  assert.equal(options.ticks, TICK_COUNT);
  const [xName, ticks, xOptions] = axisMark(FAKE_PLOT, "x", { tickFormat: (tick) => `${tick}` }, [1, 10]);
  assert.equal(xName, "axisX");
  assert.deepEqual(ticks, [1, 10]);
  assert.equal(xOptions.label, null);
  assert.equal(xOptions.text(10), "10");
});

test("grid lines fall on the given ticks, or on Plot's own at the tick count", () => {
  assert.deepEqual(gridMark(FAKE_PLOT, "x", [1, 10]).slice(0, 2), ["gridX", [1, 10]]);
  const [name, options] = gridMark(FAKE_PLOT, "y", undefined);
  assert.equal(name, "gridY");
  assert.equal(options.ticks, TICK_COUNT);
});

test("a value follows its axis's title where the axis has one", () => {
  assert.equal(afterAxisTitle({ label: "Requests" }, "1.2k"), "Requests: 1.2k");
  assert.equal(afterAxisTitle({}, "1.2k"), "1.2k");
});

test("a band axis ticks every band, or the card's ticks, written by the given format and slanted where asked", () => {
  const label = (name) => name.toUpperCase();
  const [name, options] = bandAxisMark(FAKE_PLOT, { label: "Model", tickRotate: -25 }, label);
  assert.equal(name, "axisX");
  assert.deepEqual([options.label, options.tickRotate, options.tickFormat], ["Model", -25, label]);
  assert.equal(options.ticks, undefined); // a band axis labels each band, not a tick count
  const [, ticks, tickOptions] = bandAxisMark(FAKE_PLOT, { ticks: [1, 5], tickFormat: (rank) => `#${rank}` });
  assert.deepEqual(ticks, [1, 5]);
  assert.equal(tickOptions.text(5), "#5");
  assert.equal(tickOptions.label, null);
  assert.equal(tickOptions.tickRotate, 0);
});

test("a log axis that starts at or below zero fails, naming the axis and its domain, rather than never ending", () => {
  assert.throws(() => axisTicks({ log: true, label: "Output tokens", domain: [0, 1000] }, []),
    { name: "RangeError", message: /"Output tokens" has the domain \[0, 1000\]/ });
  assert.throws(() => decadeTicks([0, 1000]), RangeError);
  assert.throws(() => logAxisTicks([-1, 10]), RangeError);
  assert.deepEqual(axisTicks({ log: true }, []), undefined); // no rows drawn: no range, Plot's own ticks
});
