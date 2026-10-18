// A figure's elements (`shared/figure.js`): its chart's name for a screen reader, and its parts, as many as the rows a
// card spans in a group's grid.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { chartName, nameChart, renderFigure } from "../site/js/shared/figure.js";
import { FakeCardPart, FakeElement } from "./fake_page.js";

// The site's stylesheet, and its rule that lays a card of a group's grid on its row's tracks, the rows it spans.
const STYLE_FILE = new URL("../site/style.css", import.meta.url);
const CARD_GRID_SPAN = /\.card-grid > \.card \{[^}]*grid-row: span (\d+);/;

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

test("a card in a grid spans one row for each part renderFigure appends to a figure with an insight", (context) => {
  const span = Number(readFileSync(STYLE_FILE, "utf8").match(CARD_GRID_SPAN)[1]);
  globalThis.document = { createElement: (tag) => new FakeCardPart(tag) };
  context.after(() => delete globalThis.document);
  const card = new FakeElement("article");
  renderFigure(card, { title: "A title", insight: "An insight.", caption: "A caption.", definition: "Rows." });
  const parts = card.children[0].children.length;
  assert.equal(span, parts, `style.css spans a card over ${span} rows, but renderFigure appends ${parts} parts`);
});
