// The Cite section (`sections/cite.js`): the BibTeX entry, its copy button with and without a clipboard, and the
// citation's sentence.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { copySource, mountCopyButtons, renderCiteLine } from "../site/js/sections/cite.js";
import { URLS } from "../site/js/shared/layout.js";
import { FakeElement, settled, useFakePage } from "./fake_page.js";

// The page, which holds the BibTeX block.
const PAGE_FILE = new URL("../site/index.html", import.meta.url);

// A stand-in clipboard that keeps what it was given.
function fakeClipboard() {
  return { written: [], async writeText(text) { this.written.push(text); } };
}

/**
 * The fake page of the test of `context` holding one copy button, hidden, `data-copy="bibtex"`, and the block it
 * copies, `pre#bibtex` holding `text`: `{ button, source }`.
 */
function citePage(context, text) {
  const button = new FakeElement("button");
  button.hidden = true;
  button.textContent = "Copy";
  button.dataset.copy = "bibtex";
  button.setAttribute("data-copy", "bibtex");
  const source = new FakeElement("pre", "bibtex");
  source.textContent = text;
  useFakePage(context, { elements: [button, source] });
  return { button, source };
}

test("the BibTeX entry links the paper's address, and its copy button starts hidden, naming the block it copies", () => {
  const page = readFileSync(PAGE_FILE, "utf8");
  assert.match(page, /<pre id="bibtex">/);
  assert.ok(page.includes(`howpublished = {\\url{${URLS.paper}}}`), "the entry links the paper");
  assert.match(page, /<button class="cite-copy" type="button" data-copy="bibtex" hidden>Copy<\/button>/);
});

test("with no clipboard the copy button stays hidden", (context) => {
  const page = citePage(context, "@article{x}");
  mountCopyButtons(document, undefined);
  assert.equal(page.button.hidden, true);
  assert.equal(page.button.listeners.size, 0);
});

test("with a clipboard the button shows, and a click puts the block's text on it unchanged", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const page = citePage(context, "\n@article{x,\n  year = {2026}\n}\n");
  const clipboard = fakeClipboard();
  mountCopyButtons(document, clipboard);
  assert.equal(page.button.hidden, false);
  page.button.dispatch("click");
  await settled();
  assert.deepEqual(clipboard.written, ["@article{x,\n  year = {2026}\n}"]);
  assert.equal(page.button.textContent, "Copied");
  context.mock.timers.tick(2000);
  assert.equal(page.button.textContent, "Copy");
});

test("a clipboard that refuses says so on the button", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  context.mock.method(console, "error", () => undefined);
  const button = new FakeElement("button");
  button.textContent = "Copy";
  const source = new FakeElement("pre", "bibtex");
  source.textContent = "x";
  await copySource(button, source, { writeText: async () => { throw new Error("denied"); } });
  assert.equal(button.textContent, "Select and copy");
});

test("the citation's sentence links the paper's address", () => {
  const container = new FakeElement("div");
  renderCiteLine(container);
  assert.ok(container.innerHTML.includes(`<a href="${URLS.paper}"`), container.innerHTML);
});
