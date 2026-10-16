import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { copySource, mountCopyButtons, renderCiteLine } from "../site/js/landing/cite.js";
import { URLS } from "../site/js/shared/layout.js";

// The Explore page, which holds the BibTeX block.
const EXPLORE_PAGE = new URL("../site/index.html", import.meta.url);

// A stand-in clipboard that keeps what it was given.
function fakeClipboard() {
  return { written: [], async writeText(text) { this.written.push(text); } };
}

// A stand-in page of one copy button, `data-copy="bibtex"`, and the block it copies, holding `text`.
function fakePage(text) {
  const listeners = [];
  const button = { hidden: true, textContent: "Copy", dataset: { copy: "bibtex" },
    addEventListener: (type, listener) => listeners.push(listener) };
  const source = { textContent: text };
  const root = { querySelectorAll: () => [button], getElementById: (id) => (id === "bibtex" ? source : null) };
  return { root, button, source, listeners };
}

test("the BibTeX entry links the paper's address, and its copy button starts hidden, naming the block it copies", () => {
  const page = readFileSync(EXPLORE_PAGE, "utf8");
  assert.match(page, /<pre id="bibtex">/);
  assert.ok(page.includes(`howpublished = {\\url{${URLS.paper}}}`), "the entry links the paper");
  assert.match(page, /<button class="cite-copy" type="button" data-copy="bibtex" hidden>Copy<\/button>/);
});

test("with no clipboard the copy button stays hidden", () => {
  const page = fakePage("@article{x}");
  mountCopyButtons(page.root, undefined);
  assert.equal(page.button.hidden, true);
  assert.equal(page.listeners.length, 0);
});

test("with a clipboard the button shows, and a click puts the block's text on it unchanged", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const page = fakePage("\n@article{x,\n  year = {2026}\n}\n");
  const clipboard = fakeClipboard();
  mountCopyButtons(page.root, clipboard);
  assert.equal(page.button.hidden, false);
  await page.listeners[0]();
  assert.deepEqual(clipboard.written, ["@article{x,\n  year = {2026}\n}"]);
  assert.equal(page.button.textContent, "Copied");
  context.mock.timers.tick(2000);
  assert.equal(page.button.textContent, "Copy");
});

test("a clipboard that refuses says so on the button", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  context.mock.method(console, "error", () => undefined);
  const button = { textContent: "Copy" };
  await copySource(button, { textContent: "x" }, { writeText: async () => { throw new Error("denied"); } });
  assert.equal(button.textContent, "Select and copy");
});

test("the citation's sentence links the paper's address", () => {
  const container = { innerHTML: "" };
  renderCiteLine(container);
  assert.ok(container.innerHTML.includes(`<a href="${URLS.paper}"`), container.innerHTML);
});

test("the see-also sentence links the blog post in a new tab, which the stylesheet ends in an arrow", () => {
  const container = { innerHTML: "" };
  renderCiteLine(container);
  const seeAlso = container.innerHTML.split('<p class="cite-see-also">')[1];
  assert.ok(seeAlso !== undefined, container.innerHTML);
  const link = `<a href="${URLS.blog}" target="_blank" rel="noopener">A Year of LLM Traffic, in a Browser Tab</a>`;
  assert.ok(seeAlso.startsWith(`See also ${link}`), seeAlso);
  assert.equal(URLS.blog, "https://kasivisu4.github.io/blog/a-year-of-llm-traffic-in-a-browser-tab/");
  const stylesheet = readFileSync(new URL("../site/style.css", import.meta.url), "utf8");
  assert.match(stylesheet, /a\[target="_blank"\]::after \{\s*content: "\\2197";/);
});
