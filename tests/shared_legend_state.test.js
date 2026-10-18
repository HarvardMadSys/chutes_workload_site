// A legend's state (`shared/legend.js`): a chart that starts from a hidden set and tells each click's new set, and
// another chart that follows a legend.
import assert from "node:assert/strict";
import { test } from "node:test";

import { drawShownSeries, drawWithLegend } from "../site/js/shared/legend.js";
import { FakeElement, FakeFigureBody, settled, useFakeDocument } from "./fake_page.js";

// A legend of two series, as the Traffic Explorer's bars give one.
const LEGEND = {
  series: [{ name: "hermes", label: "hermes" }, { name: "pi", label: "Pi" }],
  colours: new Map([["hermes", "var(--series-1)"], ["pi", "var(--series-2)"]]),
};

function pressedStates(body) {
  return body.legendPlace.children.map((button) => button.getAttribute("aria-pressed"));
}

test("a chart may start from a hidden set, its buttons not pressed, and tell each click's new set", async (context) => {
  useFakeDocument(context);
  const body = new FakeFigureBody();
  const drawnWith = [];
  const told = [];
  const legendState = { hidden: new Set(["pi"]), onToggle: (hidden) => told.push([...hidden]) };
  await drawWithLegend(body, LEGEND, (hidden) => drawnWith.push([...hidden]), legendState);
  assert.deepEqual(pressedStates(body), ["true", "false"]);
  body.legendPlace.children[0].dispatch("click");
  await settled();
  body.legendPlace.children[1].dispatch("click");
  await settled();
  assert.deepEqual(drawnWith, [["pi"], ["hermes"]], "every series hidden shows the note, not the chart");
  assert.deepEqual(told, [["pi", "hermes"], ["hermes"]], "the set is told after each click, every series hidden too");
  assert.deepEqual(pressedStates(body), ["false", "true"]);
});

test("a chart of one series is drawn with nothing hidden, whatever hidden set it is given", async (context) => {
  useFakeDocument(context);
  const body = new FakeFigureBody();
  const drawnWith = [];
  const oneSeries = { series: LEGEND.series.slice(0, 1), colours: LEGEND.colours };
  const legendState = { hidden: new Set(["hermes"]) };
  await drawWithLegend(body, oneSeries, (hidden) => drawnWith.push([...hidden]), legendState);
  assert.deepEqual(drawnWith, [[]]);
  assert.deepEqual(body.legendPlace.children, [], "no legend is placed");
});

test("another chart follows a legend: drawn with its hidden set, or the note when every series is hidden",
  async (context) => {
    useFakeDocument(context);
    const body = new FakeElement("div");
    const drawnWith = [];
    await drawShownSeries(body, LEGEND, new Set(["pi"]), (hidden) => drawnWith.push([...hidden]));
    await drawShownSeries(body, LEGEND, new Set(["pi", "hermes"]), (hidden) => drawnWith.push([...hidden]));
    assert.deepEqual(drawnWith, [["pi"]]);
    assert.deepEqual(body.children.map((child) => [child.className, child.textContent]), [
      ["note", "Every series is hidden: click one in the legend to show it."],
    ]);
  });

test("a chart following a legend of one series is drawn with nothing hidden, whatever hidden set it is given",
  async (context) => {
    useFakeDocument(context);
    const body = new FakeElement("div");
    const drawnWith = [];
    const oneSeries = { series: LEGEND.series.slice(0, 1), colours: LEGEND.colours };
    await drawShownSeries(body, oneSeries, new Set(["hermes"]), (hidden) => drawnWith.push([...hidden]));
    assert.deepEqual(drawnWith, [[]]);
    assert.deepEqual(body.children, [], "no note is shown");
  });
