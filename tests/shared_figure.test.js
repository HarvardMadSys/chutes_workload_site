import assert from "node:assert/strict";
import { test } from "node:test";

import { chartName, nameChart } from "../site/js/shared/figure.js";
import { FakeElement } from "./fake_page.js";

/** A figure's body as `renderFigure` lays it out, its card holding the elements `parts` names by class. */
function bodyOfFigure(parts) {
  const figure = { querySelector: (selector) => parts[selector] ?? null };
  return { closest: () => figure };
}

test("a chart is named by its card's title and insight, or its caption where the card has no insight", () => {
  const title = { textContent: "Tokens per request" };
  const insight = { textContent: "Each request adds little to a large context." };
  const caption = { textContent: "Input, uncached input and output tokens of each request." };
  const withInsight = bodyOfFigure({ ".figure-title": title, ".figure-insight": insight, ".figure-caption": caption });
  assert.equal(chartName(withInsight), "Tokens per request: Each request adds little to a large context.");
  const withCaption = bodyOfFigure({ ".figure-title": title, ".figure-caption": caption });
  assert.equal(chartName(withCaption), "Tokens per request: Input, uncached input and output tokens of each request.");
});

test("a chart is named as one image by the name given, else by its card's", () => {
  const caption = { textContent: "Each family's share of the requests." };
  const chart = new FakeElement("svg");
  const body = bodyOfFigure({ ".figure-title": { textContent: "Family mix" }, ".figure-caption": caption });
  body.querySelectorAll = () => [chart];
  nameChart(body);
  assert.deepEqual([...chart.attributes], [
    ["role", "img"], ["aria-label", "Family mix: Each family's share of the requests."],
  ]);
  nameChart({ querySelectorAll: () => [chart] }, "Input tokens distribution");
  assert.equal(chart.getAttribute("aria-label"), "Input tokens distribution");
});
