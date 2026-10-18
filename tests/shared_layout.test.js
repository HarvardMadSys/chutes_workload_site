// The header and footer (`shared/layout.js`): their links to the page's sections and elsewhere, and the query string.
// The page they head is checked in page_index.test.js.
import assert from "node:assert/strict";
import { test } from "node:test";

import { renderFooter, renderHeader, queryString } from "../site/js/shared/layout.js";

// URL keys, as the page gives them to the header.
const PAGE_KEYS = "model=qwen3&period=q3";

// The header's markup in a stand-in container, given the URL keys `query`.
function renderedHeader(query) {
  const container = { innerHTML: "" };
  renderHeader(container, new URLSearchParams(query));
  return container.innerHTML;
}

// The footer's markup in a stand-in container, counting `monthCount` months.
function renderedFooter(monthCount = 13) {
  const container = { innerHTML: "" };
  renderFooter(container, monthCount);
  return container.innerHTML;
}

// The header's links to the page's sections as `[title, href]`, given the URL keys `query`.
function sectionLinks(query) {
  const links = [];
  const markup = renderedHeader(query);
  for (const match of markup.matchAll(/<a class="nav-link" href="([^"]*)">([^<]*)<\/a>/g)) {
    links.push([match[2], match[1]]);
  }
  return links;
}

// The links of `markup` that open in a new tab, as `[title, href]`.
function externalLinks(markup) {
  const links = [];
  for (const match of markup.matchAll(/<a class="[^"]*" href="([^"]*)" target="_blank" rel="noopener">([^<]*)<\/a>/g)) {
    links.push([match[2], match[1]]);
  }
  return links;
}

// The titles of the footer's links under the heading `heading`.
function footerList(heading) {
  const markup = renderedFooter();
  const list = markup.split(`<p class="footer-nav-title">${heading}</p>`)[1].split("</nav>")[0];
  return [...list.matchAll(/>([^<]+)<\/a>/g)].map((match) => match[1]);
}

test("the header links the page's four sections by anchor alone, whatever the URL's keys", () => {
  assert.deepEqual(sectionLinks(PAGE_KEYS), [
    ["Overview", "#overview"],
    ["Traffic Explorer", "#traffic"],
    ["Insights", "#insights"],
    ["Cite", "#cite"],
  ]);
});

test("the header's brand links the page with the URL keys, and the footer's with none", () => {
  const markup = renderedHeader("model=qwen3");
  assert.match(markup, /<a class="brand" href="index\.html\?model=qwen3">/);
  assert.match(renderedHeader(""), /<a class="brand" href="index\.html">/);
  assert.match(renderedFooter(), /<a class="brand" href="index\.html">/);
  assert.match(markup, /Chutes <em>Production Trace<\/em>/);
});

test("the header links nothing off the site", () => {
  assert.deepEqual(externalLinks(renderedHeader("")), []);
});

test("the header links no About page", () => {
  assert.doesNotMatch(renderedHeader(""), /about\.html|>About</);
});

test("the footer names the lab under its line, linking to it", () => {
  const markup = renderedFooter();
  assert.match(markup, /<a class="affiliation" href="https:\/\/madsys\.seas\.harvard\.edu\/" target="_blank" rel="noopener">Harvard SEAS · MadSys Lab<\/a>/);
});

test("the footer lists the sections on this site and the places elsewhere", () => {
  assert.deepEqual(footerList("On this site"), ["Overview", "Traffic Explorer", "Insights", "Cite"]);
  assert.deepEqual(footerList("Elsewhere"), ["Dataset", "Paper", "Code (this trace)", "MadSys on GitHub"]);
});

test("the footer's section links lead where the header's do, by anchor alone", () => {
  const links = [...renderedFooter().matchAll(/<a class="footer-link" href="([^"]*)">([^<]*)<\/a>/g)];
  assert.deepEqual(links.map((match) => [match[2], match[1]]), [
    ["Overview", "#overview"],
    ["Traffic Explorer", "#traffic"],
    ["Insights", "#insights"],
    ["Cite", "#cite"],
  ]);
});

test("the footer holds the brand, its line and the two lists of links, with no headings and no copyright or policy text", () => {
  const markup = renderedFooter();
  assert.match(markup, /Chutes <em>Production Trace<\/em>/);
  const titles = [...markup.matchAll(/<p class="footer-nav-title">([^<]+)<\/p>/g)].map((match) => match[1]);
  assert.deepEqual(titles, ["On this site", "Elsewhere"]);
  assert.doesNotMatch(markup, /<h[1-6]/, "the footer's list titles are no headings");
  assert.doesNotMatch(markup, /Copyright|Accessibility|footer-legal/);
});

test("the footer's line counts the months in digits as the hero's lede does, and says One year while the count is unknown", () => {
  assert.match(renderedFooter(13), /<p>13 months of production LLM serving on Chutes\.<\/p>/);
  assert.match(renderedFooter(1), /<p>1 month of production LLM serving/);
  assert.match(renderedFooter(null), /<p>One year of production LLM serving/);
});

test("the query string is a question mark and the keys", () => {
  assert.equal(queryString(new URLSearchParams("model=qwen3&period=2025-q3")), "?model=qwen3&period=2025-q3");
});

test("no keys give an empty query string", () => {
  assert.equal(queryString(new URLSearchParams()), "");
});
