/**
 * The header and footer of the page, and the query string of the URL keys the header's brand carries (`queryString`).
 *
 * Their links lead to the page's sections by anchor alone, so following one scrolls the page rather than loading it
 * again. The header's brand links the page itself with the URL's keys, so it opens the page at the top with the Traffic
 * Explorer's choice kept; the footer's brand links the page with none.
 */

import { linkMark } from "./link_marks.js";

/** Every address outside the site that a page links, each written once. */
export const URLS = Object.freeze({
  lab: "https://madsys.seas.harvard.edu/",
  dataset: "https://huggingface.co/datasets/harvardMadsys/chutes_metadata",
  paper: "https://arxiv.org/abs/2608.13573",
  code: "https://github.com/HarvardMadSys/chutes_workload",
  github: "https://github.com/HarvardMadSys",
});

// The page, which the brand links.
const PAGE_FILE = "index.html";

/** The anchor of the Traffic Explorer, where the header's link and the hero's first button lead. */
export const TRAFFIC_EXPLORER_ANCHOR = "#traffic";

/** The page's sections, linked from the header and from the footer's "On this site": `{ anchor, title }`. */
export const LINKED_SECTIONS = Object.freeze([
  Object.freeze({ anchor: "#overview", title: "Overview" }),
  Object.freeze({ anchor: TRAFFIC_EXPLORER_ANCHOR, title: "Traffic Explorer" }),
  Object.freeze({ anchor: "#insights", title: "Insights" }),
  Object.freeze({ anchor: "#cite", title: "Cite" }),
]);

// The footer's "Elsewhere": the dataset, the paper, the code told apart from the lab's GitHub, each with the link mark
// it names. The header links nothing off the site; the hero and the footer do.
const ELSEWHERE_LINKS = Object.freeze([
  Object.freeze({ title: "Dataset", url: URLS.dataset, mark: "huggingface" }),
  Object.freeze({ title: "Paper", url: URLS.paper, mark: "document" }),
  Object.freeze({ title: "Code (this trace)", url: URLS.code, mark: "github" }),
  Object.freeze({ title: "MadSys on GitHub", url: URLS.github, mark: "github" }),
]);

/** The lab's name, written under the hero and in the footer, linking to the lab. */
export const AFFILIATION = "Harvard SEAS · MadSys Lab";
// The footer's line after its first words, which count the months.
const FOOTER_LINE_REST = "of production LLM serving on Chutes.";

/**
 * The words that count `monthCount` months, as the hero's lede and the footer's line open: "13 months", "1 month";
 * "One year" when the count is not known (null).
 */
export function monthCountText(monthCount) {
  if (monthCount === null) {
    return "One year";
  }
  return `${monthCount} ${monthCount === 1 ? "month" : "months"}`;
}

/** The query string of `params` for the address bar or a link: "?" and the keys; "" for no keys. */
export function queryString(params) {
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

/**
 * Fill `container` with the site header: the brand, linking the page with the URLSearchParams `carried`, and the links
 * to the page's sections.
 */
export function renderHeader(container, carried) {
  const sectionLinks = LINKED_SECTIONS.map((section) => sectionLink(section, "nav-link"));
  container.innerHTML = `
    <div class="header-inner">
      ${brand(queryString(carried))}
      <nav class="site-nav" aria-label="Site">
        ${sectionLinks.join("")}
      </nav>
    </div>`;
}

// The header containers whose height is already measured, so a redraw of the header adds no second observer.
const MEASURED_HEADERS = new WeakSet();

// The custom property that holds the header's height as drawn, which the sections' scroll margin reads (`style.css`):
// the header takes a second row, and its links wrap, as the width needs.
const HEADER_HEIGHT_PROPERTY = "--header-measured-height";

/**
 * Render the site header into `container` as `renderHeader` does, and keep the page's `--header-measured-height` at
 * the header's height whenever it changes. A second render into the same container keeps the measuring.
 */
export function mountHeader(container, carried) {
  if (!MEASURED_HEADERS.has(container)) {
    MEASURED_HEADERS.add(container);
    new ResizeObserver(() => measureHeader(container)).observe(container);
  }
  renderHeader(container, carried);
}

// Write the header's height, as drawn now, to the page's `--header-measured-height`.
function measureHeader(container) {
  document.documentElement.style.setProperty(HEADER_HEIGHT_PROPERTY, `${container.offsetHeight}px`);
}

/**
 * Fill `container` with the site footer: the brand and one line counting the `monthCount` months (null when not
 * known), the page's sections and the places off the site.
 */
export function renderFooter(container, monthCount) {
  const sectionLinks = LINKED_SECTIONS.map((section) => sectionLink(section, "footer-link"));
  const elsewhereLinks = ELSEWHERE_LINKS.map((link) => externalLink(link, "footer-link"));
  container.innerHTML = `
    <div class="footer-inner">
      <div class="footer-brand">
        ${brand("")}
        <p>${monthCountText(monthCount)} ${FOOTER_LINE_REST}</p>
        <p><a class="affiliation" href="${URLS.lab}" target="_blank" rel="noopener">${AFFILIATION}</a></p>
      </div>
      ${footerLinkList("On this site", sectionLinks)}
      ${footerLinkList("Elsewhere", elsewhereLinks)}
    </div>`;
}

// The brand, linking the page with `query`, the URL keys it carries ("" for none): a crimson square over a pale one, and
// the name.
function brand(query) {
  return `
    <a class="brand" href="${PAGE_FILE}${query}">
      <span class="brand-mark" aria-hidden="true"></span>
      <span>Chutes <em>Production Trace</em></span>
    </a>`;
}

// A link of the class `className` to `section` by its anchor alone.
function sectionLink(section, className) {
  return `<a class="${className}" href="${section.anchor}">${section.title}</a>`;
}

/**
 * The markup of a link off the site to `link`, `{ title, url }` and optionally `mark`, the name a `linkMark` knows, of
 * the class `className` where one is given: it opens in a new tab, without giving that tab a handle on this one, the
 * mark, when named, comes before the text, and the stylesheet ends it in an arrow.
 */
export function externalLink(link, className = null) {
  const classAttribute = className === null ? "" : ` class="${className}"`;
  const mark = Object.hasOwn(link, "mark") ? linkMark(link.mark) : "";
  return `<a${classAttribute} href="${link.url}" target="_blank" rel="noopener">${mark}${link.title}</a>`;
}

// A list of the footer's links under its title, which names the nav to a screen reader and is no heading of the page.
function footerLinkList(title, links) {
  return `
    <nav class="footer-nav" aria-label="${title}">
      <p class="footer-nav-title">${title}</p>
      <div class="footer-links">${links.join("")}</div>
    </nav>`;
}
