import assert from "node:assert/strict";
import { test } from "node:test";

import {
  atMost, axisWithTicks, tickCountFor, decadeDomain, decadeTicks, durationTicks, everyOther, isNarrowChart,
  logAxisTicks, MAX_TICKS, NARROW_MAX_TICKS, percentTick, sparseTickFormat,
} from "../site/js/axes/ticks.js";

test("a log axis ticks its powers of ten, every other one past six, and leaves a range of one power to Plot", () => {
  assert.deepEqual(logAxisTicks([1, 1e5]), [1, 10, 100, 1e3, 1e4, 1e5]);
  assert.deepEqual(logAxisTicks([1, 1e7]), [1, 100, 1e4, 1e6]);
  assert.equal(logAxisTicks([2, 50]), undefined);
});

test("the powers of ten of a range, and the powers of ten around a set of values", () => {
  assert.deepEqual(decadeTicks([1e4, 3e8]), [1e4, 1e5, 1e6, 1e7, 1e8]);
  assert.deepEqual(decadeTicks([1, 100]), [1, 10, 100]);
  assert.deepEqual(decadeDomain([150, 420000]), [100, 1e6]);
});

test("a duration axis ticks at the durations people count in within its range", () => {
  assert.deepEqual(durationTicks([0.1, 86400]), [0.1, 1, 60, 3600, 86400]);
  assert.deepEqual(logAxisTicks([1e4, 1e8], 4), [1e4, 1e6, 1e8]);
  assert.deepEqual(durationTicks([0.5, 300]), [1, 60]);
});

test("a crowded axis labels every step-th value from the first, at most the number asked", () => {
  const format = sparseTickFormat(["a", "b", "c", "d", "e", "f", "g"], (value) => value.toUpperCase(), 3);
  assert.deepEqual(["a", "b", "c", "d", "e", "f", "g"].map(format), ["A", "", "", "D", "", "", "G"]);
});

test("an axis with room for every value labels them all", () => {
  const format = sparseTickFormat([1, 2, 4], String, 6);
  assert.deepEqual([1, 2, 4].map(format), ["1", "2", "4"]);
});

test("a percentage axis writes its ticks as they are, with a percent sign", () => {
  assert.deepEqual([0, 50, 100].map(percentTick), ["0%", "50%", "100%"]);
});

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

test("a narrow chart's axes take at most three ticks, a wide one's six; every other tick halves a list", () => {
  assert.equal(isNarrowChart(300), true);
  assert.equal(isNarrowChart(520), false);
  assert.equal(tickCountFor(300, MAX_TICKS), NARROW_MAX_TICKS);
  assert.equal(tickCountFor(520, MAX_TICKS), MAX_TICKS);
  assert.deepEqual(everyOther([0.1, 1, 60]), [0.1, 60]);
});

test("a narrow chart's axes thin their ticks in one place: at most so many, or a smaller count", () => {
  assert.deepEqual(atMost([1, 3, 10, 30], 6), [1, 3, 10, 30]);
  assert.deepEqual(atMost([1, 3, 10, 30], 3), [1, 10]);
  assert.equal(tickCountFor(300, 5), NARROW_MAX_TICKS);
  assert.equal(tickCountFor(520, 5), 5);
});
