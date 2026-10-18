/**
 * A figure's elements and states: the figure card `renderFigure` lays out (its title, insight or caption, the place of
 * its legend, the body a chart is drawn into, its Definition control), its chart's name for a screen reader, the
 * loading, note and error states that replace a place's content, and `textElement`, which they are built of. The
 * page's start, its sections, the Traffic Explorer, the Insights' cards, the legend and the donut use it; it needs the
 * page's document.
 */

/** Replace `container`'s content with the loading state. */
export function showLoading(container) {
  const loading = document.createElement("p");
  loading.className = "loading";
  loading.textContent = "Loading";
  container.replaceChildren(loading);
}

/** Replace `container`'s content with a note reading `text`. */
export function showNote(container, text) {
  const note = document.createElement("p");
  note.className = "note";
  note.textContent = text;
  container.replaceChildren(note);
}

/** Replace `container`'s content with the error state holding `error`'s message, and log the error. */
export function showError(container, error) {
  console.error(error);
  showErrorNote(container, error);
}

/**
 * Replace `container`'s content with the error state holding `error`'s message, without logging it: for an error shown
 * in several places and logged once.
 */
export function showErrorNote(container, error) {
  const note = document.createElement("p");
  note.className = "note is-error";
  note.textContent = error.message;
  container.replaceChildren(note);
}

/**
 * Fill `place` with a figure card and return its body, the empty place to draw into. A card with an `insight`, one
 * sentence of what the chart means, shows its title, the insight, an empty place for its legend, the body and its
 * caption (evidence supporting the insight); a card without one shows its title, its caption, the legend's place and
 * the body. Both end in a Definition control that opens on the full definition and, where `rows` is given, the line of
 * rows it rests on. The title is a heading of the tag `heading`, an `h3` under a section's `h2` by default.
 */
export function renderFigure(place, { title, insight = null, caption, definition, rows = "", heading = "h3" }) {
  const figure = document.createElement("div");
  figure.className = "figure";
  const titleLine = textElement(heading, "figure-title", title);
  const captionLine = textElement("p", "figure-caption", caption);
  const legend = textElement("div", "figure-legend legend", "");
  const body = textElement("div", "figure-body", "");
  if (insight === null) {
    figure.append(titleLine, captionLine, legend, body);
  } else {
    figure.append(titleLine, textElement("p", "figure-insight", insight), legend, body, captionLine);
  }
  figure.append(figureDefinition(definition, rows));
  place.replaceChildren(figure);
  return body;
}

// A figure's Definition control: a closed `<details>` that opens on `definition` and, under it, `rows`, the line of the
// rows it rests on (its element has the class `figure-rows`); no such line where `rows` is "", so none leaves a gap.
function figureDefinition(definition, rows = "") {
  const details = document.createElement("details");
  details.className = "figure-definition";
  details.innerHTML = `
    <summary>Definition</summary>
    <p class="figure-definition-text"></p>`;
  details.querySelector(".figure-definition-text").textContent = definition;
  if (rows !== "") {
    details.append(textElement("p", "figure-rows", rows));
  }
  return details;
}

/**
 * The accessible name of the chart in a figure's `body` (as `renderFigure` lays it out): its card's title and its
 * insight, or its caption where it has none, "Endpoint mix: Each endpoint group's share of the requests."
 */
export function chartName(body) {
  const figure = body.closest(".figure");
  const point = figure.querySelector(".figure-insight") ?? figure.querySelector(".figure-caption");
  return `${figure.querySelector(".figure-title").textContent}: ${point.textContent}`;
}

// A chart's own SVG: one inside no other SVG, and not the colour legend Plot draws above a chart that shades a value,
// whose SVG's class ends in "-ramp".
const CHART_SVG = 'svg:not(svg svg):not([class$="-ramp"])';

/**
 * Name every chart drawn in `body` for a screen reader, as one image named `name`, or by `chartName` where no name is
 * given (a figure's body), its colour legend left out; called after each drawing, since a drawing replaces the chart. A
 * body holding a note has no chart to name.
 */
export function nameChart(body, name = null) {
  for (const chart of body.querySelectorAll(CHART_SVG)) {
    chart.setAttribute("role", "img");
    chart.setAttribute("aria-label", name ?? chartName(body));
  }
}

/** The place above a figure's body, as `renderFigure` lays it out, where its legend goes. */
export function legendPlace(body) {
  return body.closest(".figure").querySelector(".figure-legend");
}

/** A new element of the tag `tagName`, of the class `className`, holding `text` as its text. */
export function textElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}
