// The legend (`shared/legend.js`): its toggles, its buttons and swatches, a chart drawn again on each click, the note
// when every series is hidden, and its keys.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dashedBackground, drawWithLegend, hasLegend, isEverySeriesHidden, legendEntryNames, legendIndexForKey, mountLegend,
  toggledSeries,
} from "../site/js/shared/legend.js";
import { legendPlace, renderFigure } from "../site/js/shared/figure.js";
import { FakeElement, settled, useFakePage } from "./fake_page.js";
import { FIGURE, LEGEND } from "./shared_fixtures.js";

// A legend whose entries each toggle two series together, one routing policy's series of two models.
const POLICY_LEGEND = {
  series: [
    { name: "Sticky", label: "Sticky", names: ["A, Sticky", "B, Sticky"] },
    { name: "Load-first", label: "Load-first", names: ["A, Load-first", "B, Load-first"] },
  ],
  colours: new Map([["Sticky", "var(--series-3)"], ["Load-first", "var(--series-1)"]]),
};

test("toggling a series hides it when shown and shows it when hidden, leaving the set it was given alone", () => {
  const hidden = new Set(["pi"]);
  assert.deepEqual([...toggledSeries(hidden, ["hermes"])].sort(), ["hermes", "pi"]);
  assert.deepEqual([...toggledSeries(hidden, ["pi"])], []);
  assert.deepEqual([...hidden], ["pi"]);
});

test("an entry's button toggles its names, or its name alone where it has none; the names go together", () => {
  assert.deepEqual(legendEntryNames(LEGEND.series[0]), ["hermes"]);
  assert.deepEqual(legendEntryNames(POLICY_LEGEND.series[0]), ["A, Sticky", "B, Sticky"]);
  const names = ["A, Sticky", "B, Sticky"];
  assert.deepEqual([...toggledSeries(new Set(["A, Sticky"]), names)].sort(), names);
  assert.deepEqual([...toggledSeries(new Set(names), names)], []);
});

test("every series is hidden only when each of the legend's series is", () => {
  assert.equal(isEverySeriesHidden(LEGEND.series, new Set(["hermes"])), false);
  assert.equal(isEverySeriesHidden(LEGEND.series, new Set(["hermes", "pi"])), true);
  const stickyAndOneLoadFirst = new Set(["A, Sticky", "B, Sticky", "A, Load-first"]);
  assert.equal(isEverySeriesHidden(POLICY_LEGEND.series, stickyAndOneLoadFirst), false);
  const everyPolicy = new Set([...stickyAndOneLoadFirst, "B, Load-first"]);
  assert.equal(isEverySeriesHidden(POLICY_LEGEND.series, everyPolicy), true);
});

test("a legend of no series has no series hidden, so its chart is never replaced by the note", () => {
  assert.equal(isEverySeriesHidden([], new Set()), false);
});

test("a legend lists two series or more", () => {
  assert.equal(hasLegend([]), false);
  assert.equal(hasLegend(LEGEND.series.slice(0, 1)), false);
  assert.equal(hasLegend(LEGEND.series), true);
});

test("a legend of one series mounts no button", (context) => {
  useFakePage(context);
  const container = new FakeElement("div");
  container.append(new FakeElement("button")); // a button of an earlier legend, which the mount clears
  mountLegend(container, { series: LEGEND.series.slice(0, 1), colours: LEGEND.colours });
  assert.deepEqual(container.children, []);
});

test("the legend is one button per series", (context) => {
  useFakePage(context);
  const container = new FakeElement("div");
  mountLegend(container, LEGEND);
  assert.deepEqual(container.children.map((button) => button.tag), ["button", "button"]);
});

test("a line's swatch is dashed for a series the legend names dashed, solid for the others", (context) => {
  useFakePage(context);
  const container = new FakeElement("div");
  mountLegend(container, { ...LEGEND, swatch: "line", dashed: ["pi"] });
  const [solid, dashed] = container.children.map((button) => button.children[0]);
  assert.deepEqual([solid.className, solid.style.background], ["legend-swatch is-line", "var(--series-1)"]);
  assert.deepEqual([dashed.className, dashed.style.background],
    ["legend-swatch is-line", dashedBackground("var(--series-2)")]);
});

test("a square swatch is never dashed, and a legend without a dashed list draws every line solid", async (context) => {
  useFakePage(context);
  const container = new FakeElement("div");
  mountLegend(container, { ...LEGEND, swatch: "square", dashed: ["pi"] });
  assert.equal(container.children[1].children[0].style.background, "var(--series-2)");
  const body = renderFigure(new FakeElement("div"), FIGURE);
  await drawWithLegend(body, { ...LEGEND, swatch: "line" }, () => undefined);
  assert.equal(legendPlace(body).children[1].children[0].style.background, "var(--series-2)");
  const dashedBody = renderFigure(new FakeElement("div"), FIGURE);
  await drawWithLegend(dashedBody, { ...LEGEND, swatch: "line", dashed: ["hermes"] }, () => undefined);
  assert.equal(legendPlace(dashedBody).children[0].children[0].style.background, dashedBackground("var(--series-1)"));
});

test("a dashed swatch is its colour in dashes of four pixels and gaps of three", () => {
  assert.equal(dashedBackground("var(--series-3)"),
    "repeating-linear-gradient(to right, var(--series-3) 0 4px, transparent 4px 7px)");
});

test("a click on a legend button tells the new hidden set and sets the button from it", (context) => {
  useFakePage(context);
  const container = new FakeElement("div");
  const told = [];
  mountLegend(container, LEGEND, { onToggle: (hidden) => told.push([...hidden]) });
  container.children[1].dispatch("click");
  assert.equal(container.children[1].getAttribute("aria-pressed"), "false");
  container.children[1].dispatch("click");
  assert.equal(container.children[1].getAttribute("aria-pressed"), "true");
  assert.deepEqual(told, [["pi"], []]);
});

test("after two presses every button is pressed exactly when its entry is shown in the hidden set told", (context) => {
  useFakePage(context);
  const container = new FakeElement("div");
  let told = null;
  mountLegend(container, LEGEND, { hidden: new Set(["pi"]), onToggle: (hidden) => { told = hidden; } });
  container.children[0].dispatch("click");
  container.children[1].dispatch("click");
  assert.deepEqual([...told], ["hermes"]);
  const pressed = container.children.map((button) => button.getAttribute("aria-pressed"));
  assert.deepEqual(pressed, LEGEND.series.map((entry) => String(!told.has(entry.name))));
});

test("a chart with a legend is drawn with nothing hidden, then again with each click's series hidden or shown", async (context) => {
  useFakePage(context);
  const body = renderFigure(new FakeElement("div"), FIGURE);
  const drawnWith = [];
  await drawWithLegend(body, LEGEND, (hidden) => drawnWith.push([...hidden]));
  const place = legendPlace(body);
  place.children[0].dispatch("click");
  await settled();
  place.children[0].dispatch("click");
  await settled();
  assert.deepEqual(drawnWith, [[], ["hermes"], []]);
});

test("a click on an entry of names hides all of them in one drawing, and a second click shows them again", async (context) => {
  useFakePage(context);
  const body = renderFigure(new FakeElement("div"), FIGURE);
  const drawnWith = [];
  const lineLegend = { ...POLICY_LEGEND, swatch: "line" };
  await drawWithLegend(body, lineLegend, (hidden) => drawnWith.push([...hidden].sort()));
  assert.equal(legendPlace(body).children[0].children[0].style.background, "var(--series-3)");
  legendPlace(body).children[0].dispatch("click");
  await settled();
  legendPlace(body).children[0].dispatch("click");
  await settled();
  assert.deepEqual(drawnWith, [[], ["A, Sticky", "B, Sticky"], []]);
});

test("a chart whose every series is hidden shows a note instead of being drawn", async (context) => {
  useFakePage(context);
  const body = renderFigure(new FakeElement("div"), FIGURE);
  let draws = 0;
  await drawWithLegend(body, LEGEND, () => { draws += 1; });
  const place = legendPlace(body);
  place.children[0].dispatch("click");
  place.children[1].dispatch("click");
  await settled();
  assert.equal(draws, 2); // the first drawing and the one with hermes hidden
  assert.equal(body.children[0].className, "note");
});

test("a new drawing of the chart starts with every series shown", async (context) => {
  useFakePage(context);
  const earlierBody = renderFigure(new FakeElement("div"), FIGURE);
  await drawWithLegend(earlierBody, LEGEND, () => undefined);
  legendPlace(earlierBody).children[0].dispatch("click");
  await settled();
  const drawnWith = [];
  const body = renderFigure(new FakeElement("div"), FIGURE);
  await drawWithLegend(body, LEGEND, (hidden) => drawnWith.push([...hidden]));
  assert.deepEqual(drawnWith, [[]]);
  assert.deepEqual(legendPlace(body).children.map((button) => button.getAttribute("aria-pressed")), ["true", "true"]);
});

test("a chart of one series or none is drawn once, nothing hidden, with no legend and no note", async (context) => {
  useFakePage(context);
  for (const series of [[], LEGEND.series.slice(0, 1)]) {
    const body = renderFigure(new FakeElement("div"), FIGURE);
    const drawnWith = [];
    await drawWithLegend(body, { series, colours: LEGEND.colours }, (hidden) => drawnWith.push([...hidden]));
    assert.deepEqual(drawnWith, [[]]);
    assert.deepEqual(legendPlace(body).children, [], "no legend button is placed");
    assert.deepEqual(body.children, []);
  }
});

test("a drawing after a click that fails shows its error in the chart's place", async (context) => {
  useFakePage(context);
  context.mock.method(console, "error", () => undefined); // the error is logged as well as shown; keep the run quiet
  const body = renderFigure(new FakeElement("div"), FIGURE);
  let draws = 0;
  async function drawChart() {
    draws += 1;
    if (draws > 1) {
      throw new Error("the chart could not be drawn");
    }
  }
  await drawWithLegend(body, LEGEND, drawChart);
  legendPlace(body).children[0].dispatch("click");
  await settled();
  assert.equal(body.children[0].className, "note is-error");
  assert.equal(body.children[0].textContent, "the chart could not be drawn");
});

test("the arrow keys move between a legend's buttons, stopping at its ends; any other key is the browser's", () => {
  assert.equal(legendIndexForKey("ArrowRight", 0, 3), 1);
  assert.equal(legendIndexForKey("ArrowRight", 2, 3), 2);
  assert.equal(legendIndexForKey("ArrowLeft", 1, 3), 0);
  assert.equal(legendIndexForKey("ArrowLeft", 0, 3), 0);
  assert.equal(legendIndexForKey("Tab", 1, 3), null);
  assert.equal(legendIndexForKey("Enter", 1, 3), null);
});

test("a legend is one tab stop, a named group, and ArrowRight moves the stop and the focus to the next button", (context) => {
  useFakePage(context);
  const container = new FakeElement("div");
  mountLegend(container, LEGEND);
  assert.equal(container.getAttribute("role"), "group");
  assert.equal(container.getAttribute("aria-label"), "Series");
  assert.deepEqual(container.children.map((button) => button.tabIndex), [0, -1]);
  let isDefaultPrevented = false;
  const event = { key: "ArrowRight", preventDefault: () => { isDefaultPrevented = true; } };
  container.children[0].dispatch("keydown", event);
  assert.equal(isDefaultPrevented, true);
  assert.deepEqual(container.children.map((button) => button.tabIndex), [-1, 0]);
  assert.equal(globalThis.document.activeElement, container.children[1]);
});
