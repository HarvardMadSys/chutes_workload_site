/**
 * The stand-in for the browser through which the node tests reach the page's modules, as node has no page of its own:
 * an element or the window (`FakeElement`, of `fake_element.js`, exported here); the browser's history; the page's
 * document, window, fetch and animation frames for one test (`useFakePage`); and an answer the page ships. Until their
 * last tests move, it also holds a document of `createElement` alone and a figure's body with its legend's place. It
 * imports nothing from `site/`, so that a fault in a page module never breaks the fake every test stands on.
 */

import { readFileSync } from "node:fs";

import { FakeElement } from "./fake_element.js";

export { FakeElement };

/** The address the fake page is opened at, before its query and anchor. */
export const PAGE_ADDRESS = "http://localhost/index.html";

// The folder of the answers the page ships, which it reads as `data/all/<name>.json`.
const ANSWERS_FOLDER = new URL("../site/data/all/", import.meta.url);

// The globals `useFakePage` sets and deletes after its test: node has none of its own, so there is none to restore.
// `fetch`, which node has, is mocked through the test's context, and node restores it.
const PAGE_GLOBALS = ["document", "window", "requestAnimationFrame", "ResizeObserver"];

/** Make a stand-in the global document for the test of `context`; node has none of its own. */
export function useFakeDocument(context) {
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  context.after(() => delete globalThis.document);
}

/** Wait until every promise a click or a draw started, and that can settle, has: a redraw runs after its click returns. */
export function settled() {
  return new Promise((resolve) => setImmediate(resolve));
}

/** Run the animation frames asked for, as the browser does before it paints. */
export function runFrames(frames) {
  for (const frame of frames.splice(0)) {
    frame();
  }
}

/**
 * A figure's body, the place its chart is drawn, as `renderFigure` of `shared/figure.js` lays it out, as far as a
 * legend reads it: its figure's place for the legend, `legendPlace`, found through `closest`.
 */
export class FakeFigureBody extends FakeElement {
  constructor() {
    super("div");
    this.legendPlace = new FakeElement("div");
  }

  closest() {
    return { querySelector: () => this.legendPlace };
  }
}

/**
 * The browser's history as the page uses it: entries of `{ state, url }`, the current one's address in
 * `window.location` (a URL, whose `pathname`, `search` and `hash` the page reads); `pushState` and `replaceState` with
 * an address read against the current one, as the browser reads it; and `back()` and `forward()`, which move to the
 * entry before or after and tell the window's listeners of `popstate`.
 */
export class FakeHistory {
  constructor(window, address) {
    this.window = window;
    this.entries = [{ state: null, url: new URL(address) }];
    this.index = 0;
    window.location = new URL(address);
  }

  get state() {
    return this.entries[this.index].state;
  }

  pushState(state, title, address) {
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push({ state, url: new URL(address, this.window.location) });
    this.index += 1;
    this.window.location = new URL(this.entries[this.index].url);
  }

  replaceState(state, title, address = this.window.location.href) {
    this.entries[this.index] = { state, url: new URL(address, this.window.location) };
    this.window.location = new URL(this.entries[this.index].url);
  }

  back() {
    this.moveTo(this.index - 1);
  }

  forward() {
    this.moveTo(this.index + 1);
  }

  moveTo(index) {
    this.index = index;
    this.window.location = new URL(this.entries[index].url);
    this.window.dispatch("popstate", { state: this.entries[index].state });
  }
}

/** A promise with its `resolve` and `reject`, `{ promise, resolve, reject }`, for an answer the test lets arrive. */
export function deferred() {
  const parts = {};
  parts.promise = new Promise((resolve, reject) => Object.assign(parts, { resolve, reject }));
  return parts;
}

/**
 * Make `document`, `window`, `fetch`, `requestAnimationFrame` and `ResizeObserver` stand-ins for the test of
 * `context`, and remove them when it ends. The page's address is `PAGE_ADDRESS` and then `query`; `document` finds
 * `elements` and their descendants; a fetched file of `answers` gives its rows, or the rows its promise gives, and any
 * other file a 404; `onRead(file)` is called as each file is fetched. Returns `{ reads, frames, history }`: the files
 * fetched, in order; the animation frames asked for and not yet run (`runFrames`); the window's `FakeHistory`.
 */
export function useFakePage(context, { query = "", elements = [], answers = {}, onRead = () => undefined } = {}) {
  const window = new FakeElement();
  window.history = new FakeHistory(window, `${PAGE_ADDRESS}${query}`);
  const page = { reads: [], frames: [], history: window.history };
  globalThis.document = fakeDocument(elements);
  globalThis.window = window;
  globalThis.requestAnimationFrame = (frame) => page.frames.push(frame);
  globalThis.ResizeObserver = class { observe() {} }; // the scrolling row asks for one; the fake page never resizes
  context.mock.method(globalThis, "fetch", async (file) => {
    page.reads.push(file);
    onRead(file);
    return fetchedFile(answers, file);
  });
  context.after(() => {
    for (const name of PAGE_GLOBALS) {
      delete globalThis[name];
    }
  });
  return page;
}

// The page's document: an element made by `createElement`, and those of `elements` and under them that a selector or
// an id finds, in the order given; `activeElement` the element focused last. An empty id, which the page asks for when
// its address has no anchor, finds none, as in the browser.
function fakeDocument(elements) {
  const root = new FakeElement();
  root.children = elements; // held, not appended, so that each keeps its own parent
  return {
    activeElement: null,
    createElement: (tag) => new FakeElement(tag),
    querySelector: (selector) => root.querySelector(selector),
    querySelectorAll: (selector) => root.querySelectorAll(selector),
    getElementById: (id) => (id === "" ? null : root.querySelector(`#${id}`)),
  };
}

// The response to fetching `file`, read from `answers` at each fetch: its rows, awaited where they are a promise, so
// that one that rejects makes the fetch reject as a network failure does; a 404 for a file `answers` does not hold.
async function fetchedFile(answers, file) {
  if (!Object.hasOwn(answers, file)) {
    return { ok: false, status: 404, statusText: "Not Found" };
  }
  const rows = await answers[file];
  return { ok: true, json: () => rows };
}

/** What the page reads for `readAnswer(name)`, parsed: `site/data/all/<name>.json`. */
export function shippedAnswer(name) {
  return JSON.parse(readFileSync(new URL(`${name}.json`, ANSWERS_FOLDER), "utf8"));
}
