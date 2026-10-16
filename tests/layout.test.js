import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { LINKED_SECTIONS, renderFooter, renderHeader, queryString } from "../site/js/shared/layout.js";

// The Explore page, whose sections the header and footer link by anchor.
const EXPLORE_PAGE = new URL("../site/index.html", import.meta.url);

// URL keys, as a page gives them to the header and footer.
const PAGE_KEYS = "model=qwen3&period=q3";

// The markup `render` writes into a stand-in container for the page `activeFile` with the URL keys `query`.
function rendered(render, activeFile, query, monthCount = 13) {
  const container = { innerHTML: "" };
  render(container, activeFile, new URLSearchParams(query), monthCount);
  return container.innerHTML;
}

// The header's links to the Explore page's sections as `[title, href]`.
function sectionLinks(activeFile, query) {
  const links = [];
  const markup = rendered(renderHeader, activeFile, query);
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
  const markup = rendered(renderFooter, "index.html", "");
  const list = markup.split(`<p class="footer-nav-title">${heading}</p>`)[1].split("</nav>")[0];
  return [...list.matchAll(/>([^<]+)<\/a>/g)].map((match) => match[1]);
}

test("on the Explore page the header links its four sections by anchor alone", () => {
  assert.deepEqual(sectionLinks("index.html", PAGE_KEYS), [
    ["Overview", "#overview"],
    ["Traffic Explorer", "#traffic"],
    ["Insights", "#insights"],
    ["Cite", "#cite"],
  ]);
});

test("from another page the header's section links carry the URL keys", () => {
  assert.deepEqual(sectionLinks("other.html", PAGE_KEYS), [
    ["Overview", `index.html?${PAGE_KEYS}#overview`],
    ["Traffic Explorer", `index.html?${PAGE_KEYS}#traffic`],
    ["Insights", `index.html?${PAGE_KEYS}#insights`],
    ["Cite", `index.html?${PAGE_KEYS}#cite`],
  ]);
});

test("the brand links the Explore page with the URL keys", () => {
  const markup = rendered(renderHeader, "other.html", "model=qwen3");
  assert.match(markup, /<a class="brand" href="index\.html\?model=qwen3">/);
  assert.match(markup, /Chutes <em>Production Trace<\/em>/);
});

test("the header links nothing off the site", () => {
  assert.deepEqual(externalLinks(rendered(renderHeader, "index.html", "")), []);
});

test("the header links no About page", () => {
  assert.doesNotMatch(rendered(renderHeader, "index.html", ""), /about\.html|>About</);
});

test("the footer names the lab under its line, linking to it", () => {
  const markup = rendered(renderFooter, "index.html", "");
  assert.match(markup, /<a class="affiliation" href="https:\/\/madsys\.seas\.harvard\.edu\/" target="_blank" rel="noopener">Harvard SEAS · MadSys Lab<\/a>/);
});

test("the footer lists the sections on this site and the places elsewhere", () => {
  assert.deepEqual(footerList("On this site"), ["Overview", "Traffic Explorer", "Insights", "Cite"]);
  assert.deepEqual(footerList("Elsewhere"), ["Dataset", "Paper", "Code (this trace)", "MadSys on GitHub"]);
});

test("the footer's section links lead where the header's do, with the URL keys from another page", () => {
  const markup = rendered(renderFooter, "other.html", "model=qwen3");
  const links = [...markup.matchAll(/<a class="footer-link" href="([^"]*)">([^<]*)<\/a>/g)];
  assert.deepEqual(links.map((match) => [match[2], match[1]]), [
    ["Overview", "index.html?model=qwen3#overview"],
    ["Traffic Explorer", "index.html?model=qwen3#traffic"],
    ["Insights", "index.html?model=qwen3#insights"],
    ["Cite", "index.html?model=qwen3#cite"],
  ]);
});

test("the footer holds the brand, its line and the two lists of links, with no headings and no copyright or policy text", () => {
  const markup = rendered(renderFooter, "index.html", "");
  assert.match(markup, /Chutes <em>Production Trace<\/em>/);
  const titles = [...markup.matchAll(/<p class="footer-nav-title">([^<]+)<\/p>/g)].map((match) => match[1]);
  assert.deepEqual(titles, ["On this site", "Elsewhere"]);
  assert.doesNotMatch(markup, /<h[1-6]/, "the footer's list titles are no headings");
  assert.doesNotMatch(markup, /Copyright|Accessibility|footer-legal/);
});

test("the Explore page is the site's one page of sections, titled with the dataset's name and run by its module", () => {
  const page = readFileSync(EXPLORE_PAGE, "utf8");
  assert.match(page, /<title>Chutes Production Trace<\/title>/);
  assert.match(page, /<script type="module" src="js\/pages\/explore\.js"><\/script>/);
  for (const section of LINKED_SECTIONS) {
    assert.match(page, new RegExp(`<section id="${section.anchor.slice(1)}"`), `index.html has no section ${section.anchor}`);
  }
});

test("the Explore page runs Overview, Traffic Explorer, Insights, Cite and Team, each of the four a heading alone", () => {
  const page = readFileSync(EXPLORE_PAGE, "utf8");
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
  assert.match(rendered(renderFooter, "index.html", "", 13), /<p>13 months of production LLM serving on Chutes\.<\/p>/);
  assert.match(rendered(renderFooter, "index.html", "", 1), /<p>1 month of production LLM serving/);
  assert.match(rendered(renderFooter, "index.html", "", null), /<p>One year of production LLM serving/);
});

test("the query string keeps the commas of a list of names plain", () => {
  const params = new URLSearchParams("period=q3");
  params.set("models", "qwen3,kimi-k2");
  assert.equal(queryString(params), "?period=q3&models=qwen3,kimi-k2");
});

test("no keys give an empty query string", () => {
  assert.equal(queryString(new URLSearchParams()), "");
});
