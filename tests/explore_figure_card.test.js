import assert from "node:assert/strict";
import { test } from "node:test";

import {
  drawFigureImage, figureImageUrl, newCardElement, renderFigureCard, shownSize,
} from "../site/js/explore/figure_card.js";

/** A stand-in for a page element: its children, attributes, listeners and the properties a card sets. */
class FakeElement {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.className = "";
    this.textContent = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type) {
    this.listeners.get(type)();
  }
}

/** Make a stand-in the global document for the test of `context`, and keep the errors a card logs out of its output. */
function useFakeDocument(context) {
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  context.after(() => delete globalThis.document);
  context.mock.method(console, "error", () => undefined);
}

// A card as a topic lists it, and the same with the legend image.
const CARD = Object.freeze({
  image: "fig_a",
  title: "Daily request rate",
  insight: "Aggregate demand is non-stationary.",
  caption: "Requests rise, peak and decline.",
  definition: "Requests per day.",
  source: "https://github.com/HarvardMadSys/chutes_workload/blob/main/paper/01_workload_overview/README.md",
});
const LEGEND_CARD = Object.freeze({ ...CARD, legendImage: "fig_legend" });

// The images' index: each image's size in pixels.
const SIZES = new Map([["fig_a", { width: 1129, height: 970 }], ["fig_legend", { width: 2161, height: 308 }]]);

test("an image is fetched from figures/ by its name", () => {
  assert.equal(figureImageUrl("fig_seasonality"), "figures/fig_seasonality.png");
});

test("an image is shown at half its pixels, rounded", () => {
  assert.deepEqual(shownSize({ width: 1129, height: 970 }), { width: 565, height: 485 });
});

test("a card is an article named by its image, and a wide card is marked wide", (context) => {
  useFakeDocument(context);
  const element = newCardElement(CARD);
  assert.equal(element.tag, "article");
  assert.equal(element.id, "fig_a");
  assert.equal(element.className, "card");
  assert.equal(newCardElement({ ...CARD, isWide: true }).className, "card is-wide");
});

test("a card shows its title, insight, legend place, image place, caption and Definition control in order", (context) => {
  useFakeDocument(context);
  const container = new FakeElement("article");
  const body = renderFigureCard(container, CARD);
  const [figure] = container.children;
  assert.deepEqual(figure.children.map((part) => part.className), [
    "figure-title", "figure-insight", "figure-legend", "figure-body", "figure-caption", "figure-definition",
  ]);
  const [title, insight, , place, caption] = figure.children;
  assert.deepEqual([title.tag, title.textContent], ["h3", CARD.title]);
  assert.equal(insight.textContent, CARD.insight);
  assert.equal(caption.textContent, CARD.caption);
  assert.equal(place, body);
  assert.equal(body.children[0].className, "loading");
});

test("the Definition control opens on the definition and the link to how the figure is computed", (context) => {
  useFakeDocument(context);
  const container = new FakeElement("article");
  renderFigureCard(container, CARD);
  const details = container.children[0].children[5];
  const [summary, definition, sourceLine] = details.children;
  assert.equal(details.tag, "details");
  assert.equal(summary.textContent, "Definition");
  assert.equal(definition.textContent, CARD.definition);
  const [link] = sourceLine.children;
  assert.deepEqual([link.href, link.target, link.textContent], [CARD.source, "_blank", "How it is computed · artifact README"]);
});

test("the image is shown at its size, named by the title and insight, and links to itself in a new tab", (context) => {
  useFakeDocument(context);
  const body = new FakeElement("div");
  drawFigureImage(body, CARD, SIZES);
  const [panel] = body.children;
  assert.equal(panel.className, "figure-panel");
  assert.equal(panel.children.length, 1);
  const [link] = panel.children;
  assert.deepEqual([link.tag, link.href, link.target], ["a", "figures/fig_a.png", "_blank"]);
  const [image] = link.children;
  assert.equal(image.src, "figures/fig_a.png");
  assert.deepEqual([image.getAttribute("width"), image.getAttribute("height")], ["565", "485"]);
  assert.equal(image.alt, "Daily request rate. Aggregate demand is non-stationary.");
});

test("a card with a legend shows the legend image above the figure, at the same scale", (context) => {
  useFakeDocument(context);
  const body = new FakeElement("div");
  drawFigureImage(body, LEGEND_CARD, SIZES);
  const [legend, link] = body.children[0].children;
  assert.deepEqual([legend.tag, legend.src], ["img", "figures/fig_legend.png"]);
  assert.deepEqual([legend.getAttribute("width"), legend.getAttribute("height")], ["1081", "154"]);
  assert.equal(link.children[0].src, "figures/fig_a.png");
});

test("an image the index does not list shows an error naming it in the image's place", (context) => {
  useFakeDocument(context);
  const body = new FakeElement("div");
  drawFigureImage(body, { ...CARD, image: "fig_missing" }, SIZES);
  const [note] = body.children;
  assert.equal(note.className, "note is-error");
  assert.match(note.textContent, /figures\/fig_missing\.png is not in the figure index/);
});

test("an image that fails to load shows an error naming it in the image's place", (context) => {
  useFakeDocument(context);
  const body = new FakeElement("div");
  drawFigureImage(body, CARD, SIZES);
  const image = body.children[0].children[0].children[0];
  image.dispatch("error");
  assert.equal(body.children[0].className, "note is-error");
  assert.match(body.children[0].textContent, /Could not load figures\/fig_a\.png/);
});
