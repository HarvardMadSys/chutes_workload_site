import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DISTRIBUTION_CARDS, distributionAxis, distributionCaption, drawDistributionCards, drawDistributionCurves,
  formatTtftTick, placeDistributionCards,
} from "../site/js/traffic/traffic_distribution_cards.js";
import { FakeElement } from "./fake_page.js";

// A stand-in element whose `querySelector` finds a new element, as the figure's Definition control asks for its parts.
function fakeElement(tag) {
  const element = new FakeElement(tag);
  element.querySelector = () => new FakeElement();
  return element;
}

/** Make a stand-in the global document for the test of `context`; node has none of its own. */
function useFakeDocument(context) {
  globalThis.document = { createElement: fakeElement };
  context.after(() => delete globalThis.document);
}

// The bars' legend of two families, and their kind of series.
const LEGEND = {
  series: [{ name: "Kin", label: "Kin" }, { name: "Pi", label: "Pi" }],
  colours: new Map([["Kin", "var(--series-1)"], ["Pi", "var(--series-2)"]]),
};
const FAMILIES = { column: "family" };

// The text of each card's place: its title and caption once drawn, its body's note, or its loading line.
function placeTexts(places) {
  return places.map((place) => place.children[0].children.map((part) => part.textContent));
}

test("a TTFT tick is written as a duration under a minute and in seconds from a minute", () => {
  assert.deepEqual([0.01, 0.1, 1, 10, 100, 1000].map(formatTtftTick), [
    "10 ms", "0.1 s", "1 s", "10 s", "100 s", "1,000 s",
  ]);
});

test("the cards' caption names the days their weeks cover", () => {
  assert.equal(distributionCaption({ firstDay: "2025-04-11", lastDay: "2025-06-26" }),
    "Over April 11 – June 26, 2025, the trace weeks holding a chosen day.");
  assert.equal(distributionCaption(null), "The trace weeks holding a chosen day.");
});

test("a card's x axis spans its rows and ticks at most four of the powers of ten in them", () => {
  const ttft = DISTRIBUTION_CARDS[2];
  const axis = distributionAxis(ttft, [{ x: 0.005 }, { x: 4096 }, { x: 1 }]);
  assert.deepEqual(axis.domain, [0.005, 4096]);
  assert.deepEqual(axis.ticks, [0.01, 1, 100]);
  assert.equal(axis.label, "Time to first token");
  assert.deepEqual(distributionAxis(ttft, [{ x: 2 }, { x: 900 }]).ticks, [10, 100]);
});

test("the three cards are placed loading, input tokens, output tokens and time to first token", (context) => {
  useFakeDocument(context);
  const grid = new FakeElement("div");
  const places = placeDistributionCards(grid);
  assert.deepEqual(grid.children, places);
  assert.deepEqual(places.map((place) => place.children[0].className), ["loading", "loading", "loading"]);
  assert.deepEqual(DISTRIBUTION_CARDS.map((card) => card.metric), ["input_tokens", "output_tokens", "ttft"]);
});

test("a card whose choice records no value says so, under its title and caption", async (context) => {
  useFakeDocument(context);
  const places = placeDistributionCards(new FakeElement("div"));
  const covered = { firstDay: "2025-04-11", lastDay: "2025-04-17" };
  const distributions = { rows: [], covered, series: FAMILIES, legend: LEGEND };
  const drawn = await drawDistributionCards(places, distributions, new Set());
  const caption = "Over April 11 – April 17, 2025, the trace weeks holding a chosen day.";
  const [title, captionLine, , body] = places[2].children[0].children;
  assert.deepEqual([title.tag, title.textContent, captionLine.textContent], ["h4", "Time to first token", caption]);
  const notes = body.children.map((child) => child.textContent);
  assert.deepEqual(notes, ["None of the chosen requests records this value."]);
  assert.deepEqual(drawn.charts.map((chart) => chart.rows), [[], [], []]);
});

test("every series hidden in the bars' legend shows the legend's note in each card", async (context) => {
  useFakeDocument(context);
  const places = placeDistributionCards(new FakeElement("div"));
  const distributions = { rows: [], covered: null, series: FAMILIES, legend: LEGEND };
  const drawn = await drawDistributionCards(places, distributions, new Set());
  await drawDistributionCurves(drawn, new Set(["Kin", "Pi"]));
  const notes = drawn.charts.map((chart) => chart.body.children[0].textContent);
  assert.deepEqual(notes, Array(3).fill("Every series is hidden: click one in the legend to show it."));
  assert.equal(placeTexts(places)[0][0], "Input tokens");
});
