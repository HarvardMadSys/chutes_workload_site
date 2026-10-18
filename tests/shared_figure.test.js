// A figure's elements (`shared/figure.js`): its chart's name for a screen reader, and its parts, as many as the rows a
// card spans in a group's grid.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { chartName, nameChart, renderFigure } from "../site/js/shared/figure.js";
import { FakeElement, useFakePage } from "./fake_page.js";

// The site's stylesheet, and its rule that lays a card of a group's grid on its row's tracks, the rows it spans.
const STYLE_FILE = new URL("../site/style.css", import.meta.url);
const CARD_GRID_SPAN = /\.card-grid > \.card \{[^}]*grid-row: span (\d+);/;

// A figure's words: its title, its insight, and the caption it shows under the insight or in its place.
const TITLE = "Tokens per request";
const INSIGHT = "Each request adds little to a large context.";
const CAPTION = "Input, uncached input and output tokens of each request.";

test("a chart is named by its card's title and insight, or its caption where the card has no insight", (context) => {
  useFakePage(context);
  const withInsight = renderFigure(new FakeElement("div"), {
    title: TITLE, insight: INSIGHT, caption: CAPTION, definition: "Rows.",
  });
  assert.equal(chartName(withInsight), "Tokens per request: Each request adds little to a large context.");
  const withCaption = renderFigure(new FakeElement("div"), { title: TITLE, caption: CAPTION, definition: "Rows." });
  assert.equal(chartName(withCaption), "Tokens per request: Input, uncached input and output tokens of each request.");
});

test("a chart is named as one image by the name given, else by its card's", (context) => {
  useFakePage(context);
  const caption = "Each family's share of the requests.";
  const body = renderFigure(new FakeElement("div"), { title: "Family mix", caption, definition: "Rows." });
  const chart = new FakeElement("svg");
  // nameChart finds a chart by 'svg:not(svg svg):not([class$="-ramp"])', which the fake does not read; the snapshot
  // test checks every chart's name in Chromium.
  body.querySelectorAll = () => [chart];
  nameChart(body);
  assert.deepEqual([...chart.attributes], [
    ["role", "img"], ["aria-label", "Family mix: Each family's share of the requests."],
  ]);
  nameChart(body, "Input tokens distribution");
  assert.equal(chart.getAttribute("aria-label"), "Input tokens distribution");
});

test("a card in a grid spans one row for each part renderFigure appends to a figure with an insight", (context) => {
  const rule = readFileSync(STYLE_FILE, "utf8").match(CARD_GRID_SPAN);
  assert.ok(rule, "style.css has no .card-grid > .card { grid-row: span N } rule");
  const span = Number(rule[1]);
  useFakePage(context);
  const card = new FakeElement("article");
  renderFigure(card, { title: "A title", insight: "An insight.", caption: "A caption.", definition: "Rows." });
  const parts = card.children[0].children.length;
  assert.equal(span, parts, `style.css spans a card over ${span} rows, but renderFigure appends ${parts} parts`);
});
