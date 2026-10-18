import assert from "node:assert/strict";
import { test } from "node:test";

import { barTipText, referenceMarks } from "../site/js/charts/bars.js";
import { REFERENCE_STYLE } from "../site/js/plot/frame.js";

// A bar of a two-panel answer.
const BAR = { series: "Request share", x: 1, value: 0.3, panel: "request_share" };

test("a bar's tooltip gives its x as the axis writes it and its value", () => {
  const parameters = {
    x: { tickFormat: (rank) => `User ${rank}` },
    valueLabel: "Share of requests",
    valueFormat: (share) => `${(share * 100).toFixed(1)}%`,
  };
  assert.equal(barTipText(BAR, parameters), "User 1\nShare of requests: 30.0%");
  const titled = { ...parameters, x: { label: "Instance index", tickFormat: String } };
  assert.equal(barTipText(BAR, titled), "Instance index: 1\nShare of requests: 30.0%");
});

test("a reference is a dashed rule at its value with its label at the rule's right end; none without one", () => {
  const fakePlot = {
    ruleY: (...args) => ["ruleY", ...args], text: (...args) => ["text", ...args], identity: "identity",
  };
  const [rule, label] = referenceMarks(fakePlot, { value: 100 / 12, label: "even split" });
  assert.deepEqual(rule, ["ruleY", [100 / 12], REFERENCE_STYLE]);
  const [, texts, options] = label;
  assert.deepEqual(texts, ["even split"]);
  assert.equal(options.y, 100 / 12);
  assert.equal(options.frameAnchor, "right");
  assert.equal(options.textAnchor, "end");
  assert.deepEqual(referenceMarks(fakePlot, undefined), []);
});
