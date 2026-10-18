/**
 * The one stand-in for an element of the page, or for the window, that the node tests use (`FakeElement`): the fields
 * and methods the page's modules set and call, an element found under another by a tag, a class, an id, a data
 * attribute or a tag with a data attribute, or a chain of them, its nearest ancestor that one matches, and the elements
 * of markup written into it. The tests import it from `fake_page.js`, the one module through which they reach the
 * browser.
 */

// The five forms of a simple selector the fake element reads, each matched whole: a tag, a class, an id, a data
// attribute without or with a value in double quotes, and a tag followed by one such attribute (`button[data-copy]`).
const TAG_SELECTOR = /^[a-z][a-z0-9]*$/;
const CLASS_SELECTOR = /^\.([\w-]+)$/;
const ID_SELECTOR = /^#([\w-]+)$/;
const ATTRIBUTE_SELECTOR = /^\[(data-[\w-]+)(?:="([^"]*)")?\]$/;
const TAG_ATTRIBUTE_SELECTOR = /^([a-z][a-z0-9]*)(\[data-[\w-]+(?:="[^"]*")?\])$/;

// An element of markup that the fake reads into children, holding text alone, of a tag and at most a class:
// `<p class="figure-definition-text"></p>`.
const MARKUP_ELEMENT = /<(\w+)(?: class="([^"]*)")?>([^<]*)<\/\1>/g;

// Throw where `simple` is of none of the five forms, naming it, so that a test never passes on a selector the fake
// misread: `:not(…)`, `>`, `,` and `[class$=…]` among them.
function checkSimpleSelector(simple) {
  const forms = [TAG_SELECTOR, CLASS_SELECTOR, ID_SELECTOR, ATTRIBUTE_SELECTOR, TAG_ATTRIBUTE_SELECTOR];
  if (!forms.some((form) => form.test(simple))) {
    throw new Error(`The fake page reads no selector of the form "${simple}"`);
  }
}

/**
 * An element of the page, or the window: its tag, id, attributes, classes, data, inline style, listeners, children
 * and parent, text, markup and value, and any other property the page's modules set on it.
 */
export class FakeElement {
  #markup = "";

  constructor(tag = "", id = "") {
    this.tag = tag;
    this.id = id;
    this.hidden = false;
    this.className = "";
    this.textContent = "";
    this.value = "";
    this.dataset = {};
    this.attributes = new Map();
    this.classes = new Set();
    this.style = {};
    this.listeners = new Map();
    this.children = [];
    this.parentElement = null;
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
    this.children.push(...adoptedBy(this, children));
  }

  replaceChildren(...children) {
    this.children = adoptedBy(this, children);
  }

  /** The markup last written. */
  get innerHTML() {
    return this.#markup;
  }

  /**
   * Write `markup`, and make its elements this element's children as far as the fake reads them (`MARKUP_ELEMENT`),
   * in order; other markup stays only in the string.
   */
  set innerHTML(markup) {
    this.#markup = markup;
    const children = [];
    for (const [, tag, className, text] of markup.matchAll(MARKUP_ELEMENT)) {
      const child = new FakeElement(tag);
      child.className = className ?? "";
      child.textContent = text;
      children.push(child);
    }
    this.replaceChildren(...children);
  }

  getBoundingClientRect() {
    return { left: 0, right: 0 };
  }

  focus() {
    globalThis.document.activeElement = this;
  }

  scrollIntoView() {} // the fake page has no layout to scroll

  /**
   * Whether this element matches `simple`, one simple selector: a tag (`input`), a class (`.range-track`, a word of
   * `className` or a member of `classes`), an id (`#traffic-explorer`), a data attribute without or with a value
   * (`[data-copy]`, `[data-copy="bibtex"]`), or a tag and such an attribute, both required (`button[data-copy]`). Any
   * other form throws, so that a test with a mistyped selector fails.
   */
  matches(simple) {
    checkSimpleSelector(simple);
    const tagAttributeSelector = simple.match(TAG_ATTRIBUTE_SELECTOR);
    if (tagAttributeSelector !== null) {
      const [, tag, attribute] = tagAttributeSelector;
      return this.tag === tag && this.matches(attribute);
    }
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

  /** This element, or its nearest ancestor through `parentElement`, that `simple` matches (`matches`); else null. */
  closest(simple) {
    let element = this;
    while (element !== null && !element.matches(simple)) {
      element = element.parentElement;
    }
    return element;
  }
}

// `children`, each element among them given `parent` as its parent; a string, which the browser makes a text, has none.
// The fake does not take a child out of the children of a parent it had before.
function adoptedBy(parent, children) {
  for (const child of children) {
    if (child instanceof FakeElement) {
      child.parentElement = parent;
    }
  }
  return children;
}

// Every element under `element`, depth first, in document order; a string among the children is a text, no element.
function descendantsOf(element) {
  const descendants = [];
  for (const child of element.children) {
    if (child instanceof FakeElement) {
      descendants.push(child, ...descendantsOf(child));
    }
  }
  return descendants;
}
