/**
 * A card of the Insights: one panel of the paper's figures, shown as the image `make data` rendered from its PDF. A
 * card is `{ image, title, insight, caption, definition, source, legendImage?, isWide? }` (`explore/figure_sections.js`
 * lists them): `image` the figure's name, `figures/<image>.png`; `source` the address of the artifact's README that
 * says how the figure is computed; `legendImage` the name of a legend image shown above the figure.
 *
 * A card's words are placed at once (`renderFigureCard`), its image only when its topic is first shown
 * (`drawFigureImage`), from the images' index (`readFigureIndex` of `shared/answers.js`): `sizes`, a Map from an
 * image's name to its `{ width, height }` in pixels. The card draws nothing interactive.
 */

import { showError, showLoading } from "../shared/charts.js";

// The folder of the figure images, relative to the page.
const FIGURES_FOLDER = "figures/";

// The data step renders a figure at twice the width it is shown at, so it stays sharp on a high-density screen.
const PIXELS_PER_CSS_PIXEL = 2;

// The text of the link, behind a card's Definition control, to the README that says how its figure is computed.
const SOURCE_LINK_TEXT = "How it is computed · artifact README";

/** The address of the image `name`, relative to the page: `figures/<name>.png`. */
export function figureImageUrl(name) {
  return `${FIGURES_FOLDER}${name}.png`;
}

/** The size an image of `pixels` (`{ width, height }`) is shown at, in CSS pixels: half each, rounded. */
export function shownSize(pixels) {
  return {
    width: Math.round(pixels.width / PIXELS_PER_CSS_PIXEL),
    height: Math.round(pixels.height / PIXELS_PER_CSS_PIXEL),
  };
}

/** The element of `card`: an empty `<article>` of the class `card`, and `is-wide` for a wide card, its id the image. */
export function newCardElement(card) {
  const element = document.createElement("article");
  element.className = card.isWide === true ? "card is-wide" : "card";
  element.id = card.image;
  return element;
}

/**
 * Fill `container` with `card`'s words and return its body, the place of its image, showing the loading state: the
 * title, the insight, an empty legend place, the body, the caption, and the Definition control that opens on the
 * definition and the link to its source.
 */
export function renderFigureCard(container, card) {
  const figure = document.createElement("div");
  figure.className = "figure";
  const body = textElement("div", "figure-body", "");
  figure.append(
    textElement("h3", "figure-title", card.title),
    textElement("p", "figure-insight", card.insight),
    // The legend place, kept empty: a legend image sits in the body, on the figure's panel.
    textElement("div", "figure-legend", ""),
    body,
    textElement("p", "figure-caption", card.caption),
    definitionControl(card),
  );
  container.replaceChildren(figure);
  showLoading(body);
  return body;
}

/**
 * Draw `card`'s image into `body`, at its shown size from `sizes`, on the figure's panel: its legend image above it
 * when it has one, and the figure linked to itself at full size in a new tab. An image the index does not list, or that
 * fails to load, shows an error naming it in the body instead.
 */
export function drawFigureImage(body, card, sizes) {
  const names = card.legendImage === undefined ? [card.image] : [card.legendImage, card.image];
  const unlisted = names.find((name) => !sizes.has(name));
  if (unlisted !== undefined) {
    showError(body, new Error(`${figureImageUrl(unlisted)} is not in the figure index`));
    return;
  }
  const panel = document.createElement("div");
  panel.className = "figure-panel";
  if (card.legendImage !== undefined) {
    panel.append(figureImage(body, card.legendImage, sizes, `Legend of ${card.title}`));
  }
  const link = document.createElement("a");
  link.href = figureImageUrl(card.image);
  link.target = "_blank";
  link.rel = "noopener";
  link.append(figureImage(body, card.image, sizes, `${card.title}. ${card.insight}`));
  panel.append(link);
  body.replaceChildren(panel);
}

/**
 * The image `name` at its shown size, read by a screen reader as `alt`; if it fails to load, `body` shows the error
 * in its place.
 */
function figureImage(body, name, sizes, alt) {
  const size = shownSize(sizes.get(name));
  const image = document.createElement("img");
  image.src = figureImageUrl(name);
  image.setAttribute("width", String(size.width));
  image.setAttribute("height", String(size.height));
  image.alt = alt;
  image.addEventListener("error", () => showError(body, new Error(`Could not load ${figureImageUrl(name)}`)));
  return image;
}

/** A card's Definition control: a closed `<details>` that opens on its definition and the link to its source. */
function definitionControl(card) {
  const details = document.createElement("details");
  details.className = "figure-definition";
  const source = document.createElement("a");
  source.href = card.source;
  source.target = "_blank";
  source.rel = "noopener";
  source.textContent = SOURCE_LINK_TEXT;
  const sourceLine = textElement("p", "figure-source", "");
  sourceLine.append(source);
  const summary = document.createElement("summary");
  summary.textContent = "Definition";
  details.append(summary, textElement("p", "figure-definition-text", card.definition), sourceLine);
  return details;
}

// An element of `tagName` with the class `className` holding `text`.
function textElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}
