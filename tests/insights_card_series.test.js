// A figure card's series (`insights/card_series.js`): their order, the palette they are coloured from, and the
// card's legend.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  cardColours, figureLegend, hasOneSeriesPerPanel, seriesOrder,
} from "../site/js/insights/card_series.js";
import { FIXED_SERIES_COLOURS } from "../site/js/shared/series.js";
import { endpointColours, FAMILY_SLOTS, OTHER_SERIES, SERIES_SLOTS } from "../site/js/theme/colours.js";

// A card as a topic lists it.
const CARD = Object.freeze({ figure: "fig_a", kind: "lines", chart: { valueLabel: "Requests" } });

test("the series take their order from the rows, or from a legend answer's ranks", () => {
  const rows = [{ series: "B", x: 0 }, { series: "A", x: 0 }, { series: "B", x: 1 }];
  assert.deepEqual(seriesOrder(rows, null), ["B", "A"]);
  assert.deepEqual(seriesOrder(rows, [{ series: "A", rank: 2 }, { series: "B", rank: 1 }]), ["B", "A"]);
  assert.deepEqual(seriesOrder([{ x_low: 0, value: 1 }], null), []);
});

// A CDF answer's rows: four series, in the order the answer holds them.
const CDF_ROWS = [
  { series: "DeepSeek V3.2", x: 1, cdf: 0 },
  { series: "Unlisted", x: 1, cdf: 0 },
  { series: "Global", x: 1, cdf: 0 },
  { series: "Deepseek R1", x: 1, cdf: 0 },
];

test("a card's series are drawn in the answer's order, or in its own list, which leaves the others out", () => {
  const plain = cardColours(CARD, CDF_ROWS, null);
  assert.deepEqual([...plain.keys()], ["DeepSeek V3.2", "Unlisted", "Global", "Deepseek R1"]);
  const listed = cardColours({ ...CARD, series: ["Global", "DeepSeek V3.2", "Deepseek R1"] }, CDF_ROWS, null);
  assert.deepEqual([...listed], [
    ["Global", FIXED_SERIES_COLOURS.Global],
    ["DeepSeek V3.2", FIXED_SERIES_COLOURS["DeepSeek V3.2"]],
    ["Deepseek R1", FIXED_SERIES_COLOURS["Deepseek R1"]],
  ]);
  const legendRows = [{ series: "Global", rank: 2 }, { series: "Unlisted", rank: 1 }];
  assert.deepEqual([...cardColours({ ...CARD, series: ["Global"] }, CDF_ROWS, legendRows).keys()], ["Global"]);
});

test("a card of the families' palette colours ten series before the Other grey; an unknown palette throws", () => {
  const names = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "Others"];
  const rows = names.map((name) => ({ series: name, x: 1, value: 1 }));
  const eight = [...cardColours(CARD, rows, null).values()];
  assert.deepEqual(eight, [...SERIES_SLOTS, OTHER_SERIES, OTHER_SERIES, OTHER_SERIES]);
  const ten = [...cardColours({ ...CARD, palette: "families" }, rows, null).values()];
  assert.deepEqual(ten, [...FAMILY_SLOTS, OTHER_SERIES]);
  assert.throws(() => cardColours({ ...CARD, palette: "pastel" }, rows, null), /fig_a .*"pastel"/);
});

test("a card of the policies' palette colours each series by its policy", () => {
  const rows = ["A, Sticky", "B, Sticky", "A, Load-first"].map((name) => ({ series: name, x: 1, y: 1 }));
  const colours = cardColours({ ...CARD, palette: "policies" }, rows, null);
  assert.deepEqual([...colours.values()], [SERIES_SLOTS[0], SERIES_SLOTS[0], SERIES_SLOTS[1]]);
});

test("a card of the endpoints' palette colours its series as the Overview colours their endpoint groups", () => {
  const endpointMixRows = [{ endpoint_group: "chat", requests: 2 }, { endpoint_group: "chat_stream", requests: 1 }];
  const card = { ...CARD, palette: "endpoints", chart: { labels: { "Chat Stream": "Chat stream" } } };
  const rows = ["Chat Stream", "Chat", "Other"].map((name) => ({ series: name, x: 0, y: 1 }));
  const colours = cardColours(card, rows, null, endpointMixRows);
  const groupColours = endpointColours(endpointMixRows);
  assert.deepEqual([...colours], [
    ["Chat Stream", groupColours.get("chat_stream")], ["Chat", groupColours.get("chat")], ["Other", OTHER_SERIES],
  ]);
});


test("a card whose every panel holds one series has no legend; a card of panels sharing series keeps its own", () => {
  const rows = [
    { panel: "request_share", series: "User request", x: 0, value: 9 },
    { panel: "token_hit", series: "Cache hit", x: 0, value: 60 },
  ];
  const panels = [{ panel: "request_share" }, { panel: "token_hit" }];
  const card = { figure: "fig_zoom", chart: {}, panels };
  const colours = cardColours(card, rows, null);
  assert.equal(hasOneSeriesPerPanel(card, rows), true);
  assert.deepEqual(figureLegend(card, rows, colours).series, []);
  const shared = [...rows, { panel: "token_hit", series: "User request", x: 0, value: 5 }];
  assert.equal(hasOneSeriesPerPanel(card, shared), false);
  assert.equal(figureLegend(card, shared, colours).series.length, 2);
  assert.equal(hasOneSeriesPerPanel({ ...card, panels: undefined }, rows), false);
});
