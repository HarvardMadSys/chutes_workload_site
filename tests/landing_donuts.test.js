import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { MIXES, mixLegend } from "../site/js/sections/mixes.js";
import { statsRows } from "../site/js/sections/stats.js";
import { donutSlices, namedSeries } from "../site/js/charts/donut.js";
import { columnTotal } from "../site/js/shared/rows.js";
import { formatCompactCount } from "../site/js/shared/format.js";
import { familyOrder } from "../site/js/traffic/traffic_filter.js";
import {
  ENDPOINT_FIRST_SLOT, FAMILY_SLOTS, familyColours, OTHER_SERIES, SERIES_SLOTS,
} from "../site/js/theme/colours.js";

// The rows of a shipped answer, as the page reads them.
function shippedAnswer(name) {
  return JSON.parse(readFileSync(new URL(`../site/data/all/${name}.json`, import.meta.url), "utf8"));
}

test("the two donuts are the family mix and the endpoint mix", () => {
  assert.deepEqual(MIXES.map((mix) => [mix.title, mix.series.order, mix.series.column]), [
    ["Model families", "families", "family"],
    ["Endpoint mix", "endpoints", "endpoint_group"],
  ]);
});

test("the family mix's legend is the families in the family colours, in the answer's order, Other last", () => {
  const rows = [
    { family: "DeepSeek", requests: 50 },
    { family: "Qwen", requests: 20 },
    { family: "Other", requests: 30 },
  ];
  const legend = mixLegend(MIXES[0], rows);
  assert.deepEqual(legend.series, [
    { name: "DeepSeek", label: "DeepSeek 50.0%" },
    { name: "Qwen", label: "Qwen 20.0%" },
    { name: "Other", label: "Other 30.0%" },
  ]);
  assert.equal(legend.colours.get("DeepSeek"), FAMILY_SLOTS[0]);
  assert.equal(legend.colours.get("Qwen"), FAMILY_SLOTS[1]);
  assert.equal(legend.colours.get("Other"), OTHER_SERIES);
});

test("the shipped family mix colours each family as the Traffic Explorer does, all ten named", () => {
  const rows = shippedAnswer("explore/family_mix");
  const explorerColours = familyColours(familyOrder(shippedAnswer("explore/daily_by_family")));
  const legend = mixLegend(MIXES[0], rows);
  assert.deepEqual([...legend.colours.entries()], [...explorerColours.entries()]);
  assert.deepEqual(legend.series.map((entry) => entry.name), rows.map((row) => row.family));
});

test("the endpoint mix's legend labels each group, opens on another colour than the families, Other last", () => {
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
  for (const [mix, name] of [[MIXES[0], "explore/family_mix"], [MIXES[1], "explore/endpoint_mix"]]) {
    const rows = shippedAnswer(name);
    const named = namedSeries(mixLegend(mix, rows).colours);
    const centre = columnTotal(donutSlices(rows, mix.series.column, "requests", named), "count");
    assert.equal(centre, columnTotal(rows, "requests"), mix.title);
    assert.equal(centre, totalsRow.requests, mix.title);
    assert.equal(formatCompactCount(centre), stripRequests, mix.title);
  }
});
