// The link marks (`shared/link_marks.js`): each mark's svg, found by its name, before the text of the links off the
// site, and sized by the stylesheet.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { renderHero } from "../site/js/sections/hero.js";
import { renderFooter, renderHeader } from "../site/js/shared/layout.js";
import { LINK_MARKS, linkMark } from "../site/js/shared/link_marks.js";
import { FakeElement } from "./fake_page.js";

// The stylesheet, which sizes the marks and ends every link off the site in an arrow.
const STYLESHEET = new URL("../site/style.css", import.meta.url);

// The links of `markup` as `{ isExternal, mark, text }`: whether it opens in a new tab, the name of the mark of
// `LINK_MARKS` its content opens with (null for none) and the text after it.
function links(markup) {
  const found = [];
  for (const match of markup.matchAll(/<a ([^>]*)>(.*?)<\/a>/gs)) {
    const content = match[2].trim();
    const mark = Object.keys(LINK_MARKS).find((name) => content.startsWith(LINK_MARKS[name])) ?? null;
    const text = mark === null ? content : content.slice(LINK_MARKS[mark].length);
    found.push({ isExternal: match[1].includes('target="_blank"'), mark, text });
  }
  return found;
}

// The markup `render` writes into a container, given `argument`.
function rendered(render, argument) {
  const container = new FakeElement("div");
  render(container, argument);
  return container.innerHTML;
}

test("each mark is one svg of one path, on the 24-unit grid, in the link's colour and hidden from screen readers", () => {
  assert.deepEqual(Object.keys(LINK_MARKS), ["huggingface", "document", "github"]);
  assert.ok(Object.isFrozen(LINK_MARKS));
  for (const [name, svg] of Object.entries(LINK_MARKS)) {
    assert.equal(svg.split("<svg").length - 1, 1, `${name} is one svg`);
    assert.equal(svg.split("<path").length - 1, 1, `${name} is one path`);
    assert.match(svg, /^<svg [^>]*><path d="[^"]+"\/><\/svg>$/, name);
    for (const attribute of ['class="link-mark"', 'viewBox="0 0 24 24"', 'aria-hidden="true"', 'focusable="false"',
      'fill="currentColor"']) {
      assert.ok(svg.includes(attribute), `${name} has ${attribute}`);
    }
  }
});

test("a mark is found by its name, and a name that is no mark's throws, naming it", () => {
  assert.equal(linkMark("github"), LINK_MARKS.github);
  assert.throws(() => linkMark("gitlab"), { name: "RangeError", message: /gitlab/ });
  assert.throws(() => linkMark("toString"), RangeError);
});

test("the hero's Dataset, Paper and Code buttons show their marks before their text", () => {
  const external = links(rendered(renderHero, 13)).filter((link) => link.isExternal && link.mark !== null);
  assert.deepEqual(external.map((link) => [link.text, link.mark]), [
    ["Dataset", "huggingface"],
    ["Paper", "document"],
    ["Code", "github"],
  ]);
});

test("the footer's Elsewhere links show their marks before their text", () => {
  const external = links(rendered(renderFooter, 13)).filter((link) => link.isExternal && link.mark !== null);
  assert.deepEqual(external.map((link) => [link.text, link.mark]), [
    ["Dataset", "huggingface"],
    ["Paper", "document"],
    ["Code (this trace)", "github"],
    ["MadSys on GitHub", "github"],
  ]);
});

test("a link that stays on the site carries no mark, nor does the lab's name", () => {
  const markups = [rendered(renderHero, 13), rendered(renderFooter, 13), rendered(renderHeader, new URLSearchParams())];
  for (const link of markups.flatMap(links)) {
    if (!link.isExternal || link.text.startsWith("Harvard SEAS")) {
      assert.equal(link.mark, null, `${link.text} carries no mark`);
      assert.doesNotMatch(link.text, /<svg/, `${link.text} holds no svg`);
    }
  }
});

test("the stylesheet sizes a mark to the text and ends every link off the site in an arrow", () => {
  const stylesheet = readFileSync(STYLESHEET, "utf8");
  assert.match(stylesheet, /a\[target="_blank"\]::after \{\s*content: "\\2197";/);
  assert.match(stylesheet, /\.link-mark \{\s*width: 1em;\s*height: 1em;\s*vertical-align: -0\.125em;\s*margin-right: 0\.3em;\s*\}/);
});
