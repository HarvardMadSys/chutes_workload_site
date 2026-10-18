// The page, `index.html`: its title, the module that runs it, and its sections, in order, each that the header and
// footer link (`shared/layout.js`) headed by its title. The topics' sections are not in the markup: the page writes
// them (`page/start.js`).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { LINKED_SECTIONS } from "../site/js/shared/layout.js";

// The page, whose sections the header and footer link by anchor.
const PAGE_FILE = new URL("../site/index.html", import.meta.url);

test("the page is the site's one page of sections, titled with the dataset's name and run by its module", () => {
  const page = readFileSync(PAGE_FILE, "utf8");
  assert.match(page, /<title>Chutes Production Trace<\/title>/);
  assert.match(page, /<script type="module" src="js\/page\/main\.js"><\/script>/);
  for (const section of LINKED_SECTIONS) {
    const opening = new RegExp(`<section id="${section.anchor.slice(1)}"`);
    assert.match(page, opening, `index.html has no section ${section.anchor}`);
  }
});

test("the page runs Overview, Traffic Explorer, Insights, Cite and Team, each of the four a heading alone", () => {
  const page = readFileSync(PAGE_FILE, "utf8");
  const sections = [...page.matchAll(/<section (?:id="([a-z-]+)" )?class="([a-z -]+)"/g)];
  const order = sections.map((match) => match[1] ?? match[2]);
  // The topics' sections are not in the markup: the page writes them from the topic list (`page/start.js`).
  assert.deepEqual(order, ["hero", "overview", "traffic", "insights", "cite", "team"]);
  for (const section of LINKED_SECTIONS) {
    const start = page.indexOf(`<section id="${section.anchor.slice(1)}"`);
    const firstHeading = page.slice(start).match(/<h2 id="[^"]+">([^<]+)<\/h2>/)[1];
    assert.equal(firstHeading, section.title, section.anchor);
  }
});
