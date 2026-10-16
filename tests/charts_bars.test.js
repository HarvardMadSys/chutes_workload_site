import assert from "node:assert/strict";
import { test } from "node:test";

import { barTipText, drawnBars } from "../site/js/charts/bars.js";
import { assignColours } from "../site/js/theme/colours.js";

const COLOURS = assignColours(["Request share", "Token hit"]);
// A two-panel answer, one series per panel.
const ROWS = [
  { series: "Request share", x: 1, value: 0.3, panel: "request_share" },
  { series: "Request share", x: 2, value: 0.15, panel: "request_share" },
  { series: "Token hit", x: 1, value: 0.62, panel: "token_hit" },
  { series: "Unlisted", x: 1, value: 0.1, panel: "token_hit" },
];

test("a panel's bars are drawn alone, in their order, a series without a colour left out", () => {
  assert.deepEqual(drawnBars(ROWS, COLOURS, { panel: "request_share" }, new Set()), [ROWS[0], ROWS[1]]);
  assert.deepEqual(drawnBars(ROWS, COLOURS, { panel: "token_hit" }, new Set()), [ROWS[2]]);
});

test("without a panel every coloured bar is drawn, a hidden series left out", () => {
  assert.deepEqual(drawnBars(ROWS, COLOURS, {}, new Set(["Request share"])), [ROWS[2]]);
  assert.equal(drawnBars(ROWS, COLOURS, {}, new Set()).length, 3);
});

test("a bar's tooltip gives its x as the axis writes it and its value", () => {
  const parameters = {
    x: { tickFormat: (rank) => `User ${rank}` },
    valueLabel: "Share of requests",
    valueFormat: (share) => `${(share * 100).toFixed(1)}%`,
  };
  assert.equal(barTipText(ROWS[0], parameters), "User 1\nShare of requests: 30.0%");
  const titled = { ...parameters, x: { label: "Instance index", tickFormat: String } };
  assert.equal(barTipText(ROWS[0], titled), "Instance index: 1\nShare of requests: 30.0%");
});
