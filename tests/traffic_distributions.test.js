import assert from "node:assert/strict";
import { test } from "node:test";

import {
  binMiddle, binTotals, binUpperEdge, cdfRows, choicePercentiles, histogramRowsInChoice, metricBins,
  percentile, percentileText, requestTotal, weeksInRange,
} from "../site/js/traffic/traffic_distributions.js";
import { formatSignificantSeconds } from "../site/js/shared/format.js";

// A histogram row of the week from `first_day` to `last_day`, of the family Kin's chat requests' input tokens.
function weekRow(fields) {
  return {
    week: 0, first_day: "2025-04-11", last_day: "2025-04-17", family: "Kin", endpoint_group: "chat",
    metric: "input_tokens", bins: [40], requests: [1], ...fields,
  };
}

// Three trace weeks, from April 11, April 18 and April 25, 2025, the last ending on the trace's last day, April 26.
const THREE_WEEKS = [
  weekRow({ week: 0, first_day: "2025-04-11", last_day: "2025-04-17" }),
  weekRow({ week: 1, first_day: "2025-04-18", last_day: "2025-04-24" }),
  weekRow({ week: 2, first_day: "2025-04-25", last_day: "2025-04-26" }),
];

function firstDays(rows) {
  return rows.map((row) => row.first_day);
}

test("a week is kept when it holds a chosen day, at either end of the range", () => {
  assert.deepEqual(firstDays(weeksInRange(THREE_WEEKS, "", "")), ["2025-04-11", "2025-04-18", "2025-04-25"]);
  assert.deepEqual(firstDays(weeksInRange(THREE_WEEKS, "2025-04-17", "2025-04-18")), ["2025-04-11", "2025-04-18"]);
  assert.deepEqual(firstDays(weeksInRange(THREE_WEEKS, "2025-04-18", "2025-04-24")), ["2025-04-18"]);
  assert.deepEqual(firstDays(weeksInRange(THREE_WEEKS, "2025-04-24", "")), ["2025-04-18", "2025-04-25"]);
  assert.deepEqual(firstDays(weeksInRange(THREE_WEEKS, "", "2025-04-17")), ["2025-04-11"]);
  assert.deepEqual(firstDays(weeksInRange(THREE_WEEKS, "2025-04-26", "")), ["2025-04-25"]);
  assert.deepEqual(firstDays(weeksInRange(THREE_WEEKS, "2025-04-27", "")), [], "the last week ends on its last day");
});

test("the histogram rows of a choice are those of its model and endpoint group in the weeks of its range", () => {
  const rows = [
    weekRow({ chute_id: "id-a", model: "A" }),
    weekRow({ chute_id: null, model: "Other Kin" }),
    weekRow({ chute_id: "id-a", model: "A", endpoint_group: "completion" }),
    weekRow({ chute_id: "id-a", model: "A", first_day: "2025-04-18", last_day: "2025-04-24" }),
  ];
  const choice = { family: "kin", model: "id-a", endpoint: "chat", metric: "", from: "", to: "2025-04-17" };
  assert.deepEqual(histogramRowsInChoice(rows, choice), [rows[0]]);
  assert.deepEqual(histogramRowsInChoice(rows, { ...choice, model: "other" }), [rows[1]]);
});

test("the bin maps sum each series' requests by bin over the weeks, a series the colours do not name as Other", () => {
  const rows = [
    weekRow({ bins: [40, 41], requests: [3, 1] }),
    weekRow({ first_day: "2025-04-18", last_day: "2025-04-24", bins: [39, 40], requests: [2, 5] }),
    weekRow({ family: "Pi", bins: [41], requests: [7] }),
    weekRow({ family: "Rho", bins: [41], requests: [1] }),
    weekRow({ metric: "ttft", bins: [0], requests: [9] }),
  ];
  const colours = new Map([["Kin", "var(--series-1)"], ["Other", "var(--series-other)"]]);
  const totals = binTotals(rows, "family", "input_tokens", colours);
  assert.deepEqual([...totals.keys()], ["Kin", "Other"]);
  assert.deepEqual([...totals.get("Kin")], [[40, 8], [41, 1], [39, 2]]);
  assert.deepEqual([...totals.get("Other")], [[41, 8]]);
  assert.deepEqual([...metricBins(rows, "ttft")], [[0, 9]]);
  assert.equal(requestTotal(totals.get("Kin")), 11);
});

test("a bin's upper edge and its geometric middle are a quarter and an eighth of a doubling above its start", () => {
  assert.equal(binUpperEdge(39), 1024);
  assert.equal(binUpperEdge(-1), 1);
  assert.equal(binMiddle(40), 1024 * 2 ** 0.125);
  assert.equal(binMiddle(-4), 2 ** (-3.5 / 4));
});

test("the CDF rows are each series' bins in order, at their upper edges, the last share 1", () => {
  const totals = new Map([
    ["Kin", new Map([[41, 1], [39, 1], [40, 2]])],
    ["Pi", new Map([[0, 5]])],
    ["Rho", new Map()],
  ]);
  assert.deepEqual(cdfRows(totals), [
    { series: "Kin", x: 1024, cdf: 0.25 },
    { series: "Kin", x: binUpperEdge(40), cdf: 0.75 },
    { series: "Kin", x: binUpperEdge(41), cdf: 1 },
    { series: "Pi", x: binUpperEdge(0), cdf: 1 },
  ]);
});

test("the percentile of a one-bin distribution is that bin's middle", () => {
  const bins = new Map([[40, 12]]);
  assert.equal(percentile(bins, 0.5), binMiddle(40));
  assert.equal(percentile(bins, 0.9), binMiddle(40));
  assert.equal(percentile(new Map(), 0.5), null);
});

test("over two bins, the percentile is the second's middle when the first holds under its share", () => {
  const bins = new Map([[41, 6], [40, 4]]);
  assert.equal(percentile(bins, 0.5), binMiddle(41));
  assert.equal(percentile(bins, 0.4), binMiddle(40), "the first bin reaches 40% exactly");
  assert.equal(percentile(bins, 0.9), binMiddle(41));
});

test("the tiles' percentiles are read by metric over every series, null where no request records the value", () => {
  const rows = [
    weekRow({ bins: [40], requests: [6] }),
    weekRow({ family: "Pi", bins: [50], requests: [4] }),
    weekRow({ metric: "ttft", bins: [-2], requests: [1] }),
  ];
  assert.deepEqual(choicePercentiles(rows), {
    input_tokens: { p50: binMiddle(40), p90: binMiddle(50) },
    output_tokens: { p50: null, p90: null },
    ttft: { p50: binMiddle(-2), p90: binMiddle(-2) },
  });
});

test("a percentile is written near, to two significant figures, and a missing one as a dash", () => {
  assert.equal(percentileText(binMiddle(40)), "≈1,100");
  assert.equal(percentileText(0.8374, formatSignificantSeconds), "≈0.84 s");
  assert.equal(percentileText(null), "—");
});
