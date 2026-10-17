/**
 * Stand-ins for the parts of the page the node tests drive, as node has no page of its own: an element, a figure's
 * body with its legend's place, the topic sections the tabs read, and the browser's history.
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
}

/**
 * A figure's body, the place its chart is drawn, as `renderFigure` of `shared/charts.js` lays it out, as far as a
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
