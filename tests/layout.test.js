import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { LINKED_SECTIONS, renderFooter, renderHeader, queryString } from "../site/js/shared/layout.js";

// The page, whose sections the header and footer link by anchor.
const PAGE_FILE = new URL("../site/index.html", import.meta.url);

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

test("the page is the site's one page of sections, titled with the dataset's name and run by its module", () => {
  const page = readFileSync(PAGE_FILE, "utf8");
  assert.match(page, /<title>Chutes Production Trace<\/title>/);
  assert.match(page, /<script type="module" src="js\/page\/main\.js"><\/script>/);
  for (const section of LINKED_SECTIONS) {
    assert.match(page, new RegExp(`<section id="${section.anchor.slice(1)}"`), `index.html has no section ${section.anchor}`);
  }
});

test("the page runs Overview, Traffic Explorer, Insights, Cite and Team, each of the four a heading alone", () => {
  const page = readFileSync(PAGE_FILE, "utf8");
  const order = [...page.matchAll(/<section (?:id="([a-z-]+)" )?class="([a-z -]+)"/g)].map((match) => match[1] ?? match[2]);
  assert.deepEqual(order, [
    "hero", "overview", "traffic", "insights", "insights-overview", "insights-tokens", "insights-users",
    "insights-evolution", "insights-caching", "insights-balancing", "cite", "team",
  ]);
  for (const section of LINKED_SECTIONS) {
    const start = page.indexOf(`<section id="${section.anchor.slice(1)}"`);
    const firstHeading = page.slice(start).match(/<h2 id="[^"]+">([^<]+)<\/h2>/)[1];
    assert.equal(firstHeading, section.title, section.anchor);
  }
  assert.doesNotMatch(page, /class="eyebrow"/);
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
