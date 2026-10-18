/**
 * Stand-ins for the parts of the page the node tests drive, as node has no page of its own: an element, found under
 * another by a tag, a class, an id or a data attribute, or a chain of them; the Traffic Explorer's controls in its
 * controls row; a figure's body with its legend's place, the topic sections the tabs read, the browser's history, and
 * the response to fetching an answer.
 */

/** The topics' anchors on the page, in the order of their tabs. */
export const TOPIC_ANCHORS = Object.freeze([
  "insights-overview", "insights-tokens", "insights-users", "insights-evolution", "insights-caching",
  "insights-balancing",
]);

/** The topics' titles, as their headings give them after the number. */
export const TOPIC_TITLES = Object.freeze([
  "The workload at a glance", "Request shape and latency", "Users and models", "A year of change", "Prefix caching",
  "Load balancing",
]);

/** The address the fake page is opened at, before its query and anchor. */
export const PAGE_ADDRESS = "http://localhost/index.html";

/** The Traffic Explorer's choice of everything: every family, every model, every endpoint group, requests, every day. */
export const EVERYTHING = Object.freeze({ family: "", model: "", endpoint: "", metric: "", from: "", to: "" });

/** Make a stand-in the global document for the test of `context`; node has none of its own. */
export function useFakeDocument(context) {
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  context.after(() => delete globalThis.document);
}

/** Wait until every promise a click or a draw started, and that can settle, has: a redraw runs after its click returns. */
export function settled() {
  return new Promise((resolve) => setImmediate(resolve));
}

/** The response to fetching an answer whose promised rows are `rows`, or a 404 where there are none. */
export function fetchedAnswer(rows) {
  if (rows === undefined) {
    return { ok: false, status: 404, statusText: "Not Found" };
  }
  return { ok: true, json: () => rows };
}

/** Run the animation frames asked for, as the browser does before it paints. */
export function runFrames(frames) {
  for (const frame of frames.splice(0)) {
    frame();
  }
}

// The four forms of a simple selector the fake element reads, each matched whole: a tag, a class, an id, and a data
// attribute without or with a value in double quotes.
const TAG_SELECTOR = /^[a-z][a-z0-9]*$/;
const CLASS_SELECTOR = /^\.([\w-]+)$/;
const ID_SELECTOR = /^#([\w-]+)$/;
const ATTRIBUTE_SELECTOR = /^\[(data-[\w-]+)(?:="([^"]*)")?\]$/;

// Throw where `simple` is of none of the four forms, naming it, so that a test with a mistyped selector fails.
function checkSimpleSelector(simple) {
  const forms = [TAG_SELECTOR, CLASS_SELECTOR, ID_SELECTOR, ATTRIBUTE_SELECTOR];
  if (!forms.some((form) => form.test(simple))) {
    throw new Error(`The fake page reads no selector of the form "${simple}"`);
  }
}

/**
 * A stand-in for an element of the page, or for the window: its tag, id, attributes, classes, inline style, listeners,
 * children, text and value, and what the page's modules set on it.
 */
export class FakeElement {
  constructor(tag = "", id = "") {
    this.tag = tag;
    this.id = id;
    this.hidden = false;
    this.className = "";
    this.textContent = "";
    this.innerHTML = "";
    this.value = "";
    this.attributes = new Map();
    this.classes = new Set();
    this.style = {};
    this.listeners = new Map();
    this.children = [];
    this.classList = { toggle: (name, isOn) => (isOn ? this.classes.add(name) : this.classes.delete(name)) };
    this.scrollLeft = 0;
    this.clientWidth = 0;
    this.scrollWidth = 0;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  /** Call each listener of `type` with `event`, in the order they were added. */
  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  getBoundingClientRect() {
    return { left: 0, right: 0 };
  }

  focus() {
    globalThis.document.activeElement = this;
  }

  /**
   * Whether this element matches `simple`, one simple selector: a tag (`input`), a class (`.range-track`, a word of
   * `className` or a member of `classes`), an id (`#traffic-explorer`), or a data attribute without or with a value
   * (`[data-copy]`, `[data-copy="bibtex"]`). Any other form throws, so that a test with a mistyped selector fails.
   */
  matches(simple) {
    checkSimpleSelector(simple);
    const classSelector = simple.match(CLASS_SELECTOR);
    if (classSelector !== null) {
      const [, name] = classSelector;
      return this.className.split(" ").includes(name) || this.classes.has(name);
    }
    const idSelector = simple.match(ID_SELECTOR);
    if (idSelector !== null) {
      const [, id] = idSelector;
      return this.id === id;
    }
    const attributeSelector = simple.match(ATTRIBUTE_SELECTOR);
    if (attributeSelector !== null) {
      const [, name, value] = attributeSelector;
      return this.attributes.has(name) && (value === undefined || String(this.attributes.get(name)) === value);
    }
    return this.tag === simple;
  }

  /**
   * Every element under this one that `selector` finds, in document order, each once: `selector` is one simple selector
   * of `matches`, or several parted by spaces, the first matched among all the elements under this one and each next
   * among the elements under each match of the one before.
   */
  querySelectorAll(selector) {
    const simples = selector.trim().split(/\s+/);
    for (const simple of simples) {
      checkSimpleSelector(simple);
    }
    let matched = [this];
    for (const simple of simples) {
      const found = new Set();
      for (const ancestor of matched) {
        for (const element of descendantsOf(ancestor)) {
          if (element.matches(simple)) {
            found.add(element);
          }
        }
      }
      matched = [...found];
    }
    return matched;
  }

  /** The first element under this one that `selector` finds (`querySelectorAll`), or null where it finds none. */
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

// Every element under `element`, depth first, in document order.
function descendantsOf(element) {
  const descendants = [];
  for (const child of element.children) {
    descendants.push(child, ...descendantsOf(child));
  }
  return descendants;
}

/**
 * The Traffic Explorer's controls in its controls row `row`: `{ family, model, endpoint, metric, periods }`, the
 * family, model, endpoint and metric drop-downs, in the row's order, and the group of period buttons.
 */
export function controlsOf(row) {
  const [family, model, endpoint, metric] = row.querySelectorAll(".control-field select");
  return { family, model, endpoint, metric, periods: row.querySelector(".period-buttons") };
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

/** The six topic sections as the page holds them: each heading the number's element, a space and the title. */
export function topicSections() {
  const sections = [];
  for (const [index, anchor] of TOPIC_ANCHORS.entries()) {
    const section = new FakeElement("section", anchor);
    const number = { textContent: `0${index + 1}` };
    const heading = { querySelector: () => number, lastChild: { textContent: ` ${TOPIC_TITLES[index]}` } };
    section.querySelector = () => heading;
    sections.push(section);
  }
  return sections;
}

/** The ids of the sections of `sections` that are shown. */
export function shownIds(sections) {
  return sections.filter((section) => !section.hidden).map((section) => section.id);
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
