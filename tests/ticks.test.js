import assert from "node:assert/strict";
import { test } from "node:test";

import { axisWithTicks } from "../site/js/axes/ticks.js";

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
