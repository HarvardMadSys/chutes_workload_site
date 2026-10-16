import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { MIXES, mixLegend } from "../site/js/landing/donuts.js";
import { statsRows } from "../site/js/landing/stats.js";
import { donutSlices } from "../site/js/charts/donut.js";
import { columnTotal } from "../site/js/shared/charts.js";
import { formatCompactCount } from "../site/js/shared/format.js";
import { ENDPOINT_FIRST_SLOT, OTHER_NAME, OTHER_SERIES, SERIES_SLOTS } from "../site/js/theme/colours.js";

// The rows of a shipped answer, as the page reads them.
function shippedAnswer(name) {
  return JSON.parse(readFileSync(new URL(`../site/data/all/${name}.json`, import.meta.url), "utf8"));
}

test("the two donuts are the model mix and the endpoint mix", () => {
  assert.deepEqual(MIXES.map((mix) => [mix.title, mix.series.order, mix.series.column]), [
    ["Model mix", "models", "model"],
    ["Endpoint mix", "endpoints", "endpoint_group"],
  ]);
});

test("the model mix's legend keeps the answer's order, Other last and grey, each with its share", () => {
  const rows = [
    { model: "deepseek-v3", requests: 50 },
    { model: "qwen3", requests: 30 },
    { model: "Other", requests: 20 },
  ];
  const legend = mixLegend(MIXES[0], rows);
  assert.deepEqual(legend.series, [
    { name: "deepseek-v3", label: "deepseek-v3 50.0%" },
    { name: "qwen3", label: "qwen3 30.0%" },
    { name: "Other", label: "Other 20.0%" },
  ]);
  assert.equal(legend.colours.get("deepseek-v3"), SERIES_SLOTS[0]);
  assert.equal(legend.colours.get("Other"), OTHER_SERIES);
});

test("the endpoint mix's legend writes each group's label, opens on another colour than the models, Other last", () => {
  const rows = [
    { endpoint_group: "chat", requests: 50 },
    { endpoint_group: "chat_stream", requests: 30 },
    { endpoint_group: "other", requests: 15 },
    { endpoint_group: "completion", requests: 5 },
  ];
  const legend = mixLegend(MIXES[1], rows);
  assert.deepEqual(legend.series.map((entry) => entry.label), ["Chat 50.0%", "Chat stream 30.0%", "Completion 5.0%",
    "Other 15.0%"]);
  assert.equal(legend.colours.get("chat"), SERIES_SLOTS[ENDPOINT_FIRST_SLOT]);
  assert.notEqual(legend.colours.get("chat"), SERIES_SLOTS[0]);
  assert.equal(legend.colours.get("Other"), OTHER_SERIES);
});

test("each shipped donut's centre, the sum of its slices, is its answer's total and the stats strip's requests", () => {
  const totalsRow = shippedAnswer("explore/trace_totals")[0];
  const stripRequests = statsRows(totalsRow).find((stat) => stat.label === "Requests").value;
  for (const [mix, name] of [[MIXES[0], "explore/model_mix"], [MIXES[1], "explore/endpoint_mix"]]) {
    const rows = shippedAnswer(name);
    // The names that keep a slice of their own, as the donut takes them from its colours: every one but Other.
    const order = [...mixLegend(mix, rows).colours.keys()].filter((slice) => slice !== OTHER_NAME);
    const centre = columnTotal(donutSlices(rows, mix.series.column, "requests", order), "count");
    assert.equal(centre, columnTotal(rows, "requests"), mix.title);
    assert.equal(centre, totalsRow.requests, mix.title);
    assert.equal(formatCompactCount(centre), stripRequests, mix.title);
  }
});
